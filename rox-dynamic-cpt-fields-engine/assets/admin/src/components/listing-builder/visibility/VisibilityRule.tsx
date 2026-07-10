/**
 * Single visibility rule row — type-specific fields mirror Pro
 * {@see \RDCFE_Pro\Listings\Visibility\VisibilityEvaluator}.
 */

import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Input, Select, type SelectOption } from '../../ui';
import type { ListingVisibilityRule, ListingVisibilityRuleType } from '../../../services/api';

type SettingsWithRoles = {
  rdcfeSettings?: { userRoles?: Array<{ value: string; label: string }> };
};

const FALLBACK_WP_ROLES: SelectOption[] = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'editor', label: 'Editor' },
  { value: 'author', label: 'Author' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'subscriber', label: 'Subscriber' },
];

/**
 * Site roles from AdminAssets (`rdcfe_location_user_roles`). Omits `all` / empty
 * sentinels — the visibility evaluator requires a real role slug.
 */
export function getVisibilityUserRoleBaseOptions(): SelectOption[] {
  const localized = (window as SettingsWithRoles).rdcfeSettings?.userRoles;
  const filtered =
    localized && localized.length > 0
      ? localized.filter((r) => r.value !== 'all' && r.value !== '')
      : [];
  if (filtered.length > 0) {
    return filtered.map((r) => ({ value: r.value, label: r.label }));
  }
  return FALLBACK_WP_ROLES;
}

export function getDefaultVisibilityUserRoleSlug(): string {
  const opts = getVisibilityUserRoleBaseOptions();
  return opts[0]?.value ?? 'subscriber';
}

function buildVisibilityUserRoleSelectOptions(ruleValue: unknown): SelectOption[] {
  const base = getVisibilityUserRoleBaseOptions();
  const v = String(ruleValue ?? '');
  if (v && !base.some((o) => o.value === v)) {
    return [{ value: v, label: `${v} (custom)` }, ...base];
  }
  return base;
}

const RULE_TYPES: Array<{ value: ListingVisibilityRuleType; label: string }> = [
  { value: 'user_logged_in', label: 'User logged in' },
  { value: 'user_logged_out', label: 'User logged out' },
  { value: 'user_role', label: 'User role' },
  { value: 'field_value', label: 'Field value' },
  { value: 'relation_exists', label: 'Relation exists' },
  { value: 'taxonomy_has', label: 'Taxonomy / term' },
];

const BOOL_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const ROLE_OP_OPTIONS: SelectOption[] = [
  { value: 'is', label: 'Is' },
  { value: 'is_not', label: 'Is not' },
];

const FIELD_OP_OPTIONS: SelectOption[] = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'contains', label: 'Contains' },
  { value: 'empty', label: 'Empty' },
];

const REL_OP_OPTIONS: SelectOption[] = [
  { value: 'exists', label: 'Exists' },
  { value: 'not_exists', label: 'Does not exist' },
];

const REL_DIR_OPTIONS: SelectOption[] = [
  { value: 'from', label: 'From (children)' },
  { value: 'to', label: 'To (parents)' },
];

const TAX_OP_OPTIONS: SelectOption[] = [
  { value: 'has', label: 'Has term' },
  { value: 'not_has', label: 'Does not have term' },
];

export interface VisibilityRuleProps {
  rule: ListingVisibilityRule;
  metaKeyOptions: SelectOption[];
  relationOptions: SelectOption[];
  onChange: (next: ListingVisibilityRule) => void;
  onRemove: () => void;
}

function RuleFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="rdcfe-text-[11px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-block rdcfe-mb-1.5">
      {children}
    </label>
  );
}

export function VisibilityRuleRow({
  rule,
  metaKeyOptions,
  relationOptions,
  onChange,
  onRemove,
}: VisibilityRuleProps) {
  const userRoleSelectOptions = useMemo(
    () =>
      rule.type === 'user_role'
        ? buildVisibilityUserRoleSelectOptions(rule.value)
        : buildVisibilityUserRoleSelectOptions(''),
    [rule.type, rule.value]
  );

  const typeOptions: SelectOption[] = RULE_TYPES.map((r) => ({
    value: r.value,
    label: r.label,
  }));

  const patch = (partial: Partial<ListingVisibilityRule>) => {
    onChange({ ...rule, ...partial });
  };

  const handleTypeChange = (nextType: ListingVisibilityRuleType) => {
    switch (nextType) {
      case 'user_logged_in':
      case 'user_logged_out':
        onChange({ type: nextType, value: true });
        break;
      case 'user_role':
        onChange({ type: nextType, operator: 'is', value: getDefaultVisibilityUserRoleSlug() });
        break;
      case 'field_value':
        onChange({ type: nextType, field: '', operator: '=', value: '' });
        break;
      case 'relation_exists':
        onChange({ type: nextType, relation: '', operator: 'exists', direction: 'from' });
        break;
      case 'taxonomy_has':
        onChange({ type: nextType, taxonomy: '', operator: 'has', value: '' });
        break;
      default:
        onChange({ type: 'user_logged_in', value: true });
    }
  };

  return (
    <div className="rdcfe-relative rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.15)] rdcfe-p-4">
      <button
        type="button"
        title="Remove rule"
        onClick={onRemove}
        className="rdcfe-absolute rdcfe-top-3 rdcfe-right-3 rdcfe-w-8 rdcfe-h-8 rdcfe-flex-shrink-0 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_97%)] rdcfe-transition-colors"
      >
        <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
      </button>

      <div className="rdcfe-pr-10 rdcfe-space-y-3">
        <div>
          <RuleFieldLabel>Rule type</RuleFieldLabel>
          <Select
            value={rule.type}
            onChange={(e) => handleTypeChange(e.target.value as ListingVisibilityRuleType)}
            options={typeOptions}
          />
        </div>

      {(rule.type === 'user_logged_in' || rule.type === 'user_logged_out') && (
        <div>
          <RuleFieldLabel>Expected</RuleFieldLabel>
          <Select
            value={rule.value === false ? 'false' : 'true'}
            onChange={(e) => patch({ value: e.target.value === 'true' })}
            options={BOOL_OPTIONS}
          />
        </div>
      )}

      {rule.type === 'user_role' && (
        <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 rdcfe-gap-3">
          <div>
            <RuleFieldLabel>Operator</RuleFieldLabel>
            <Select
              value={(rule.operator as string) || 'is'}
              onChange={(e) => patch({ operator: e.target.value })}
              options={ROLE_OP_OPTIONS}
            />
          </div>
          <div>
            <RuleFieldLabel>Role slug</RuleFieldLabel>
            <Select
              value={
                userRoleSelectOptions.some((o) => o.value === String(rule.value ?? ''))
                  ? String(rule.value ?? '')
                  : userRoleSelectOptions[0]?.value ?? ''
              }
              onChange={(e) => patch({ value: e.target.value })}
              options={userRoleSelectOptions}
            />
          </div>
        </div>
      )}

      {rule.type === 'field_value' && (
        <div className="rdcfe-space-y-3">
          <div>
            <RuleFieldLabel>Meta field</RuleFieldLabel>
            <Select
              value={
                metaKeyOptions.some((o) => o.value === (rule.field ?? ''))
                  ? String(rule.field ?? '')
                  : '__custom__'
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__custom__') {
                  patch({ field: '' });
                } else {
                  patch({ field: v });
                }
              }}
              options={[
                { value: '__custom__', label: 'Custom key…' },
                ...metaKeyOptions,
              ]}
            />
            {(!rule.field || !metaKeyOptions.some((o) => o.value === rule.field)) && (
              <Input
                className="rdcfe-mt-2"
                value={String(rule.field ?? '')}
                onChange={(e) => patch({ field: e.target.value })}
                placeholder="meta_key"
              />
            )}
          </div>
          <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 rdcfe-gap-3">
            <div>
              <RuleFieldLabel>Operator</RuleFieldLabel>
              <Select
                value={String(rule.operator ?? '=')}
                onChange={(e) => patch({ operator: e.target.value })}
                options={FIELD_OP_OPTIONS}
              />
            </div>
            <div>
              <RuleFieldLabel>Value</RuleFieldLabel>
              <Input
                value={String(rule.operator === 'empty' ? '' : (rule.value ?? ''))}
                disabled={rule.operator === 'empty'}
                onChange={(e) => patch({ value: e.target.value })}
                placeholder="Compare to…"
              />
            </div>
          </div>
        </div>
      )}

      {rule.type === 'relation_exists' && (
        <div className="rdcfe-space-y-3">
          <div>
            <RuleFieldLabel>Relation</RuleFieldLabel>
            <Select
              placeholder="Pick relation…"
              value={
                relationOptions.some((o) => o.value === (rule.relation ?? ''))
                  ? String(rule.relation ?? '')
                  : '__custom__'
              }
              onChange={(e) => {
                const v = e.target.value;
                patch({ relation: v === '__custom__' ? '' : v });
              }}
              options={[
                { value: '__custom__', label: 'Custom slug…' },
                ...relationOptions,
              ]}
            />
            {(!rule.relation || !relationOptions.some((o) => o.value === rule.relation)) && (
              <Input
                className="rdcfe-mt-2"
                value={String(rule.relation ?? '')}
                onChange={(e) => patch({ relation: e.target.value })}
                placeholder="relation_slug"
              />
            )}
          </div>
          <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 rdcfe-gap-3">
            <div>
              <RuleFieldLabel>Operator</RuleFieldLabel>
              <Select
                value={String(rule.operator ?? 'exists')}
                onChange={(e) => patch({ operator: e.target.value })}
                options={REL_OP_OPTIONS}
              />
            </div>
            <div>
              <RuleFieldLabel>Direction</RuleFieldLabel>
              <Select
                value={String(rule.direction ?? 'from')}
                onChange={(e) => patch({ direction: e.target.value as 'from' | 'to' })}
                options={REL_DIR_OPTIONS}
              />
            </div>
          </div>
        </div>
      )}

      {rule.type === 'taxonomy_has' && (
        <div className="rdcfe-space-y-3">
          <div className="rdcfe-grid rdcfe-grid-cols-1 sm:rdcfe-grid-cols-2 rdcfe-gap-3">
            <div>
              <RuleFieldLabel>Taxonomy</RuleFieldLabel>
              <Input
                value={String(rule.taxonomy ?? '')}
                onChange={(e) => patch({ taxonomy: e.target.value })}
                placeholder="category"
              />
            </div>
            <div>
              <RuleFieldLabel>Operator</RuleFieldLabel>
              <Select
                value={String(rule.operator ?? 'has')}
                onChange={(e) => patch({ operator: e.target.value })}
                options={TAX_OP_OPTIONS}
              />
            </div>
          </div>
          <div>
            <RuleFieldLabel>Term slug or ID</RuleFieldLabel>
            <Input
              value={String(rule.value ?? '')}
              onChange={(e) => patch({ value: e.target.value })}
              placeholder="Leave empty to require any term in taxonomy"
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
