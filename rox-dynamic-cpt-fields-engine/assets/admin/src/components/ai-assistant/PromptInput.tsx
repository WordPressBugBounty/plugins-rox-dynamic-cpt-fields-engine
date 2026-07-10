/**
 * PromptInput - Multi-line prompt textarea + Pro option toggles.
 *
 * The prompt size is bounded server-side (`PromptBuilder` truncates at
 * 4000 chars), so we surface the live character count to the user and
 * highlight when they're close to the limit. The Pro option toggles
 * (queries / listings / relations) are disabled on Free sites because
 * the backend silently strips those slices anyway.
 *
 * @package DynamicCPTFieldsEngine
 */

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProContext } from '@/contexts/ProContext';

const MAX_PROMPT_CHARS = 4000;

interface PromptOptions {
  include_queries: boolean;
  include_listings: boolean;
  include_relations: boolean;
}

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  options: PromptOptions;
  onOptionsChange: (options: PromptOptions) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptInput({
  value,
  onChange,
  options,
  onOptionsChange,
  disabled,
  placeholder,
}: PromptInputProps) {
  const { isPro } = useProContext();
  const charsUsed = value.length;
  const overLimit = charsUsed > MAX_PROMPT_CHARS;

  const setOption = (key: keyof PromptOptions, next: boolean) => {
    onOptionsChange({ ...options, [key]: next });
  };

  const proSliceToggles: Array<{ key: keyof PromptOptions; label: string }> = [
    { key: 'include_queries', label: 'Queries' },
    { key: 'include_listings', label: 'Listings' },
    { key: 'include_relations', label: 'Relations' },
  ];

  return (
    <div className="rdcfe-space-y-3">
      <div className="rdcfe-relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={MAX_PROMPT_CHARS + 200}
          rows={6}
          placeholder={
            placeholder ||
            'Describe what you want — e.g. "Real estate website with properties (price, bedrooms, bathrooms, gallery), agents, property types and cities. Properties should be linked to agents."'
          }
          className={cn(
            'rdcfe-w-full rdcfe-rounded-xl rdcfe-border rdcfe-bg-white rdcfe-px-4 rdcfe-py-3 rdcfe-text-sm rdcfe-text-gray-900 rdcfe-leading-relaxed rdcfe-transition-colors focus:rdcfe-outline-none focus:rdcfe-ring-2',
            overLimit
              ? 'rdcfe-border-red-300 focus:rdcfe-border-red-400 focus:rdcfe-ring-red-500/20'
              : 'rdcfe-border-gray-200 focus:rdcfe-border-indigo-300 focus:rdcfe-ring-indigo-500/20',
            disabled && 'rdcfe-cursor-not-allowed rdcfe-bg-gray-50 rdcfe-text-gray-400'
          )}
        />
        <div className="rdcfe-pointer-events-none rdcfe-absolute rdcfe-bottom-2 rdcfe-right-3 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-xs">
          <span
            className={cn(
              'rdcfe-tabular-nums',
              overLimit ? 'rdcfe-text-red-500' : charsUsed > MAX_PROMPT_CHARS * 0.85 ? 'rdcfe-text-amber-500' : 'rdcfe-text-gray-400'
            )}
          >
            {charsUsed}/{MAX_PROMPT_CHARS}
          </span>
        </div>
      </div>

      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-x-4 rdcfe-gap-y-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-100 rdcfe-bg-gray-50/60 rdcfe-px-4 rdcfe-py-2.5">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-600">
          <Sparkles className="rdcfe-h-3.5 rdcfe-w-3.5 rdcfe-text-indigo-500" />
          Include in generation:
        </div>
        {proSliceToggles.map(({ key, label }) => (
          <label
            key={key}
            className={cn(
              'rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-text-xs',
              !isPro || disabled ? 'rdcfe-cursor-not-allowed rdcfe-opacity-60' : 'rdcfe-cursor-pointer'
            )}
          >
            <input
              type="checkbox"
              checked={isPro && Boolean(options[key])}
              onChange={(e) => setOption(key, e.target.checked)}
              disabled={!isPro || disabled}
              className="rdcfe-h-3.5 rdcfe-w-3.5 rdcfe-rounded rdcfe-border-gray-300 rdcfe-text-indigo-500 focus:rdcfe-ring-indigo-500/30 disabled:rdcfe-opacity-60"
            />
            <span className="rdcfe-font-medium rdcfe-text-gray-700">{label}</span>
            {!isPro && (
              <span className="rdcfe-rounded rdcfe-bg-indigo-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-text-[9px] rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-indigo-700">
                Pro
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export type { PromptOptions };
export default PromptInput;
