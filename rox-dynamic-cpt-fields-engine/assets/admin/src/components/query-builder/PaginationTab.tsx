import { LayoutGrid } from 'lucide-react';
import { Input } from '../ui';
import { CollapsibleSection, FieldRow, type TabContentProps } from './shared';

export function PaginationTab({ data, setData }: TabContentProps) {
  const ppp = data.posts_per_page ?? 10;
  const offset = data.offset ?? 0;

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Pagination"
        icon={<LayoutGrid className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <FieldRow
          label="Items Per Page"
          hint="Use -1 to fetch all results (warning: unbounded queries can be slow on large datasets)."
        >
          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
            <Input
              type="number"
              min={-1}
              max={500}
              step={1}
              value={ppp}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isNaN(next)) return;
                setData((prev) => ({
                  ...prev,
                  posts_per_page: next === -1 ? -1 : Math.max(1, Math.min(500, Math.round(next))),
                }));
              }}
              className="rdcfe-w-32"
            />
            <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              {ppp === -1 ? 'All results (capped at 500 server-side for safety)' : `Top ${ppp} results per page`}
            </span>
          </div>
        </FieldRow>

        <FieldRow label="Offset" hint="Skip the first N results before returning anything.">
          <Input
            type="number"
            min={0}
            step={1}
            value={offset}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isNaN(next) || next < 0) {
                setData((prev) => ({ ...prev, offset: 0 }));
                return;
              }
              setData((prev) => ({ ...prev, offset: Math.round(next) }));
            }}
            className="rdcfe-w-32"
          />
        </FieldRow>
      </CollapsibleSection>
    </div>
  );
}
