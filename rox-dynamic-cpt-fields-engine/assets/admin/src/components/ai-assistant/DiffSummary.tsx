/**
 * DiffSummary - Per-slice "what will be created" cards.
 *
 * Reads the schema returned by `aiApi.generate()` and renders one
 * card per non-empty slice (post types, taxonomies, …). Pro slices
 * (queries / listings / relations) show a Pro badge for context, but
 * the backend already strips them on Free sites so we never display
 * gated content.
 *
 * @package DynamicCPTFieldsEngine
 */

import {
  FileType,
  Tags,
  Layers,
  FileText,
  Database,
  LayoutGrid,
  Network,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AISchemaPayload } from '@/services/api';

interface SliceConfig {
  key: keyof AISchemaPayload;
  label: string;
  icon: LucideIcon;
  isPro?: boolean;
  describe: (item: Record<string, unknown>) => string;
}

const SLICES: SliceConfig[] = [
  {
    key: 'post_types',
    label: 'Post Types',
    icon: FileType,
    describe: (item) => {
      const slug = String(item.slug ?? '');
      const plural = String(item.plural ?? item.label ?? slug);
      const fields = Array.isArray(item.fields) ? item.fields.length : 0;
      const name = plural ? `${plural}${slug ? ` (${slug})` : ''}` : slug;
      return fields > 0 ? `${name} — ${fields} field${fields === 1 ? '' : 's'}` : name;
    },
  },
  {
    key: 'taxonomies',
    label: 'Taxonomies',
    icon: Tags,
    describe: (item) => {
      const slug = String(item.slug ?? '');
      const plural = String(item.plural ?? item.label ?? slug);
      const fields = Array.isArray(item.fields) ? item.fields.length : 0;
      const name = plural ? `${plural}${slug ? ` (${slug})` : ''}` : slug;
      return fields > 0 ? `${name} — ${fields} field${fields === 1 ? '' : 's'}` : name;
    },
  },
  {
    key: 'field_groups',
    label: 'Field Groups',
    icon: Layers,
    describe: (item) => {
      const title = String(item.title ?? '');
      const fields = Array.isArray(item.fields) ? item.fields.length : 0;
      return `${title}${fields ? ` — ${fields} field${fields === 1 ? '' : 's'}` : ''}`;
    },
  },
  {
    key: 'options_pages',
    label: 'Options Pages',
    icon: FileText,
    describe: (item) => {
      const title = String(item.page_title ?? item.menu_title ?? item.title ?? '');
      const slug = String(item.menu_slug ?? '');
      return slug ? `${title} (${slug})` : title;
    },
  },
  {
    key: 'queries',
    label: 'Queries',
    icon: Database,
    isPro: true,
    describe: (item) => String(item.title ?? item.slug ?? '(query)'),
  },
  {
    key: 'listings',
    label: 'Listings',
    icon: LayoutGrid,
    isPro: true,
    describe: (item) => String(item.title ?? item.slug ?? '(listing)'),
  },
  {
    key: 'relations',
    label: 'Relations',
    icon: Network,
    isPro: true,
    describe: (item) => {
      const raw =
        item.data !== undefined && typeof item.data === 'object' && item.data !== null && !Array.isArray(item.data)
          ? (item.data as Record<string, unknown>)
          : item;
      const slug = String(raw.slug ?? '');
      const from = String(raw.from_cpt ?? '');
      const to = String(raw.to_cpt ?? '');
      if (from && to) {
        return `${slug || 'relation'}: ${from} ↔ ${to}`;
      }
      return slug || '(relation)';
    },
  },
];

interface DiffSummaryProps {
  schema: Partial<AISchemaPayload> | null;
  summary?: string[];
}

export function DiffSummary({ schema, summary = [] }: DiffSummaryProps) {
  if (!schema) {
    return (
      <div className="rdcfe-flex rdcfe-h-full rdcfe-flex-col rdcfe-items-center rdcfe-justify-center rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-gray-200 rdcfe-bg-white rdcfe-p-8 rdcfe-text-center">
        <Sparkles className="rdcfe-mb-3 rdcfe-h-8 rdcfe-w-8 rdcfe-text-gray-300" />
        <p className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-600">No schema yet</p>
        <p className="rdcfe-mt-1 rdcfe-text-xs rdcfe-text-gray-400">
          Type a prompt and hit Generate, or pick a Quick Start template below.
        </p>
      </div>
    );
  }

  return (
    <div className="rdcfe-flex rdcfe-h-full rdcfe-flex-col rdcfe-gap-3 rdcfe-overflow-auto">
      {summary.length > 0 && (
        <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-indigo-100 rdcfe-bg-indigo-50/50 rdcfe-p-3">
          <div className="rdcfe-mb-1.5 rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-indigo-700">
            <Sparkles className="rdcfe-h-3 rdcfe-w-3" />
            AI Summary
          </div>
          <ul className="rdcfe-space-y-1 rdcfe-text-sm rdcfe-text-indigo-900">
            {summary.map((line, i) => (
              <li key={i} className="rdcfe-flex rdcfe-items-start rdcfe-gap-2">
                <span className="rdcfe-mt-1.5 rdcfe-h-1 rdcfe-w-1 rdcfe-flex-shrink-0 rdcfe-rounded-full rdcfe-bg-indigo-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {SLICES.map((slice) => {
        const items = (schema[slice.key] ?? []) as Array<Record<string, unknown>>;
        if (items.length === 0) return null;
        const Icon = slice.icon;
        return (
          <div
            key={slice.key}
            className="rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-overflow-hidden"
          >
            <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-border-b rdcfe-border-gray-100 rdcfe-bg-gray-50 rdcfe-px-3 rdcfe-py-2">
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
                <Icon className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-gray-500" />
                <span className="rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-gray-700">
                  {slice.label}
                </span>
                {slice.isPro && (
                  <span className="rdcfe-rounded rdcfe-bg-indigo-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-text-[9px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-indigo-700">
                    Pro
                  </span>
                )}
              </div>
              <span className="rdcfe-rounded-full rdcfe-bg-emerald-50 rdcfe-px-2 rdcfe-py-0.5 rdcfe-text-[11px] rdcfe-font-medium rdcfe-text-emerald-700">
                +{items.length}
              </span>
            </div>
            <ul className="rdcfe-divide-y rdcfe-divide-gray-50">
              {items.map((item, idx) => (
                <li key={idx} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm rdcfe-text-gray-700">
                  <CheckCircle className="rdcfe-h-3.5 rdcfe-w-3.5 rdcfe-flex-shrink-0 rdcfe-text-emerald-500" />
                  <span className="rdcfe-truncate">{slice.describe(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default DiffSummary;
