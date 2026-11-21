import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitCommitHorizontal,
  MessageSquare,
  Search,
  Tag,
} from 'lucide-react';
import { formatBytes, formatRelativeDate } from '../services/github';
import type { CommitItem, IssueItem, ReleaseItem } from '../types/github';
import { MarkdownRenderer } from './MarkdownRenderer';

interface CommitsViewProps {
  commits: CommitItem[];
  isLoading: boolean;
  error: string | null;
}

export const CommitsView: React.FC<CommitsViewProps> = ({
  commits,
  isLoading,
  error,
}) => {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter(
      (c) =>
        c.commit.message.toLowerCase().includes(q) ||
        c.commit.author.name.toLowerCase().includes(q) ||
        c.sha.toLowerCase().includes(q)
    );
  }, [commits, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Commit History
        </h2>
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter commits..."
            aria-label="Filter commits"
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="space-y-2 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No commits match your filter.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
          {filtered.map((item) => {
            const [title, ...rest] = item.commit.message.split('\n');
            const body = rest.join('\n').trim();
            return (
              <div
                key={item.sha}
                className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center dark:hover:bg-slate-900/50"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-start gap-2">
                    <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <a
                      href={item.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                    >
                      {title}
                    </a>
                  </div>
                  {body && (
                    <p className="line-clamp-2 pl-6 text-xs text-slate-500 dark:text-slate-400">
                      {body}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.author?.login || item.commit.author.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>committed {formatRelativeDate(item.commit.author.date)}</span>
                  </div>
                </div>

                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 self-start rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700 tabular-nums transition-colors hover:border-blue-300 hover:text-blue-600 sm:self-center dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
                >
                  <span>{item.sha.slice(0, 7)}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ReleasesViewProps {
  releases: ReleaseItem[];
  owner: string;
  repo: string;
  branch: string;
  isLoading: boolean;
  error: string | null;
}

export const ReleasesView: React.FC<ReleasesViewProps> = ({
  releases,
  owner,
  repo,
  branch,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-slate-200 p-6 dark:border-slate-800"
          >
            <div className="h-5 w-44 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 p-10 text-center dark:border-slate-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          No published releases found for this repository.
        </p>
        <a
          href={`https://github.com/${owner}/${repo}/tags`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <span>View tags on GitHub</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
        Releases
      </h2>
      {releases.map((rel, index) => (
        <article
          key={rel.id}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={rel.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-base font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                >
                  {rel.name || rel.tag_name}
                </a>
                {index === 0 && !rel.prerelease && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Latest
                  </span>
                )}
                {rel.prerelease && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Pre-release
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Tag className="h-3 w-3" />
                  {rel.tag_name}
                </span>
                <span aria-hidden="true">·</span>
                <span>Released {formatRelativeDate(rel.published_at)}</span>
                {rel.author && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>by {rel.author.login}</span>
                  </>
                )}
              </div>
            </div>

            <a
              href={rel.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <span>View Release</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {rel.body && (
            <div className="p-5">
              <MarkdownRenderer
                content={rel.body}
                owner={owner}
                repo={repo}
                branch={branch}
              />
            </div>
          )}

          {rel.assets.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assets
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {rel.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-1.5 text-xs tabular-nums"
                  >
                    <a
                      href={asset.browser_download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {asset.name}
                    </a>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatBytes(asset.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
};

interface IssuesViewProps {
  issues: IssueItem[];
  issueState: 'open' | 'closed';
  owner: string;
  repo: string;
  branch: string;
  isLoading: boolean;
  error: string | null;
  onChangeState: (state: 'open' | 'closed') => void;
}

export const IssuesView: React.FC<IssuesViewProps> = ({
  issues,
  issueState,
  owner,
  repo,
  branch,
  isLoading,
  error,
  onChangeState,
}) => {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        String(issue.number).includes(q) ||
        (issue.user?.login.toLowerCase().includes(q) ?? false)
    );
  }, [issues, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Issues & Pull Requests
          </h2>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => onChangeState('open')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                issueState === 'open'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => onChangeState('closed')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                issueState === 'closed'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter issues..."
            aria-label="Filter issues"
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
              <div className="h-3 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No {issueState} issues found.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
          {filtered.map((issue) => {
            const isExpanded = expandedId === issue.number;
            const kind = issue.pull_request ? 'PR' : 'Issue';
            return (
              <div key={issue.id}>
                <div className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : issue.number)
                    }
                    className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {issue.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span className="font-mono">#{issue.number}</span>
                        <span aria-hidden="true">·</span>
                        <span>{kind}</span>
                        <span aria-hidden="true">·</span>
                        <span>opened {formatRelativeDate(issue.created_at)}</span>
                        {issue.user && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>by {issue.user.login}</span>
                          </>
                        )}
                        {issue.labels.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {issue.labels.map((l) => l.name).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {issue.comments > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{issue.comments}</span>
                      </span>
                    )}
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open #${issue.number} on GitHub`}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-10 py-4 dark:border-slate-800/70 dark:bg-slate-900/30">
                    {issue.body ? (
                      <MarkdownRenderer
                        content={issue.body}
                        owner={owner}
                        repo={repo}
                        branch={branch}
                      />
                    ) : (
                      <p className="text-xs italic text-slate-500 dark:text-slate-400">
                        No description provided.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
