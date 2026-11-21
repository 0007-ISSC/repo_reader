import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Search,
  X,
} from 'lucide-react';
import type { GitTreeItem, TreeNode } from '../types/github';

interface FileTreeProps {
  tree: TreeNode[];
  flatItems: GitTreeItem[];
  selectedFilePath: string | null;
  currentDirPath: string;
  languages: Record<string, number>;
  isLoading: boolean;
  onSelectFile: (path: string) => void;
  onSelectDir: (path: string) => void;
}

const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178C6',
  JavaScript: '#F1E05A',
  Shell: '#89E051',
  Dockerfile: '#384D54',
  HTML: '#E34C26',
  CSS: '#563D7C',
  Go: '#00ADD8',
  Rust: '#DEA584',
  Java: '#B07219',
  C: '#555555',
  'C++': '#F34B7D',
  Ruby: '#701516',
};

function getFileIcon(name: string) {
  const lower = name.toLowerCase();
  if (
    lower.endsWith('.py') ||
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.json') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.toml')
  ) {
    return <FileCode2 className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />;
  }
  return <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />;
}

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  flatItems,
  selectedFilePath,
  currentDirPath,
  languages,
  isLoading,
  onSelectFile,
  onSelectDir,
}) => {
  const [query, setQuery] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return flatItems
      .filter((item) => item.type === 'blob' && item.path.toLowerCase().includes(q))
      .slice(0, 60);
  }, [flatItems, query]);

  const languageStats = useMemo(() => {
    const entries = Object.entries(languages);
    const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
    if (total === 0) return [];
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, bytes]) => ({
        name,
        percent: ((bytes / total) * 100).toFixed(1),
        width: (bytes / total) * 100,
        color: LANG_COLORS[name] || '#64748B',
      }));
  }, [languages]);

  const renderNodes = (nodes: TreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isDir = node.type === 'tree';
      const isExpanded =
        Boolean(expandedDirs[node.path]) ||
        (selectedFilePath?.startsWith(`${node.path}/`) ?? false) ||
        currentDirPath === node.path ||
        currentDirPath.startsWith(`${node.path}/`);

      const isSelected =
        (!isDir && selectedFilePath === node.path) ||
        (isDir && !selectedFilePath && currentDirPath === node.path);

      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => {
              if (isDir) {
                toggleDir(node.path);
                onSelectDir(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
            className={`group flex w-full items-center gap-2 rounded-md py-1.5 pr-2.5 text-left text-[13px] transition-colors ${
              isSelected
                ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
            }`}
          >
            {isDir ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-blue-600/80 dark:text-blue-400/80" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="truncate">{node.name}</span>
          </button>

          {isDir && isExpanded && node.children && node.children.length > 0 && (
            <div>{renderNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 lg:w-[280px] lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="border-b border-slate-200 p-3 dark:border-slate-800">
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files..."
            aria-label="Filter files in repository"
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pr-7 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear file filter"
              className="absolute right-2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[340px] flex-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-230px)]">
        {isLoading ? (
          <div className="space-y-1.5 p-1">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="h-7 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70"
              />
            ))}
          </div>
        ) : query.trim() ? (
          filteredFiles.length > 0 ? (
            <div className="space-y-0.5">
              {filteredFiles.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onSelectFile(item.path)}
                  className={`flex w-full flex-col rounded-md px-2.5 py-1.5 text-left transition-colors ${
                    selectedFilePath === item.path
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span className="truncate text-[13px] font-medium">
                    {item.path.split('/').pop()}
                  </span>
                  <span className="truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    {item.path}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No files matching "{query}"
            </div>
          )
        ) : (
          <div className="space-y-0.5">{renderNodes(tree)}</div>
        )}
      </div>

      {languageStats.length > 0 && (
        <div className="border-t border-slate-200 p-3.5 dark:border-slate-800">
          <div className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            Languages
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            {languageStats.map((lang) => (
              <div
                key={lang.name}
                style={{ width: `${lang.width}%`, backgroundColor: lang.color }}
                title={`${lang.name}: ${lang.percent}%`}
              />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
            {languageStats.map((lang) => (
              <span key={lang.name} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: lang.color }}
                  aria-hidden="true"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {lang.name}
                </span>
                <span>{lang.percent}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
