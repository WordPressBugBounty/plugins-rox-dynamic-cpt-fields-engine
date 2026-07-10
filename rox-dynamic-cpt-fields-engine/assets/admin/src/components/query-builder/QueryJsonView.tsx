import { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';
import { CollapsibleSection, type TabContentProps } from './shared';

export function QueryJsonView({ data }: TabContentProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // No-op — clipboard might be blocked.
    }
  };

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="JSON Configuration"
        icon={<Code2 className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={true}
      >
        <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4 rdcfe-leading-relaxed">
          Read-only view of the saved-query payload. Useful when filing bug reports, building
          third-party integrations against the REST API, or copy-pasting into a sibling query as a
          starting template.
        </p>

        <div className="rdcfe-relative">
          <button
            type="button"
            onClick={copy}
            className="rdcfe-absolute rdcfe-top-3 rdcfe-right-3 rdcfe-btn rdcfe-btn-secondary rdcfe-btn-icon"
            title="Copy JSON"
          >
            {copied ? (
              <Check className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-[hsl(var(--rdcfe-success))]" />
            ) : (
              <Copy className="rdcfe-h-4 rdcfe-w-4" />
            )}
          </button>
          <pre className="rdcfe-rounded-xl rdcfe-bg-[hsl(220_13%_18%)] rdcfe-text-[hsl(60_30%_96%)] rdcfe-p-4 rdcfe-pr-14 rdcfe-text-[12px] rdcfe-font-mono rdcfe-overflow-auto rdcfe-max-h-[480px] rdcfe-leading-relaxed">
            <code>{json}</code>
          </pre>
        </div>
      </CollapsibleSection>
    </div>
  );
}
