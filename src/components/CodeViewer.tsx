import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileCode2,
  FileText,
  Folder,
} from 'lucide-react';
import { formatBytes } from '../services/github';
import type { TreeNode } from '../types/github';
import { MarkdownRenderer } from './MarkdownRenderer';

interface CodeViewerProps {
  owner: string;
  repo: string;
  branch: string;
  currentDirPath: string;
  directoryNodes: TreeNode[];
  selectedFilePath: string | null;
  fileContent: string;
  fileIsBinary: boolean;
  fileRawUrl: string;
  isLoadingFile: boolean;
  fileError: string | null;
  readme: { filename: string; content: string } | null;
  isLoadingRepo: boolean;
  onSelectDir: (path: string) => void;
  onSelectFile: (path: string) => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  owner,
  repo,
  branch,
  currentDirPath,
  directoryNodes,
  selectedFilePath,
  fileContent,
  fileIsBinary,
  fileRawUrl,
  isLoadingFile,
  fileError,
  readme,
  isLoadingRepo,
  onSelectDir,
  onSelectFile,
}) => {
  const [copied, setCopied] = useState(false);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

  const activePath = selectedFilePath || currentDirPath;
  const pathSegments = activePath ? activePath.split('/').filter(Boolean) : [];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const ext = selectedFilePath?.split('.').pop()?.toLowerCase() || '';
  const isMarkdownFile = ext === 'md' || ext === 'markdown';
  const isImageFile = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

  const lines = fileContent ? fileContent.split('\n') : [];

  return (
    <div className="min-w-0 flex-1 space-y-6">
      {/* Path Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <nav
          aria-label="Repository path breadcrumbs"
          className="flex flex-wrap items-center gap-1.5 text-sm"
        >
          <button
            type="button"
            onClick={() => onSelectDir('')}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
          >
            {repo}
          </button>
          {pathSegments.map((segment, index) => {
            const fullSegPath = pathSegments.slice(0, index + 1).join('/');
            const isLast = index === pathSegments.length - 1;
            const isFile = Boolean(selectedFilePath) && isLast;
            return (
              <React.Fragment key={fullSegPath}>
                <span className="text-slate-400" aria-hidden="true">
                  /
                </span>
                {isFile ? (
                  <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {segment}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectDir(fullSegPath)}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
                  >
                    {segment}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {selectedFilePath && (
          <button
            type="button"
            onClick={() => {
              const parent = selectedFilePath.includes('/')
                ? selectedFilePath.split('/').slice(0, -1).join('/')
                : '';
              onSelectDir(parent);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Folder</span>
          </button>
        )}
      </div>

      {/* Selected File Viewer */}
      {selectedFilePath ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {selectedFilePath.split('/').pop()}
              </span>
              {!isLoadingFile && !fileIsBinary && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{lines.length} lines</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatBytes(new Blob([fileContent]).size)}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isMarkdownFile && !isLoadingFile && (
                <button
                  type="button"
                  onClick={() => setShowRawMarkdown((v) => !v)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  {showRawMarkdown ? 'Preview' : 'Raw'}
                </button>
              )}
              {!fileIsBinary && !isLoadingFile && !fileError && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
              <a
                href={`https://github.com/${owner}/${repo}/blob/${encodeURIComponent(
                  branch
                )}/${selectedFilePath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {isLoadingFile ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-900"
                  style={{ width: `${55 + ((i * 19) % 40)}%` }}
                />
              ))}
            </div>
          ) : fileError ? (
            <div className="p-6 text-sm text-red-600 dark:text-red-400">
              {fileError}
            </div>
          ) : isImageFile ? (
            <div className="flex flex-col items-center justify-center bg-slate-50/50 p-8 dark:bg-slate-900/30">
              <img
                src={fileRawUrl}
                alt={selectedFilePath}
                referrerPolicy="no-referrer"
                className="max-h-[480px] rounded border border-slate-200 dark:border-slate-800"
              />
            </div>
          ) : fileIsBinary ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Binary file preview is not available in the browser.
              </p>
              <a
                href={fileRawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                <span>Download Raw File</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : isMarkdownFile && !showRawMarkdown ? (
            <div className="p-6 lg:p-8">
              <MarkdownRenderer
                content={fileContent}
                owner={owner}
                repo={repo}
                branch={branch}
                basePath={
                  selectedFilePath.includes('/')
                    ? selectedFilePath.split('/').slice(0, -1).join('/')
                    : ''
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto py-3">
              <table className="w-full border-collapse font-mono text-[13px] leading-[1.6] tabular-nums">
                <tbody>
                  {lines.map((line, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    >
                      <td className="w-12 select-none px-3 text-right text-xs text-slate-400 dark:text-slate-600">
                        {index + 1}
                      </td>
                      <td className="whitespace-pre pr-6 text-slate-800 dark:text-slate-200">
                        {line || ' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Directory Table + README */
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
              <span>
                {currentDirPath ? `Directory: ${currentDirPath}` : 'Root Files'}
              </span>
              <span className="tabular-nums">
                {directoryNodes.length} items
              </span>
            </div>

            {isLoadingRepo ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {currentDirPath && (
                  <button
                    type="button"
                    onClick={() => {
                      const parent = currentDirPath.includes('/')
                        ? currentDirPath.split('/').slice(0, -1).join('/')
                        : '';
                      onSelectDir(parent);
                    }}
                    className="flex h-10 w-full items-center gap-3 px-4 text-left text-sm text-blue-600 transition-colors hover:bg-slate-50 dark:text-blue-400 dark:hover:bg-slate-900/60"
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="font-mono font-medium">..</span>
                  </button>
                )}

                {directoryNodes.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    This directory is empty.
                  </div>
                ) : (
                  directoryNodes.map((node) => {
                    const isDir = node.type === 'tree';
                    return (
                      <button
                        key={node.path}
                        type="button"
                        onClick={() =>
                          isDir ? onSelectDir(node.path) : onSelectFile(node.path)
                        }
                        className="flex h-10 w-full items-center justify-between gap-4 px-4 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {isDir ? (
                            <Folder className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                          ) : node.name.endsWith('.py') ||
                            node.name.endsWith('.ts') ||
                            node.name.endsWith('.js') ? (
                            <FileCode2 className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                          )}
                          <span className="truncate font-medium text-slate-800 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400">
                            {node.name}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-slate-400 tabular-nums dark:text-slate-500">
                          {isDir ? 'dir' : formatBytes(node.size)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* README Section (shown at repo root or whenever README exists) */}
          {!currentDirPath && readme && (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-white">
                <BookOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>{readme.filename}</span>
              </div>
              <div className="p-6 lg:p-8">
                <MarkdownRenderer
                  content={readme.content}
                  owner={owner}
                  repo={repo}
                  branch={branch}
                />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
