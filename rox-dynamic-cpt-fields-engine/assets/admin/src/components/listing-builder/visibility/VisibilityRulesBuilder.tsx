/**
 * Visibility rules stack — AND/OR logic + add/remove rows.
 */

import { Eye, Plus } from 'lucide-react';
import type { SelectOption } from '../../ui';
import { Select } from '../../ui';
import { CollapsibleSection } from '../shared';
import type {
  ListingVisibilityConfig,
  ListingVisibilityLogic,
  ListingVisibilityRule,
  ListingVisibilityRuleType,
} from '../../../services/api';
import { VisibilityRuleRow, getDefaultVisibilityUserRoleSlug } from './VisibilityRule';

export interface VisibilityRulesBuilderProps {
  value: ListingVisibilityConfig | undefined;
  onChange: (next: ListingVisibilityConfig | undefined) => void;
  metaKeyOptions: SelectOption[];
  relationOptions: SelectOption[];
  title?: string;
  /** Extra hint under the header (context-specific). */
  hint?: string;
}

function createRule(type: ListingVisibilityRuleType): ListingVisibilityRule {
  switch (type) {
    case 'user_logged_in':
    case 'user_logged_out':
      return { type, value: true };
    case 'user_role':
      return { type, operator: 'is', value: getDefaultVisibilityUserRoleSlug() };
    case 'field_value':
      return { type, field: '', operator: '=', value: '' };
    case 'relation_exists':
      return { type, relation: '', operator: 'exists', direction: 'from' };
    case 'taxonomy_has':
      return { type, taxonomy: '', operator: 'has', value: '' };
    default:
      return { type: 'user_logged_in', value: true };
  }
}

const LOGIC_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All rules match (AND)' },
  { value: 'any', label: 'Any rule matches (OR)' },
];

export function VisibilityRulesBuilder({
  value,
  onChange,
  metaKeyOptions,
  relationOptions,
  title = 'Dynamic visibility',
  hint,
}: VisibilityRulesBuilderProps) {
  const enabled = !!value?.enabled;
  const logic: ListingVisibilityLogic = value?.logic === 'any' ? 'any' : 'all';
  const rules = value?.rules ?? [];

  const setSlice = (partial: Partial<ListingVisibilityConfig>) => {
    const merged: ListingVisibilityConfig = {
      enabled: true,
      logic: 'all',
      rules: [],
      ...value,
      ...partial,
    };
    if (!merged.enabled) {
      onChange(undefined);
      return;
    }
    onChange(merged);
  };

  const handleMasterToggle = (on: boolean) => {
    if (!on) {
      onChange(undefined);
      return;
    }
    onChange({
      enabled: true,
      logic: 'all',
      rules: [],
    });
  };

  const updateRule = (idx: number, next: ListingVisibilityRule) => {
    const nextRules = rules.map((r, i) => (i === idx ? next : r));
    setSlice({ rules: nextRules });
  };

  const removeRule = (idx: number) => {
    const nextRules = rules.filter((_, i) => i !== idx);
    setSlice({ rules: nextRules });
  };

  const addRule = () => {
    setSlice({ rules: [...rules, createRule('user_logged_in')] });
  };

  return (
    <CollapsibleSection title={title} icon={<Eye className="rdcfe-w-4 rdcfe-h-4" />} defaultOpen={enabled}>
      <div className="rdcfe-space-y-4">
        {hint && (
          <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            {hint}
          </p>
        )}

        <label className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-cursor-pointer">
          <input
            type="checkbox"
            className="rdcfe-rounded rdcfe-border-[hsl(var(--rdcfe-border))]"
            checked={enabled}
            onChange={(e) => handleMasterToggle(e.target.checked)}
          />
          <span className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
            Enable visibility rules
          </span>
        </label>

        {enabled && (
          <>
            <div className="rdcfe-max-w-md">
              <label className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-1.5">
                Match logic
              </label>
              <Select
                value={logic}
                onChange={(e) => setSlice({ logic: e.target.value as ListingVisibilityLogic })}
                options={LOGIC_OPTIONS}
              />
            </div>

            {rules.length > 0 && (
              <div className="rdcfe-space-y-3">
                {rules.map((rule, idx) => (
                  <VisibilityRuleRow
                    key={idx}
                    rule={rule}
                    metaKeyOptions={metaKeyOptions}
                    relationOptions={relationOptions}
                    onChange={(next) => updateRule(idx, next)}
                    onRemove={() => removeRule(idx)}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addRule}
              className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-py-2 rdcfe-rounded-md rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]"
            >
              <Plus className="rdcfe-w-4 rdcfe-h-4" />
              Add rule
            </button>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
