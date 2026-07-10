/**
 * TemplateCards - "Quick Start" preset template grid.
 *
 * Lists presets from `aiApi.listTemplates()` (`rdcfe_ai_register_templates`).
 * Each card loads starter copy into the AI Assistant **Prompt** so the user
 * can edit it and run **Generate Schema** (OpenAI) — no direct DB apply.
 *
 * @package DynamicCPTFieldsEngine
 */

import { Loader2, FileEdit, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AITemplate } from '@/services/api';

interface TemplateCardsProps {
  templates: AITemplate[];
  isLoading?: boolean;
  /** Fills the main Prompt box (same behaviour as the former “Draft” path). */
  onUseInPrompt: (template: AITemplate) => void;
  disabled?: boolean;
  /**
   * `stack` — single column (e.g. AI Assistant slide-over). Default
   * `grid` — responsive 1/2/3 columns for full-width pages.
   */
  layout?: 'grid' | 'stack';
}

export function TemplateCards({
  templates,
  isLoading,
  onUseInPrompt,
  disabled,
  layout = 'grid',
}: TemplateCardsProps) {
  if (isLoading) {
    return (
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-gray-200 rdcfe-bg-white rdcfe-py-12">
        <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin rdcfe-text-gray-400" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-12 rdcfe-text-center">
        <Sparkles className="rdcfe-mb-3 rdcfe-h-8 rdcfe-w-8 rdcfe-text-gray-300" />
        <p className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-600">No templates available</p>
        <p className="rdcfe-mt-1 rdcfe-text-xs rdcfe-text-gray-400">
          Pro plugins can register their own templates via the <code>rdcfe_ai_register_templates</code> action.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rdcfe-grid rdcfe-gap-3',
        layout === 'stack'
          ? 'rdcfe-grid-cols-1 rdcfe-w-full rdcfe-min-w-0'
          : 'rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 xl:rdcfe-grid-cols-3'
      )}
    >
      {templates.map((template) => {
        const summary = template.summary ?? [];

        return (
          <div
            key={template.id}
            className={cn(
              'rdcfe-flex rdcfe-min-w-0 rdcfe-flex-col rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-p-4 rdcfe-transition-all hover:rdcfe-border-indigo-200 hover:rdcfe-shadow-md',
              layout === 'stack' && 'rdcfe-w-full'
            )}
          >
            <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
              <div className="rdcfe-flex rdcfe-h-10 rdcfe-w-10 rdcfe-flex-shrink-0 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-bg-indigo-50 rdcfe-text-indigo-600">
                <Sparkles className="rdcfe-h-5 rdcfe-w-5" />
              </div>
              <div className="rdcfe-min-w-0 rdcfe-flex-1">
                <h4 className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">{template.label}</h4>
                <p className="rdcfe-mt-0.5 rdcfe-text-xs rdcfe-text-gray-500">{template.description}</p>
              </div>
            </div>

            {summary.length > 0 && (
              <ul className="rdcfe-mt-3 rdcfe-space-y-1 rdcfe-rounded-lg rdcfe-bg-gray-50 rdcfe-px-3 rdcfe-py-2">
                {summary.slice(0, 4).map((line, i) => (
                  <li key={i} className="rdcfe-flex rdcfe-items-start rdcfe-gap-1.5 rdcfe-text-[12px] rdcfe-text-gray-600">
                    <ChevronRight className="rdcfe-mt-0.5 rdcfe-h-3 rdcfe-w-3 rdcfe-flex-shrink-0 rdcfe-text-gray-400" />
                    <span className={layout === 'stack' ? 'rdcfe-min-w-0 rdcfe-break-words' : 'rdcfe-truncate'}>{line}</span>
                  </li>
                ))}
                {summary.length > 4 && (
                  <li className="rdcfe-pl-4 rdcfe-text-[11px] rdcfe-text-gray-400">+ {summary.length - 4} more</li>
                )}
              </ul>
            )}

            <div className="rdcfe-mt-auto rdcfe-pt-3">
              <button
                type="button"
                onClick={() => onUseInPrompt(template)}
                disabled={disabled}
                className="rdcfe-inline-flex rdcfe-w-full rdcfe-items-center rdcfe-justify-center rdcfe-gap-1.5 rdcfe-rounded-lg rdcfe-bg-indigo-500 rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-xs rdcfe-font-semibold rdcfe-text-white hover:rdcfe-bg-indigo-600 rdcfe-transition-colors disabled:rdcfe-cursor-not-allowed disabled:rdcfe-opacity-50"
                title="Copy this preset into the Prompt — edit it, then Generate Schema"
              >
                <FileEdit className="rdcfe-h-3.5 rdcfe-w-3.5" />
                Use in prompt
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TemplateCards;
