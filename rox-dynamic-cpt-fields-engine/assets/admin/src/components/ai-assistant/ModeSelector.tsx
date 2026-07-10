/**
 * ModeSelector - The 3 AI mode tabs (Create / Modify / Fix).
 *
 * Mirrors `\RDCFE_Pro\AI\PromptBuilder::MODES` and the `AIMode` type
 * exported from `services/api`. Selecting a mode swaps the prompt
 * helper text and (in Modify mode) reveals the context selector.
 *
 * @package DynamicCPTFieldsEngine
 */

import { Sparkles, Wrench, FileEdit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIMode } from '@/services/api';

interface ModeOption {
  id: AIMode;
  label: string;
  description: string;
  icon: LucideIcon;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'create_new',
    label: 'Create New',
    description: 'Start from scratch — describe what you want.',
    icon: Sparkles,
  },
  {
    id: 'modify_existing',
    label: 'Modify Existing',
    description: 'Patch an existing CPT, taxonomy, or field group.',
    icon: FileEdit,
  },
  {
    id: 'fix_schema',
    label: 'Fix Schema',
    description: 'Repair a broken or partial JSON schema.',
    icon: Wrench,
  },
];

interface ModeSelectorProps {
  value: AIMode;
  onChange: (mode: AIMode) => void;
  disabled?: boolean;
}

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-3 rdcfe-gap-3">
      {MODE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => !disabled && onChange(option.id)}
            disabled={disabled}
            className={cn(
              'rdcfe-relative rdcfe-flex rdcfe-flex-col rdcfe-items-start rdcfe-gap-2 rdcfe-rounded-xl rdcfe-border rdcfe-px-4 rdcfe-py-3 rdcfe-text-left rdcfe-transition-all',
              isActive
                ? 'rdcfe-border-indigo-300 rdcfe-bg-indigo-50 rdcfe-ring-2 rdcfe-ring-indigo-500/20'
                : 'rdcfe-border-gray-200 rdcfe-bg-white hover:rdcfe-border-gray-300 hover:rdcfe-bg-gray-50',
              disabled && 'rdcfe-cursor-not-allowed rdcfe-opacity-50'
            )}
          >
            <div
              className={cn(
                'rdcfe-flex rdcfe-h-8 rdcfe-w-8 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg',
                isActive ? 'rdcfe-bg-indigo-500 rdcfe-text-white' : 'rdcfe-bg-gray-100 rdcfe-text-gray-500'
              )}
            >
              <Icon className="rdcfe-h-4 rdcfe-w-4" />
            </div>
            <div>
              <div className={cn('rdcfe-text-sm rdcfe-font-semibold', isActive ? 'rdcfe-text-indigo-900' : 'rdcfe-text-gray-900')}>
                {option.label}
              </div>
              <div className={cn('rdcfe-mt-0.5 rdcfe-text-xs', isActive ? 'rdcfe-text-indigo-700' : 'rdcfe-text-gray-500')}>
                {option.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ModeSelector;
