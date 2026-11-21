import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  GitBranch,
  Moon,
  RefreshCw,
  Sun,
} from 'lucide-react';
import {
  CommitsView,
  IssuesView,
  ReleasesView,
} from './components/ActivityViews';
import { CodeViewer } from './components/CodeViewer';
import { FileTree } from './components/FileTree';
import {
  buildTreeHierarchy,
  fetchBranches,
  fetchCommits,
  fetchFileContent,
  fetchGitTree,
  fetchIssues,
  fetchLanguages,
  fetchReadme,
  fetchReleases,
  fetchRepoInfo,
  formatRelativeDate,
  getDirectoryNodes,
  parseGithubInput,
} from './services/github';
import type {
  ActiveTab,
  BranchItem,
  CommitItem,
  GitTreeItem,
  IssueItem,
  ReleaseItem,
  RepoInfo,
} from './types/github';

const DEFAULT_OWNER = 'omarryhan';
const DEFAULT_REPO = 'aiogoogle';

export default function App() {
  const [isDark, setIsDark] = useState(false);

  const [repoInput, setRepoInput] = useState(
    `https://github.com/${DEFAULT_OWNER}/${DEFAULT_REPO}`
  );
  const [inputError, setInputError] = useState<string | null>(null);

  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [activeTab, setActiveTab] = useState<ActiveTab>('code');

  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>('');
  const [languages, setLanguages] = useState<Record<string, number>>({});
  const [flatTree, setFlatTree] = useState<GitTreeItem[]>([]);
  const [readme, setReadme] = useState<{ filename: string; content: string } | null>(
    null
  );

  const [isLoadingRepo, setIsLoadingRepo] = useState(true);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Directory & File state
  const [currentDirPath, setCurrentDirPath] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileIsBinary, setFileIsBinary] = useState(false);
  const [fileRawUrl, setFileRawUrl] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Activity tabs state
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [commitsLoadedKey, setCommitsLoadedKey] = useState('');

  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(false);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [releasesLoadedKey, setReleasesLoadedKey] = useState('');

  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [issueState, setIssueState] = useState<'open' | 'closed'>('open');
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [issuesLoadedKey, setIssuesLoadedKey] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const loadRepository = useCallback(
    async (
      targetOwner: string,
      targetRepo: string,
      preferredBranch?: string,
      initialPath?: string
    ) => {
      setIsLoadingRepo(true);
      setRepoError(null);
      setSelectedFilePath(null);
      setCurrentDirPath('');
      setFileContent('');
      setFileError(null);

      try {
        const info = await fetchRepoInfo(targetOwner, targetRepo);
        setRepoInfo(info);
        const branchToUse = preferredBranch || info.default_branch;
        setActiveBranch(branchToUse);

        const [branchList, langMap, treeRes, readmeRes] = await Promise.all([
          fetchBranches(targetOwner, targetRepo).catch(() => []),
          fetchLanguages(targetOwner, targetRepo).catch(() => ({})),
          fetchGitTree(targetOwner, targetRepo, branchToUse),
          fetchReadme(targetOwner, targetRepo, branchToUse),
        ]);

        setBranches(branchList);
        setLanguages(langMap);
        setFlatTree(treeRes.items);
        setReadme(readmeRes);

        if (initialPath) {
          const match = treeRes.items.find((item) => item.path === initialPath);
          if (match?.type === 'blob') {
            setSelectedFilePath(initialPath);
          } else if (match?.type === 'tree') {
            setCurrentDirPath(initialPath);
          }
        }
      } catch (err) {
        setRepoError(
          err instanceof Error
            ? err.message
            : 'Unable to load repository from GitHub.'
        );
      } finally {
        setIsLoadingRepo(false);
      }
    },
    []
  );

  // Load omarryhan/aiogoogle immediately on mount
  useEffect(() => {
    loadRepository(DEFAULT_OWNER, DEFAULT_REPO);
  }, [loadRepository]);

  // Load selected file content whenever selectedFilePath changes
  useEffect(() => {
    if (!selectedFilePath || !activeBranch) return;
    let cancelled = false;

    const loadFile = async () => {
      setIsLoadingFile(true);
      setFileError(null);
      try {
        const res = await fetchFileContent(
          owner,
          repo,
          activeBranch,
          selectedFilePath
        );
        if (!cancelled) {
          setFileContent(res.content);
          setFileIsBinary(res.isBinary);
          setFileRawUrl(res.rawUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setFileError(
            err instanceof Error ? err.message : 'Failed to load file content.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFile(false);
        }
      }
    };

    loadFile();
    return () => {
      cancelled = true;
    };
  }, [owner, repo, activeBranch, selectedFilePath]);

  // Lazy-load Commits when tab is active
  useEffect(() => {
    if (activeTab !== 'commits' || !activeBranch) return;
    const key = `${owner}/${repo}@${activeBranch}`;
    if (commitsLoadedKey === key) return;

    let cancelled = false;
    setIsLoadingCommits(true);
    setCommitsError(null);

    fetchCommits(owner, repo, activeBranch)
      .then((data) => {
        if (!cancelled) {
          setCommits(data);
          setCommitsLoadedKey(key);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCommitsError(
            err instanceof Error ? err.message : 'Failed to fetch commits.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCommits(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, owner, repo, activeBranch, commitsLoadedKey]);

  // Lazy-load Releases when tab is active
  useEffect(() => {
    if (activeTab !== 'releases') return;
    const key = `${owner}/${repo}`;
    if (releasesLoadedKey === key) return;

    let cancelled = false;
    setIsLoadingReleases(true);
    setReleasesError(null);

    fetchReleases(owner, repo)
      .then((data) => {
        if (!cancelled) {
          setReleases(data);
          setReleasesLoadedKey(key);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setReleasesError(
            err instanceof Error ? err.message : 'Failed to fetch releases.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReleases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, owner, repo, releasesLoadedKey]);

  // Lazy-load Issues when tab is active
  useEffect(() => {
    if (activeTab !== 'issues') return;
    const key = `${owner}/${repo}:${issueState}`;
    if (issuesLoadedKey === key) return;

    let cancelled = false;
    setIsLoadingIssues(true);
    setIssuesError(null);

    fetchIssues(owner, repo, issueState)
      .then((data) => {
        if (!cancelled) {
          setIssues(data);
          setIssuesLoadedKey(key);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIssuesError(
            err instanceof Error ? err.message : 'Failed to fetch issues.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingIssues(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, owner, repo, issueState, issuesLoadedKey]);

  const treeHierarchy = useMemo(() => buildTreeHierarchy(flatTree), [flatTree]);
  const directoryNodes = useMemo(
    () => getDirectoryNodes(treeHierarchy, currentDirPath),
    [treeHierarchy, currentDirPath]
  );

  const handleOpenRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseGithubInput(repoInput);
    if (!parsed) {
      setInputError('Enter a valid GitHub URL or owner/repo (e.g. omarryhan/aiogoogle).');
      return;
    }
    setInputError(null);
    setOwner(parsed.owner);
    setRepo(parsed.repo);
    setActiveTab('code');
    setCommitsLoadedKey('');
    setReleasesLoadedKey('');
    setIssuesLoadedKey('');
    loadRepository(parsed.owner, parsed.repo, parsed.branch, parsed.path);
  };

  const handleBranchChange = async (nextBranch: string) => {
    setActiveBranch(nextBranch);
    setSelectedFilePath(null);
    setCurrentDirPath('');
    setIsLoadingRepo(true);
    setRepoError(null);
    try {
      const [treeRes, readmeRes] = await Promise.all([
        fetchGitTree(owner, repo, nextBranch),
        fetchReadme(owner, repo, nextBranch),
      ]);
      setFlatTree(treeRes.items);
      setReadme(readmeRes);
    } catch (err) {
      setRepoError(
        err instanceof Error ? err.message : 'Failed to switch branch.'
      );
    } finally {
      setIsLoadingRepo(false);
    }
  };

  const handleSelectDir = (dirPath: string) => {
    setSelectedFilePath(null);
    setCurrentDirPath(dirPath);
    setActiveTab('code');
  };

  const handleSelectFile = (filePath: string) => {
    setSelectedFilePath(filePath);
    setActiveTab('code');
  };

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'code', label: 'Code' },
    { id: 'commits', label: 'Commits' },
    { id: 'releases', label: 'Releases' },
    { id: 'issues', label: 'Issues' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Bar Contract: 1-row, 3-zone */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('code');
              setSelectedFilePath(null);
              setCurrentDirPath('');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            RepoReader
          </button>

          {/* Zone 2: 4 single-line text navigation links */}
          <nav
            aria-label="Repository views"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-blue-600 text-slate-900 dark:border-blue-500 dark:text-white'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <span>View on GitHub</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Workspace Toolbar & Repository Header */}
      <section className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-[1440px] space-y-4 px-6 py-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                {repoInfo?.owner.avatar_url && (
                  <img
                    src={repoInfo.owner.avatar_url}
                    alt={`${owner} avatar`}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full border border-slate-200 dark:border-slate-700"
                  />
                )}
                <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    {owner}
                  </span>{' '}
                  <span className="text-slate-400 dark:text-slate-600">/</span>{' '}
                  <span>{repo}</span>
                </h1>
              </div>

              {repoInfo?.description && (
                <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                  {repoInfo.description}
                </p>
              )}

              {repoInfo && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  <span>
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">
                      {repoInfo.stargazers_count.toLocaleString()}
                    </strong>{' '}
                    stars
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">
                      {repoInfo.forks_count.toLocaleString()}
                    </strong>{' '}
                    forks
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">
                      {repoInfo.open_issues_count.toLocaleString()}
                    </strong>{' '}
                    open issues
                  </span>
                  {repoInfo.license?.spdx_id &&
                    repoInfo.license.spdx_id !== 'NOASSERTION' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{repoInfo.license.spdx_id} License</span>
                      </>
                    )}
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatRelativeDate(repoInfo.pushed_at)}</span>
                  {repoInfo.homepage && (
                    <>
                      <span aria-hidden="true">·</span>
                      <a
                        href={
                          repoInfo.homepage.startsWith('http')
                            ? repoInfo.homepage
                            : `https://${repoInfo.homepage}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Documentation
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Workspace Controls: Repo URL opener, Branch selector, Theme toggle */}
            <div className="flex flex-wrap items-center gap-2.5">
              <form
                onSubmit={handleOpenRepoSubmit}
                className="flex flex-1 items-center gap-2 sm:flex-initial"
              >
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="https://github.com/owner/repo"
                  aria-label="GitHub repository URL or owner/repo"
                  className="w-full min-w-[220px] rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none sm:w-72 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  Open
                </button>
              </form>

              {branches.length > 0 && (
                <div className="relative flex items-center">
                  <GitBranch
                    className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400"
                    aria-hidden="true"
                  />
                  <select
                    value={activeBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    aria-label="Select branch"
                    className="rounded-md border border-slate-200 bg-white py-1.5 pr-3 pl-8 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white shrink-0"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {inputError && (
            <p className="text-xs text-red-600 dark:text-red-400">{inputError}</p>
          )}

          {/* Mobile Tab Bar */}
          <div className="flex items-center gap-1 border-t border-slate-200 pt-3 md:hidden dark:border-slate-800">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-[1440px]">
        {repoError ? (
          <div className="m-6 flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/30">
            <h2 className="font-display text-base font-semibold text-red-800 dark:text-red-200">
              Could not load {owner}/{repo}
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300">{repoError}</p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => loadRepository(owner, repo, activeBranch || undefined)}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
              <a
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 whitespace-nowrap shrink-0"
              >
                <span>Open Directly on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ) : activeTab === 'code' ? (
          <div className="flex flex-col lg:flex-row">
            <FileTree
              tree={treeHierarchy}
              flatItems={flatTree}
              selectedFilePath={selectedFilePath}
              currentDirPath={currentDirPath}
              languages={languages}
              isLoading={isLoadingRepo}
              onSelectFile={handleSelectFile}
              onSelectDir={handleSelectDir}
            />
            <div className="min-w-0 flex-1 p-6">
              <CodeViewer
                owner={owner}
                repo={repo}
                branch={activeBranch || 'master'}
                currentDirPath={currentDirPath}
                directoryNodes={directoryNodes}
                selectedFilePath={selectedFilePath}
                fileContent={fileContent}
                fileIsBinary={fileIsBinary}
                fileRawUrl={fileRawUrl}
                isLoadingFile={isLoadingFile}
                fileError={fileError}
                readme={readme}
                isLoadingRepo={isLoadingRepo}
                onSelectDir={handleSelectDir}
                onSelectFile={handleSelectFile}
              />
            </div>
          </div>
        ) : activeTab === 'commits' ? (
          <div className="p-6">
            <CommitsView
              commits={commits}
              isLoading={isLoadingCommits}
              error={commitsError}
            />
          </div>
        ) : activeTab === 'releases' ? (
          <div className="p-6">
            <ReleasesView
              releases={releases}
              owner={owner}
              repo={repo}
              branch={activeBranch || 'master'}
              isLoading={isLoadingReleases}
              error={releasesError}
            />
          </div>
        ) : (
          <div className="p-6">
            <IssuesView
              issues={issues}
              issueState={issueState}
              owner={owner}
              repo={repo}
              branch={activeBranch || 'master'}
              isLoading={isLoadingIssues}
              error={issuesError}
              onChangeState={setIssueState}
            />
          </div>
        )}
      </main>
    </div>
  );
}
