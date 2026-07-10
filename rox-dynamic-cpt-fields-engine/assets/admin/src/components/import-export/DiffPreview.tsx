import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GitBranchPlus,
  RefreshCw,
  Equal,
  AlertTriangle,
} from 'lucide-react';
import type { ImportDiffItem, ImportResolutionPayload } from '../../services/api';
import { ConflictModal } from './ConflictModal';

interface DiffPreviewProps {
  fileLabel: string;
  items: ImportDiffItem[];
  summary: { new: number; modified: number; unchanged: number };
  resolutions: Record<string, ImportResolutionPayload>;
  onResolutionsChange: (next: Record<string, ImportResolutionPayload>) => void;
  typeLabels: Record<string, string>;
  createSnapshot: boolean;
  onCreateSnapshotChange: (value: boolean) => void;
}

function resolutionLabel(res: ImportResolutionPayload | undefined): string {
  if (!res) return 'Overwrite';
  if (res.action === 'skip' || res.action === 'keep') return 'Keep existing';
  if (res.action === 'rename') return `Rename → ${res.new_slug || '…'}`;
  return 'Overwrite';
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v.length > 120 ? `${v.slice(0, 117)}…` : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  } catch {
    return String(v);
  }
}

export function DiffPreview({
  fileLabel,
  items,
  summary,
  resolutions,
  onResolutionsChange,
  typeLabels,
  createSnapshot,
  onCreateSnapshotChange,
}: DiffPreviewProps) {
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [conflictItem, setConflictItem] = useState<ImportDiffItem | null>(null);

  const grouped = useMemo(() => {
    const g = { new: [] as ImportDiffItem[], modified: [] as ImportDiffItem[], unchanged: [] as ImportDiffItem[] };
    for (const it of items) {
      if (it.status_category === 'new') g.new.push(it);
      else if (it.status_category === 'modified') g.modified.push(it);
      else g.unchanged.push(it);
    }
    return g;
  }, [items]);

  const saveResolution = (key: string, resolution: ImportResolutionPayload) => {
    const next = { ...resolutions };
    if (resolution.action === 'overwrite') {
      delete next[key];
    } else {
      next[key] = resolution;
    }
    onResolutionsChange(next);
  };

  return (
    <div className="rdcfe-space-y-4 rdcfe-rounded-lg rdcfe-border rdcfe-border-indigo-100 rdcfe-bg-indigo-50/40 rdcfe-p-4">
      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-between rdcfe-gap-2">
        <div>
          <p className="rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wide rdcfe-text-indigo-700">
            Import preview
          </p>
          <p className="rdcfe-text-sm rdcfe-text-gray-700">
            <span className="rdcfe-font-medium">{fileLabel}</span>
            <span className="rdcfe-ml-2 rdcfe-inline-flex rdcfe-items-center rdcfe-rounded rdcfe-bg-indigo-600 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-text-[10px] rdcfe-font-semibold rdcfe-uppercase rdcfe-text-white">
              Pro
            </span>
          </p>
        </div>
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-2 rdcfe-text-xs rdcfe-text-gray-600">
          <span className="rdcfe-rounded-md rdcfe-bg-white rdcfe-px-2 rdcfe-py-1 rdcfe-ring-1 rdcfe-ring-gray-200">{summary.new} new</span>
          <span className="rdcfe-rounded-md rdcfe-bg-white rdcfe-px-2 rdcfe-py-1 rdcfe-ring-1 rdcfe-ring-gray-200">{summary.modified} updates</span>
          <span className="rdcfe-rounded-md rdcfe-bg-white rdcfe-px-2 rdcfe-py-1 rdcfe-ring-1 rdcfe-ring-gray-200">{summary.unchanged} unchanged</span>
        </div>
      </div>

      <label className="rdcfe-flex rdcfe-cursor-pointer rdcfe-items-center rdcfe-gap-2 rdcfe-text-sm rdcfe-text-gray-800">
        <input
          type="checkbox"
          checked={createSnapshot}
          onChange={(e) => onCreateSnapshotChange(e.target.checked)}
          className="rdcfe-h-4 rdcfe-w-4 rdcfe-rounded rdcfe-border-gray-300"
        />
        Create rollback snapshot before import
      </label>

      {grouped.new.length > 0 && (
        <DiffSection
          title="New"
          icon={<GitBranchPlus className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-emerald-600" />}
          items={grouped.new}
          typeLabels={typeLabels}
          tone="emerald"
        />
      )}

      {grouped.modified.length > 0 && (
        <DiffSection
          title="Updates & conflicts"
          icon={<RefreshCw className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-amber-600" />}
          items={grouped.modified}
          typeLabels={typeLabels}
          tone="amber"
          expandedKey={openDetail}
          onToggle={(key) => setOpenDetail((k) => (k === key ? null : key))}
          extra={(it) => (
            <div className="rdcfe-mt-2 rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-2">
              <span className="rdcfe-text-xs rdcfe-text-gray-600">{resolutionLabel(resolutions[it.key])}</span>
              <button
                type="button"
                onClick={() => setConflictItem(it)}
                className="rdcfe-text-xs rdcfe-font-medium rdcfe-text-indigo-600 hover:rdcfe-text-indigo-800"
              >
                Resolve…
              </button>
            </div>
          )}
        />
      )}

      {grouped.unchanged.length > 0 && (
        <DiffSection
          title="Unchanged (skipped on import)"
          icon={<Equal className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-gray-400" />}
          items={grouped.unchanged}
          typeLabels={typeLabels}
          tone="gray"
        />
      )}

      {conflictItem && (
        <ConflictModal
          item={conflictItem}
          initial={resolutions[conflictItem.key]}
          onClose={() => setConflictItem(null)}
          onSave={(key, resolution) => saveResolution(key, resolution)}
        />
      )}
    </div>
  );
}

function DiffSection({
  title,
  icon,
  items,
  typeLabels,
  tone,
  expandedKey,
  onToggle,
  extra,
}: {
  title: string;
  icon: React.ReactNode;
  items: ImportDiffItem[];
  typeLabels: Record<string, string>;
  tone: 'emerald' | 'amber' | 'gray';
  expandedKey?: string | null;
  onToggle?: (key: string) => void;
  extra?: (item: ImportDiffItem) => React.ReactNode;
}) {
  const border =
    tone === 'emerald'
      ? 'rdcfe-border-emerald-200'
      : tone === 'amber'
        ? 'rdcfe-border-amber-200'
        : 'rdcfe-border-gray-200';

  return (
    <div className={`rdcfe-rounded-lg rdcfe-border ${border} rdcfe-bg-white`}>
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-border-b rdcfe-border-gray-100 rdcfe-px-3 rdcfe-py-2">
        {icon}
        <span className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-800">{title}</span>
        <span className="rdcfe-text-xs rdcfe-text-gray-500">({items.length})</span>
      </div>
      <ul className="rdcfe-divide-y rdcfe-divide-gray-50">
        {items.map((it) => (
          <li key={it.key} className="rdcfe-px-3 rdcfe-py-2.5">
            <div className="rdcfe-flex rdcfe-items-start rdcfe-justify-between rdcfe-gap-2">
              <div className="rdcfe-min-w-0">
                <p className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-800">
                  {typeLabels[it.type] ?? it.type}: <code className="rdcfe-text-xs">{it.slug}</code>
                </p>
                {it.status_category === 'modified' && it.import_title !== it.title && (
                  <p className="rdcfe-text-xs rdcfe-text-gray-500">
                    Title: “{it.title}” → “{it.import_title}”
                  </p>
                )}
                {it.status_category === 'modified' && (
                  <p className="rdcfe-mt-0.5 rdcfe-text-xs rdcfe-text-amber-700">
                    <AlertTriangle className="rdcfe-mr-1 rdcfe-inline rdcfe-h-3 rdcfe-w-3" />
                    {it.change_count} field change{it.change_count === 1 ? '' : 's'}
                    {it.changes_truncated ? ' (list truncated)' : ''}
                  </p>
                )}
                {extra?.(it)}
              </div>
              {it.status_category === 'modified' && onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(it.key)}
                  className="rdcfe-inline-flex rdcfe-shrink-0 rdcfe-items-center rdcfe-gap-1 rdcfe-text-xs rdcfe-font-medium rdcfe-text-indigo-600 hover:rdcfe-text-indigo-800"
                >
                  {expandedKey === it.key ? (
                    <ChevronDown className="rdcfe-h-4 rdcfe-w-4" />
                  ) : (
                    <ChevronRight className="rdcfe-h-4 rdcfe-w-4" />
                  )}
                  View diff
                </button>
              )}
            </div>
            {expandedKey === it.key && it.changes.length > 0 && (
              <div className="rdcfe-mt-2 rdcfe-max-h-48 rdcfe-overflow-auto rdcfe-rounded rdcfe-bg-slate-900 rdcfe-p-2 rdcfe-font-mono rdcfe-text-[11px] rdcfe-text-slate-100">
                <table className="rdcfe-w-full rdcfe-border-collapse rdcfe-text-left">
                  <thead>
                    <tr className="rdcfe-text-slate-400">
                      <th className="rdcfe-p-1">Path</th>
                      <th className="rdcfe-p-1">Before</th>
                      <th className="rdcfe-p-1">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {it.changes.map((ch, i) => (
                      <tr key={i} className="rdcfe-align-top">
                        <td className="rdcfe-p-1 rdcfe-text-indigo-300">{ch.path}</td>
                        <td className="rdcfe-p-1 rdcfe-break-all">{formatVal(ch.before)}</td>
                        <td className="rdcfe-p-1 rdcfe-break-all">{formatVal(ch.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
