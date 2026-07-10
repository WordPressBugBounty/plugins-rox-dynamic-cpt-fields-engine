/**
 * SchemaPreview - JSON viewer / editor with copy + revalidate hooks.
 *
 * Doubles as a read-only viewer (after Generate / preset apply) and
 * a free-form editor when the user wants to tweak the schema before
 * Apply. Edits are debounced upstream — this component is purely
 * presentational and just emits `onChange` per keystroke.
 *
 * @package DynamicCPTFieldsEngine
 */

import { useState } from 'react';
import { Check, Copy, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AISchemaPayload } from '@/services/api';

interface SchemaPreviewProps {
  schema: Partial<AISchemaPayload> | null;
  text: string;
  onTextChange: (next: string) => void;
  parseError?: string | null;
  editable?: boolean;
  height?: string;
}

export function SchemaPreview({
  schema,
  text,
  onTextChange,
  parseError,
  editable = true,
  height = 'rdcfe-h-[420px]',
}: SchemaPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail in cross-origin iframes / restricted
      // browser modes — silently ignore, user can manually copy.
    }
  };

  return (
    <div className="rdcfe-flex rdcfe-h-full rdcfe-flex-col rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-overflow-hidden">
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-border-b rdcfe-border-gray-100 rdcfe-bg-gray-50 rdcfe-px-4 rdcfe-py-2.5">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
          <Code2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-gray-500" />
          <span className="rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-gray-600">
            Schema (JSON)
          </span>
          {parseError && (
            <span className="rdcfe-rounded rdcfe-bg-red-100 rdcfe-px-2 rdcfe-py-0.5 rdcfe-text-[10px] rdcfe-font-semibold rdcfe-uppercase rdcfe-text-red-700">
              Invalid JSON
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50 rdcfe-transition-colors"
        >
          {copied ? (
            <>
              <Check className="rdcfe-h-3 rdcfe-w-3 rdcfe-text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="rdcfe-h-3 rdcfe-w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {editable ? (
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          spellCheck={false}
          className={cn(
            'rdcfe-flex-1 rdcfe-resize-none rdcfe-bg-slate-900 rdcfe-px-4 rdcfe-py-3 rdcfe-font-mono rdcfe-text-xs rdcfe-leading-relaxed rdcfe-text-slate-100 focus:rdcfe-outline-none',
            height
          )}
        />
      ) : (
        <pre
          className={cn(
            'rdcfe-flex-1 rdcfe-overflow-auto rdcfe-bg-slate-900 rdcfe-px-4 rdcfe-py-3 rdcfe-font-mono rdcfe-text-xs rdcfe-leading-relaxed rdcfe-text-slate-100 rdcfe-whitespace-pre-wrap',
            height
          )}
        >
          {schema ? JSON.stringify(schema, null, 2) : ''}
        </pre>
      )}

      {parseError && (
        <div className="rdcfe-border-t rdcfe-border-red-100 rdcfe-bg-red-50 rdcfe-px-4 rdcfe-py-2 rdcfe-text-xs rdcfe-text-red-700">
          {parseError}
        </div>
      )}
    </div>
  );
}

export default SchemaPreview;
