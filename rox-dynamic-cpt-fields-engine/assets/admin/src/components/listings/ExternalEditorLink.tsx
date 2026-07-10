import { ExternalLink } from 'lucide-react';
import type { ListingEditor } from '../../services/api';

interface ExternalEditorLinkProps {
  pageId: number;
  editor: ListingEditor;
  pageStatus?: string;
}

const EDITOR_LABELS: Record<string, string> = {
  gutenberg: 'Edit in Gutenberg',
  elementor: 'Edit in Elementor',
};

function getEditorUrl(pageId: number, editor: ListingEditor): string {
  const base = window.rdcfeSettings?.adminUrl ?? '/wp-admin/';
  if (editor === 'elementor') {
    return `${base}post.php?post=${pageId}&action=elementor`;
  }
  return `${base}post.php?post=${pageId}&action=edit`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    publish: 'hsl(142 71% 45%)',
    draft: 'hsl(45 93% 47%)',
    trash: 'hsl(0 84% 60%)',
  };
  const color = colors[status] ?? 'hsl(var(--rdcfe-muted-foreground))';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-text-[11px] rdcfe-font-medium rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-rounded"
      style={{ color, background: `${color.replace(')', ' / 0.1)')}` }}
    >
      <span
        className="rdcfe-w-1.5 rdcfe-h-1.5 rdcfe-rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export function ExternalEditorLink({ pageId, editor, pageStatus }: ExternalEditorLinkProps) {
  if (!pageId || editor === 'rdcfe') return null;

  const url = getEditorUrl(pageId, editor);
  const label = EDITOR_LABELS[editor] ?? 'Edit';

  return (
    <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-2.5 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-font-medium rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors rdcfe-no-underline"
        title={label}
      >
        <ExternalLink className="rdcfe-w-3.5 rdcfe-h-3.5" />
        {label}
      </a>
      {pageStatus && statusBadge(pageStatus)}
    </div>
  );
}
