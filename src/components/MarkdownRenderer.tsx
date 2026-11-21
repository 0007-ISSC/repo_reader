import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  owner: string;
  repo: string;
  branch: string;
  basePath?: string;
}

function resolveGithubAssetUrl(
  src: string | undefined,
  owner: string,
  repo: string,
  branch: string,
  basePath = ''
): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src)) {
    // Rewrite github.com/owner/repo/blob/branch/path to raw.githubusercontent.com
    const blobMatch = src.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i
    );
    if (blobMatch) {
      return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}/${blobMatch[4]}`;
    }
    return src;
  }
  const cleanSrc = src.replace(/^\.\//, '').replace(/^\/+/, '');
  const prefix = basePath ? `${basePath.replace(/\/+$/, '')}/` : '';
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
    branch
  )}/${prefix}${cleanSrc}`;
}

function CodeBlockWithCopy({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, '');
  const lang = className ? className.replace('language-', '') : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="font-mono">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white whitespace-nowrap shrink-0"
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
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
        <code className={className}>{text}</code>
      </pre>
    </div>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  owner,
  repo,
  branch,
  basePath = '',
}) => {
  return (
    <div className="prose-container text-[15px] leading-[1.7] text-slate-700 dark:text-slate-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display mt-2 mb-4 border-b border-slate-200 pb-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:border-slate-800 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display mt-8 mb-3 border-b border-slate-200 pb-2 text-xl font-semibold tracking-tight text-slate-900 dark:border-slate-800 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display mt-6 mb-2.5 text-lg font-semibold text-slate-900 dark:text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-display mt-5 mb-2 text-base font-semibold text-slate-900 dark:text-white">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-3.5">{children}</p>,
          a: ({ href, children }) => {
            const safeHref =
              href && /^(https?:|mailto:|#)/i.test(href)
                ? href
                : href
                ? `https://github.com/${owner}/${repo}/blob/${encodeURIComponent(
                    branch
                  )}/${href.replace(/^\.\//, '').replace(/^\/+/, '')}`
                : '#';
            return (
              <a
                href={safeHref}
                target={safeHref.startsWith('#') ? undefined : '_blank'}
                rel={safeHref.startsWith('#') ? undefined : 'noopener noreferrer'}
                className="inline-flex items-baseline gap-0.5 font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:text-blue-700 hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:text-blue-300"
              >
                <span>{children}</span>
                {!safeHref.startsWith('#') && (
                  <ExternalLink className="inline h-3 w-3 opacity-60" aria-hidden="true" />
                )}
              </a>
            );
          },
          ul: ({ children }) => (
            <ul className="my-3.5 list-disc space-y-1.5 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3.5 list-decimal space-y-1.5 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-6 border-t border-slate-200 dark:border-slate-800" />
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full border-collapse text-left text-sm tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-3.5 py-2.5">{children}</th>,
          td: ({ children }) => (
            <td className="border-t border-slate-200 px-3.5 py-2.5 dark:border-slate-800">
              {children}
            </td>
          ),
          code: ({ className, children }) => {
            const isBlock =
              Boolean(className) || String(children).includes('\n');
            if (!isBlock) {
              return (
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {children}
                </code>
              );
            }
            return <CodeBlockWithCopy className={className}>{children}</CodeBlockWithCopy>;
          },
          pre: ({ children }) => <>{children}</>,
          img: ({ src, alt }) => {
            const resolved = resolveGithubAssetUrl(
              src,
              owner,
              repo,
              branch,
              basePath
            );
            return (
              <img
                src={resolved}
                alt={alt || 'Repository image'}
                referrerPolicy="no-referrer"
                className="my-3 inline-block max-w-full rounded-md border border-slate-200/70 dark:border-slate-800"
                loading="lazy"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
