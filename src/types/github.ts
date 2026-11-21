export interface RepoOwner {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface RepoLicense {
  key: string;
  name: string;
  spdx_id: string | null;
}

export interface RepoInfo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  license: RepoLicense | null;
  updated_at: string;
  pushed_at: string;
  created_at: string;
  size: number;
  owner: RepoOwner;
}

export interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
  children?: TreeNode[];
}

export interface BranchItem {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

export interface CommitItem {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
}

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

export interface ReleaseItem {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
  published_at: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
  assets: ReleaseAsset[];
}

export interface IssueItem {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  comments: number;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  pull_request?: {
    url: string;
  };
}

export type ActiveTab = 'code' | 'commits' | 'releases' | 'issues';
