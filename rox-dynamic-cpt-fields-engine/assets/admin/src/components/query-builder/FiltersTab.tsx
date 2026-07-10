import { Filter, Calendar, Users, Hash } from 'lucide-react';
import { Input } from '../ui';
import { CollapsibleSection, FieldRow, formatIdList, parseIdList, type TabContentProps } from './shared';

export function FiltersTab({ data, setData }: TabContentProps) {
  const filters = data.filters ?? {};
  const queryType = data.query_type;

  const setFilters = (patch: Partial<typeof filters>) => {
    setData((prev) => ({ ...prev, filters: { ...prev.filters, ...patch } }));
  };

  const idLabel =
    queryType === 'terms'
      ? 'Term IDs'
      : queryType === 'users'
      ? 'User IDs'
      : 'Post IDs';

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Include / Exclude"
        icon={<Hash className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <FieldRow
          label={`Include ${idLabel}`}
          hint="Comma-separated. Restricts the result set to exactly these IDs."
        >
          <Input
            placeholder="e.g. 12, 34, 56"
            value={formatIdList(filters.include_ids)}
            onChange={(e) => setFilters({ include_ids: parseIdList(e.target.value) })}
          />
        </FieldRow>

        <FieldRow
          label={`Exclude ${idLabel}`}
          hint="Comma-separated. Removes these IDs from the result set."
        >
          <Input
            placeholder="e.g. 7, 99"
            value={formatIdList(filters.exclude_ids)}
            onChange={(e) => setFilters({ exclude_ids: parseIdList(e.target.value) })}
          />
        </FieldRow>
      </CollapsibleSection>

      {queryType === 'posts' && (
        <CollapsibleSection
          title="Author Filter"
          icon={<Users className="rdcfe-w-5 rdcfe-h-5" />}
          defaultOpen={false}
        >
          <FieldRow
            label="Author User ID"
            hint="Limit to posts by a single author. Supports the {{current_user_id}} macro for 'my posts' lists."
          >
            <Input
              type="text"
              placeholder='e.g. 5 or {{current_user_id}}'
              value={filters.author === undefined || filters.author === '' ? '' : String(filters.author)}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === '') {
                  setFilters({ author: '' });
                  return;
                }
                // Accept macros (strings starting with `{{`) or a numeric ID.
                if (raw.startsWith('{{')) {
                  setFilters({ author: raw as unknown as number });
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                setFilters({ author: Number.isFinite(parsed) ? parsed : '' });
              }}
            />
          </FieldRow>
        </CollapsibleSection>
      )}

      {queryType === 'posts' && (
        <CollapsibleSection
          title="Date Range"
          icon={<Calendar className="rdcfe-w-5 rdcfe-h-5" />}
          defaultOpen={false}
        >
          <FieldRow
            label="Posted After"
            hint="Inclusive lower bound. ISO date (YYYY-MM-DD) or strtotime-friendly string (e.g. '-7 days')."
          >
            <Input
              placeholder="YYYY-MM-DD"
              value={filters.date_after ?? ''}
              onChange={(e) => setFilters({ date_after: e.target.value })}
            />
          </FieldRow>

          <FieldRow
            label="Posted Before"
            hint="Inclusive upper bound."
          >
            <Input
              placeholder="YYYY-MM-DD"
              value={filters.date_before ?? ''}
              onChange={(e) => setFilters({ date_before: e.target.value })}
            />
          </FieldRow>
        </CollapsibleSection>
      )}

      {queryType !== 'posts' && (
        <div className="rdcfe-card rdcfe-p-6">
          <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
            <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-flex-shrink-0">
              <Filter className="rdcfe-w-5 rdcfe-h-5" />
            </div>
            <div>
              <h3 className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-1">
                Author / Date filters skipped
              </h3>
              <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
                These filters only apply to <strong>Posts</strong> queries. Switch the query type
                back to Posts on the <strong>Source</strong> tab to use them.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
