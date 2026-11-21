import type {
  BranchItem,
  CommitItem,
  GitTreeItem,
  IssueItem,
  ReleaseItem,
  RepoInfo,
  TreeNode,
} from '../types/github';

const API_BASE = 'https://api.github.com';
const responseCache = new Map<string, unknown>();

export interface ParsedRepoInput {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

export function parseGithubInput(input: string): ParsedRepoInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Handle full URLs like https://github.com/omarryhan/aiogoogle or .../tree/master/path
  const cleaned = trimmed
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1];

  if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    return null;
  }

  let branch: string | undefined;
  let path: string | undefined;

  if ((parts[2] === 'tree' || parts[2] === 'blob') && parts.length >= 4) {
    branch = parts[3];
    if (parts.length > 4) {
      path = parts.slice(4).join('/');
    }
  }

  return { owner, repo, branch, path };
}

async function fetchJson<T>(url: string): Promise<T> {
  if (responseCache.has(url)) {
    return responseCache.get(url) as T;
  }

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get('X-RateLimit-Reset');
      const resetTime = reset
        ? new Date(Number(reset) * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'shortly';
      throw new Error(
        `GitHub API public rate limit reached. Try again around ${resetTime}.`
      );
    }
    if (res.status === 404) {
      throw new Error('Repository or resource not found (check owner/repo name or visibility).');
    }
    throw new Error(`GitHub API error (${res.status}).`);
  }

  const data = (await res.json()) as T;
  responseCache.set(url, data);
  return data;
}

export function decodeBase64Utf8(base64: string): string {
  const cleaned = base64.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  return fetchJson<RepoInfo>(`${API_BASE}/repos/${owner}/${repo}`);
}

export async function fetchBranches(owner: string, repo: string): Promise<BranchItem[]> {
  return fetchJson<BranchItem[]>(`${API_BASE}/repos/${owner}/${repo}/branches?per_page=50`);
}

export async function fetchLanguages(
  owner: string,
  repo: string
): Promise<Record<string, number>> {
  return fetchJson<Record<string, number>>(`${API_BASE}/repos/${owner}/${repo}/languages`);
}

export async function fetchGitTree(
  owner: string,
  repo: string,
  branch: string
): Promise<{ items: GitTreeItem[]; truncated: boolean }> {
  const data = await fetchJson<{ tree: GitTreeItem[]; truncated: boolean }>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  return { items: data.tree || [], truncated: Boolean(data.truncated) };
}

export function buildTreeHierarchy(items: GitTreeItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();

  // Sort directories before files, then alphabetically
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'tree' ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  // First ensure all tree nodes exist
  for (const item of sorted) {
    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const node: TreeNode = {
      name,
      path: item.path,
      type: item.type,
      size: item.size,
      sha: item.sha,
      children: item.type === 'tree' ? [] : undefined,
    };

    if (item.type === 'tree') {
      dirMap.set(item.path, node);
    }

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = dirMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortNodes(node.children);
    }
    return nodes;
  };

  return sortNodes(root);
}

export function getDirectoryNodes(
  treeHierarchy: TreeNode[],
  dirPath: string
): TreeNode[] {
  if (!dirPath) return treeHierarchy;
  const parts = dirPath.split('/').filter(Boolean);
  let current = treeHierarchy;
  for (const part of parts) {
    const match = current.find((n) => n.name === part && n.type === 'tree');
    if (!match || !match.children) return [];
    current = match.children;
  }
  return current;
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<{ content: string; isBinary: boolean; rawUrl: string }> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
    branch
  )}/${filePath}`;

  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'];
  const binaryExts = ['pdf', 'zip', 'tar', 'gz', 'whl', 'exe', 'bin', 'woff', 'woff2', 'ttf'];

  if (imageExts.includes(ext) || binaryExts.includes(ext)) {
    return { content: '', isBinary: true, rawUrl };
  }

  const cacheKey = `raw:${rawUrl}`;
  if (responseCache.has(cacheKey)) {
    return {
      content: responseCache.get(cacheKey) as string,
      isBinary: false,
      rawUrl,
    };
  }

  // Prefer raw.githubusercontent.com first to conserve GitHub REST API rate limits
  try {
    const rawRes = await fetch(rawUrl);
    if (rawRes.ok) {
      const text = await rawRes.text();
      responseCache.set(cacheKey, text);
      return { content: text, isBinary: false, rawUrl };
    }
  } catch {
    // Fall back to API contents endpoint
  }

  const data = await fetchJson<{ content?: string; encoding?: string }>(
    `${API_BASE}/repos/${owner}/${repo}/contents/${filePath
      .split('/')
      .map(encodeURIComponent)
      .join('/')}?ref=${encodeURIComponent(branch)}`
  );

  const decoded =
    data.content && data.encoding === 'base64' ? decodeBase64Utf8(data.content) : '';
  responseCache.set(cacheKey, decoded);
  return { content: decoded, isBinary: false, rawUrl };
}

export async function fetchReadme(
  owner: string,
  repo: string,
  branch: string
): Promise<{ filename: string; content: string } | null> {
  try {
    const data = await fetchJson<{ name: string; content: string; encoding: string }>(
      `${API_BASE}/repos/${owner}/${repo}/readme?ref=${encodeURIComponent(branch)}`
    );
    if (data.content && data.encoding === 'base64') {
      return {
        filename: data.name,
        content: decodeBase64Utf8(data.content),
      };
    }
  } catch {
    // Fallback to raw README.md / README.rst
    for (const candidate of ['README.md', 'readme.md', 'README.rst']) {
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
            branch
          )}/${candidate}`
        );
        if (res.ok) {
          const text = await res.text();
          return { filename: candidate, content: text };
        }
      } catch {
        // continue
      }
    }
  }
  return null;
}

export async function fetchCommits(
  owner: string,
  repo: string,
  branch: string
): Promise<CommitItem[]> {
  return fetchJson<CommitItem[]>(
    `${API_BASE}/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(
      branch
    )}&per_page=30`
  );
}

export async function fetchReleases(
  owner: string,
  repo: string
): Promise<ReleaseItem[]> {
  return fetchJson<ReleaseItem[]>(
    `${API_BASE}/repos/${owner}/${repo}/releases?per_page=20`
  );
}

export async function fetchIssues(
  owner: string,
  repo: string,
  state: 'open' | 'closed' = 'open'
): Promise<IssueItem[]> {
  return fetchJson<IssueItem[]>(
    `${API_BASE}/repos/${owner}/${repo}/issues?state=${state}&per_page=30`
  );
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
