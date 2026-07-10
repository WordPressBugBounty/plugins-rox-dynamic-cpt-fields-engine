import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  MapPin,
  ChevronRight,
  Copy,
  Crown,
} from 'lucide-react';
import { usePostTypes } from '../../hooks/usePostTypes';
import { useTaxonomies } from '../../hooks/useTaxonomies';
import { useProStatus } from '../../hooks/use-pro-status';

// Location rule types
interface LocationRule {
  param: string;
  operator: string;
  value: string;
}

// Location rule group (AND logic within group)
type LocationRuleGroup = LocationRule[];

// Location param option type
interface LocationParamOption {
  value: string;
  label: string;
  group: string;
}

// Location param options for Free version
//
// `user_role` and `user_form` only resolve on user-management screens
// (Profile / Edit User / Add New User). For showing/hiding a field group
// based on the *currently logged-in viewer's* role across every screen,
// use the Pro `current_user_role` / `current_user_capability` params.
const FREE_LOCATION_PARAMS: LocationParamOption[] = [
  { value: 'post_type', label: 'Post Type', group: 'Post' },
  { value: 'post', label: 'Post', group: 'Post' },
  { value: 'post_status', label: 'Post Status', group: 'Post' },
  { value: 'taxonomy', label: 'Taxonomy', group: 'Term' },
  { value: 'term', label: 'Term', group: 'Term' },
  { value: 'user_form', label: 'User Form', group: 'User' },
  { value: 'user_role', label: 'User Role', group: 'User' },
  { value: 'options_page', label: 'Options Page', group: 'Options' },
];

// Pro location params (shown with PRO badge)
const PRO_LOCATION_PARAMS: LocationParamOption[] = [
  { value: 'page_template', label: 'Page Template', group: 'Post' },
  { value: 'post_parent', label: 'Post Parent', group: 'Post' },
  { value: 'post_author', label: 'Post Author', group: 'Post' },
  { value: 'post_format', label: 'Post Format', group: 'Post' },
  { value: 'post_taxonomy', label: 'Post Taxonomy Term', group: 'Post' },
  { value: 'current_user_role', label: 'Current User Role', group: 'User' },
  { value: 'current_user_capability', label: 'Current User Capability', group: 'User' },
];

// Location operators
const LOCATION_OPERATORS = [
  { value: '==', label: 'is equal to' },
  { value: '!=', label: 'is not equal to' },
];

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = true,
  badge
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="rdcfe-card rdcfe-overflow-visible">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rdcfe-w-full rdcfe-px-6 rdcfe-py-4 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-to-transparent hover:rdcfe-from-[hsl(var(--rdcfe-muted)/0.7)] rdcfe-transition-all rdcfe-rounded-t-xl"
      >
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
          <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))]">
            {icon}
          </div>
          <span className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">{title}</span>
          {badge && (
            <span className="rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight 
          className={`rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${isOpen ? 'rdcfe-rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="rdcfe-p-6 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// Props interface
interface LocationRulesBuilderProps {
  locations: LocationRuleGroup[];
  setLocations: React.Dispatch<React.SetStateAction<LocationRuleGroup[]>>;
}

/**
 * Detect whether any group contains duplicate `param` rules.
 * A duplicate same-param AND combination (e.g. `post_type = post` AND
 * `post_type = page`) can never be satisfied by a single context, so we treat
 * such state as broken and split it into OR groups.
 */
function hasDuplicateParams(groups: LocationRuleGroup[]): boolean {
  return groups.some((group: LocationRuleGroup) => {
    const params = group.map((rule: LocationRule) => rule.param);
    return new Set(params).size !== params.length;
  });
}

/**
 * Split any group that contains duplicate-param rules into separate OR groups.
 * The first occurrence of each param stays in the original group; every
 * subsequent rule with the same param becomes its own new OR group inserted
 * right after, preserving rule order. Idempotent.
 */
function normalizeLocations(groups: LocationRuleGroup[]): LocationRuleGroup[] {
  const result: LocationRuleGroup[] = [];

  groups.forEach((group: LocationRuleGroup) => {
    const seen = new Set<string>();
    const baseGroup: LocationRuleGroup = [];
    const overflow: LocationRuleGroup[] = [];

    group.forEach((rule: LocationRule) => {
      if (seen.has(rule.param)) {
        overflow.push([rule]);
      } else {
        seen.add(rule.param);
        baseGroup.push(rule);
      }
    });

    if (baseGroup.length > 0) {
      result.push(baseGroup);
    }
    overflow.forEach((g: LocationRuleGroup) => result.push(g));
  });

  return result.length > 0 ? result : groups;
}

export function LocationRulesBuilder({ 
  locations, 
  setLocations 
}: LocationRulesBuilderProps) {
  const { isPro } = useProStatus();
  const { data: postTypes } = usePostTypes();
  const { data: taxonomies } = useTaxonomies();

  // One-shot legacy migration on mount only.
  //
  // Old field groups saved before the smart-auto-OR fix may contain
  // impossible AND combinations like `post_type = post AND post_type = page`.
  // We split those into separate OR groups so the metabox actually shows up
  // where the user intended.
  //
  // IMPORTANT: this must run *only* on mount, not on every `locations`
  // change — otherwise adding a second rule via "+ Add Rule" can briefly
  // collide with an existing rule (same default param/value), and the
  // migration would yank that fresh rule out into its own OR group, making
  // it look like the button is creating OR groups instead of AND rules.
  useEffect(() => {
    if (hasDuplicateParams(locations)) {
      setLocations((prev: LocationRuleGroup[]) => normalizeLocations(prev));
    }
  }, []);

  // Get all available post types (built-in + custom)
  const availablePostTypes = [
    { slug: 'post', label: 'Post' },
    { slug: 'page', label: 'Page' },
    ...(postTypes?.map(pt => ({ slug: pt.slug, label: pt.title })) || []),
  ];

  // Get all available taxonomies (built-in + custom)
  const availableTaxonomies = [
    { slug: 'category', label: 'Category' },
    { slug: 'post_tag', label: 'Tag' },
    ...(taxonomies?.map(tax => ({ slug: tax.slug, label: tax.title })) || []),
  ];

  // Post status options
  const postStatuses = [
    { value: 'publish', label: 'Published' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'draft', label: 'Draft' },
    { value: 'future', label: 'Scheduled' },
    { value: 'private', label: 'Private' },
  ];

  // User form options.
  //
  // Maps to the WordPress user-management screens that fire dedicated
  // hooks: `user_new_form` (add), `edit_user_profile` (edit other users),
  // `show_user_profile` (own profile). The `all` wildcard simply means
  // "any of the three". Keep these slugs in sync with the form_type
  // values forwarded by `FieldGroupManager` to `LocationMatcher`.
  const userForms = [
    { value: 'all', label: 'All User Forms' },
    { value: 'add', label: 'Add New User' },
    { value: 'edit', label: 'Edit User' },
    { value: 'profile', label: 'Profile (Own)' },
  ];

  // User role options.
  //
  // Read from `window.rdcfeSettings.userRoles`, which the PHP side populates
  // via `wp_roles()->get_names()` plus an "All" wildcard. This means custom
  // roles registered by other plugins (WooCommerce, Bookmify, Amelia, etc.)
  // automatically show up in the dropdown without any code changes here.
  const localizedUserRoles =
    (window as { rdcfeSettings?: { userRoles?: { value: string; label: string }[] } })
      .rdcfeSettings?.userRoles;

  const userRoles =
    localizedUserRoles && localizedUserRoles.length > 0
      ? localizedUserRoles
      : [
          { value: 'all', label: 'All' },
          { value: 'administrator', label: 'Administrator' },
          { value: 'editor', label: 'Editor' },
          { value: 'author', label: 'Author' },
          { value: 'contributor', label: 'Contributor' },
          { value: 'subscriber', label: 'Subscriber' },
        ];

  // Get value options based on param type
  const getValueOptions = (param: string) => {
    switch (param) {
      case 'post_type':
        return availablePostTypes.map(pt => ({ value: pt.slug, label: pt.label }));
      case 'taxonomy':
        return availableTaxonomies.map(tax => ({ value: tax.slug, label: tax.label }));
      case 'post_status':
        return postStatuses;
      case 'user_role':
      case 'current_user_role':
        return userRoles;
      case 'user_form':
        return userForms;
      default:
        return [];
    }
  };

  // Check if param should have a text input instead of select
  const isTextInput = (param: string) => {
    return ['post', 'term', 'post_parent', 'post_author', 'page_template', 'options_page', 'current_user_capability'].includes(param);
  };

  // Check if param is Pro only
  const isProParam = (param: string) => {
    return PRO_LOCATION_PARAMS.some((p: LocationParamOption) => p.value === param);
  };

  // Sensible default value per param, used when seeding a new rule.
  const getDefaultValueForParam = (param: string): string => {
    switch (param) {
      case 'post_type':
        return 'post';
      case 'post_status':
        return 'publish';
      case 'taxonomy':
        return 'category';
      case 'user_role':
      case 'current_user_role':
        return 'all';
      case 'user_form':
        return 'all';
      default:
        return '';
    }
  };

  // Add a new rule to a group (Pro feature — gated in the UI).
  //
  // Multiple AND rules within a single group is a Pro capability; the free
  // build hides the "Add Rule" trigger entirely so this path is unreachable
  // for non-Pro users.
  //
  // We pick the first available param that's *not* already used in this
  // group so the new rule reads as a natural AND extension (e.g. adding
  // Post Status next to Post Type) instead of accidentally creating a
  // same-param duplicate the user didn't ask for.
  const addRule = (groupIndex: number) => {
    if ( ! isPro ) {
      return;
    }
    setLocations(prev => prev.map((group: LocationRuleGroup, idx: number) => {
      if (idx !== groupIndex) {
        return group;
      }

      const usedParams = new Set(group.map((r: LocationRule) => r.param));
      const candidates: LocationParamOption[] = [
        ...FREE_LOCATION_PARAMS,
        ...(isPro ? PRO_LOCATION_PARAMS : []),
      ];
      const nextParam =
        candidates.find((p: LocationParamOption) => ! usedParams.has(p.value)) ??
        FREE_LOCATION_PARAMS[0];

      return [
        ...group,
        {
          param: nextParam.value,
          operator: '==',
          value: getDefaultValueForParam(nextParam.value),
        },
      ];
    }));
  };

  // Update a rule in a group
  const updateRule = (groupIndex: number, ruleIndex: number, updates: Partial<LocationRule>) => {
    setLocations(prev => prev.map((group: LocationRuleGroup, gIdx: number) => {
      if (gIdx === groupIndex) {
        return group.map((rule: LocationRule, rIdx: number) => {
          if (rIdx === ruleIndex) {
            // If param changes, reset the value
            if (updates.param && updates.param !== rule.param) {
              const defaultOptions = getValueOptions(updates.param);
              return { 
                ...rule, 
                ...updates, 
                value: defaultOptions.length > 0 ? defaultOptions[0].value : '' 
              };
            }
            return { ...rule, ...updates };
          }
          return rule;
        });
      }
      return group;
    }));
  };

  // Remove a rule from a group
  const removeRule = (groupIndex: number, ruleIndex: number) => {
    setLocations(prev => prev.map((group: LocationRuleGroup, gIdx: number) => {
      if (gIdx === groupIndex) {
        // Don't remove if it's the last rule
        if (group.length === 1) return group;
        return group.filter((_: LocationRule, rIdx: number) => rIdx !== ruleIndex);
      }
      return group;
    }));
  };

  // Add a new OR group (Pro feature)
  const addGroup = () => {
    if (!isPro) return;
    setLocations(prev => [...prev, [{ param: 'post_type', operator: '==', value: 'post' }]]);
  };

  // Duplicate a group
  const duplicateGroup = (groupIndex: number) => {
    if (!isPro) return;
    setLocations(prev => {
      const newGroups = [...prev];
      const groupToCopy = prev[groupIndex].map((rule: LocationRule) => ({ ...rule }));
      newGroups.splice(groupIndex + 1, 0, groupToCopy);
      return newGroups;
    });
  };

  // Remove a group
  const removeGroup = (groupIndex: number) => {
    // Don't remove if it's the last group
    if (locations.length === 1) return;
    setLocations(prev => prev.filter((_: LocationRuleGroup, idx: number) => idx !== groupIndex));
  };

  // Generate human-readable summary
  const getLocationSummary = () => {
    const allParams = [...FREE_LOCATION_PARAMS, ...PRO_LOCATION_PARAMS];
    const groupSummaries = locations.map((group: LocationRuleGroup) => {
      const ruleSummaries = group.map((rule: LocationRule) => {
        const paramLabel = allParams.find((p: LocationParamOption) => p.value === rule.param)?.label || rule.param;
        const operatorLabel = rule.operator === '==' ? 'is' : 'is not';
        const valueOptions = getValueOptions(rule.param);
        const valueLabel = valueOptions.find((v: { value: string; label: string }) => v.value === rule.value)?.label || rule.value;
        return `${paramLabel} ${operatorLabel} "${valueLabel}"`;
      });
      return ruleSummaries.join(' AND ');
    });
    
    if (groupSummaries.length === 1) {
      return groupSummaries[0];
    }
    return groupSummaries.map((s: string, i: number) => `Group ${i + 1}: ${s}`).join(' OR ');
  };

  // Group params by category for the dropdown
  const groupedParams = () => {
    const groups: { [key: string]: { value: string; label: string; isPro?: boolean }[] } = {
      'Post': [],
      'Term': [],
      'User': [],
      'Options': [],
    };

    FREE_LOCATION_PARAMS.forEach((p: LocationParamOption) => {
      if (groups[p.group]) {
        groups[p.group].push({ value: p.value, label: p.label, isPro: false });
      }
    });

    PRO_LOCATION_PARAMS.forEach((p: LocationParamOption) => {
      if (groups[p.group]) {
        groups[p.group].push({ value: p.value, label: p.label, isPro: true });
      }
    });

    return groups;
  };

  const paramGroups = groupedParams();

  return (
    <CollapsibleSection 
      title="Location Rules" 
      icon={<MapPin className="rdcfe-w-5 rdcfe-h-5" />}
      badge={locations.length > 1 ? `${locations.length} groups` : `${locations[0]?.length || 0} rules`}
    >
      {/* Location Summary */}
      <div className="rdcfe-mb-5 rdcfe-p-4 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
        <div className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-uppercase rdcfe-tracking-wide rdcfe-mb-2">
          Show this field group if
        </div>
        <div className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
          {getLocationSummary() || 'No rules configured'}
        </div>
      </div>

      {/* Rule Groups */}
      <div className="rdcfe-space-y-4">
        {locations.map((group: LocationRuleGroup, groupIndex: number) => (
          <div key={groupIndex}>
            {/* OR separator between groups */}
            {groupIndex > 0 && (
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-my-4">
                <div className="rdcfe-flex-1 rdcfe-h-px rdcfe-bg-[hsl(var(--rdcfe-border))]" />
                <span className="rdcfe-px-3 rdcfe-py-1 rdcfe-text-[12px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-rounded-full rdcfe-uppercase">
                  or
                </span>
                <div className="rdcfe-flex-1 rdcfe-h-px rdcfe-bg-[hsl(var(--rdcfe-border))]" />
              </div>
            )}

            {/* Group Card */}
            <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-overflow-hidden">
              {/* Group Header */}
              {locations.length > 1 && (
                <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-4 rdcfe-py-2 rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border)/0.5)]">
                  <span className="rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    Rule Group {groupIndex + 1}
                  </span>
                  <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateGroup(groupIndex)}
                      disabled={!isPro}
                      className="rdcfe-p-1.5 rdcfe-rounded rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed"
                      title={isPro ? "Duplicate group" : "Pro feature"}
                    >
                      <Copy className="rdcfe-w-4 rdcfe-h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGroup(groupIndex)}
                      className="rdcfe-p-1.5 rdcfe-rounded rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(0_84%_50%)] hover:rdcfe-bg-[hsl(0_84%_96%)] rdcfe-transition-colors"
                      title="Remove group"
                    >
                      <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Rules */}
              <div className="rdcfe-p-4 rdcfe-space-y-3">
                {group.map((rule: LocationRule, ruleIndex: number) => {
                  const valueOptions = getValueOptions(rule.param);
                  const isText = isTextInput(rule.param);
                  const isParamPro = isProParam(rule.param);

                  return (
                    <div key={ruleIndex}>
                      {/* AND separator between rules */}
                      {ruleIndex > 0 && (
                        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-my-2 rdcfe-ml-4">
                          <span className="rdcfe-text-[11px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-uppercase">
                            and
                          </span>
                        </div>
                      )}

                      {/* Rule Row */}
                      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-flex-wrap">
                        {/* Param Select */}
                        <div className="rdcfe-flex-1 rdcfe-min-w-[180px]">
                          <select
                            value={rule.param}
                            onChange={(e) => {
                              const newParam = e.target.value;
                              if (isProParam(newParam) && !isPro) return;
                              updateRule(groupIndex, ruleIndex, { param: newParam });
                            }}
                            className="rdcfe-h-10 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-all focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)]"
                          >
                            {Object.entries(paramGroups).map(([groupName, params]) => (
                              <optgroup key={groupName} label={groupName}>
                                {params.map((p: { value: string; label: string; isPro?: boolean }) => (
                                  <option 
                                    key={p.value} 
                                    value={p.value}
                                    disabled={p.isPro && !isPro}
                                  >
                                    {p.label} {p.isPro && !isPro ? '(Pro)' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        {/* Operator Select */}
                        <div className="rdcfe-w-[130px]">
                          <select
                            value={rule.operator}
                            onChange={(e) => updateRule(groupIndex, ruleIndex, { operator: e.target.value })}
                            className="rdcfe-h-10 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-all focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)]"
                          >
                            {LOCATION_OPERATORS.map((op: { value: string; label: string }) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Value Input/Select */}
                        <div className="rdcfe-flex-1 rdcfe-min-w-[180px]">
                          {isText ? (
                            <input
                              type="text"
                              value={rule.value}
                              onChange={(e) => updateRule(groupIndex, ruleIndex, { value: e.target.value })}
                              placeholder={rule.param === 'post' ? 'Enter post ID or slug' : 'Enter value...'}
                              className="rdcfe-h-10 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-placeholder-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-all focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)]"
                            />
                          ) : (
                            <select
                              value={rule.value}
                              onChange={(e) => updateRule(groupIndex, ruleIndex, { value: e.target.value })}
                              className="rdcfe-h-10 rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-3 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-all focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)]"
                            >
                              {valueOptions.map((opt: { value: string; label: string }) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Pro Badge for Pro params */}
                        {isParamPro && (
                          <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-px-2 rdcfe-py-1 rdcfe-bg-gradient-to-r rdcfe-from-amber-500 rdcfe-to-orange-500 rdcfe-rounded rdcfe-text-white rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase">
                            <Crown className="rdcfe-w-3 rdcfe-h-3" />
                            Pro
                          </div>
                        )}

                        {/* Remove Rule Button */}
                        {group.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRule(groupIndex, ruleIndex)}
                            className="rdcfe-p-2 rdcfe-rounded-lg rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(0_84%_50%)] hover:rdcfe-bg-[hsl(0_84%_96%)] rdcfe-transition-colors"
                            title="Remove rule"
                          >
                            <Trash2 className="rdcfe-w-4 rdcfe-h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add Rule Button — Pro only.
                    Multiple AND rules within a group is a Pro capability; in
                    the free build the button is hidden entirely so the UI
                    stays focused on a single rule per group. */}
                {isPro && (
                  <button
                    type="button"
                    onClick={() => addRule(groupIndex)}
                    className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-[13px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary-hover))] rdcfe-transition-colors rdcfe-mt-2"
                  >
                    <Plus className="rdcfe-w-4 rdcfe-h-4" />
                    Add Rule
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add OR Group Button (Pro) */}
      <div className="rdcfe-mt-5 rdcfe-pt-5 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
        <button
          type="button"
          onClick={addGroup}
          disabled={!isPro}
          className={`rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-w-full rdcfe-py-3 rdcfe-rounded-xl rdcfe-border-2 rdcfe-border-dashed rdcfe-text-[14px] rdcfe-font-medium rdcfe-transition-all ${
            isPro 
              ? 'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-border-[hsl(var(--rdcfe-primary))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-[hsl(var(--rdcfe-primary)/0.05)]'
              : 'rdcfe-border-[hsl(var(--rdcfe-border)/0.5)] rdcfe-text-[hsl(var(--rdcfe-muted-foreground)/0.6)] rdcfe-cursor-not-allowed rdcfe-bg-[hsl(var(--rdcfe-muted)/0.2)]'
          }`}
        >
          <Plus className="rdcfe-w-4 rdcfe-h-4" />
          Add OR Rule Group
          {!isPro && (
            <span className="rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-text-[10px] rdcfe-font-semibold rdcfe-bg-gradient-to-r rdcfe-from-amber-500 rdcfe-to-orange-500 rdcfe-text-white rdcfe-rounded rdcfe-uppercase">
              Pro
            </span>
          )}
        </button>
        {!isPro && (
          <p className="rdcfe-text-center rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mt-2">
            OR groups allow you to show field groups when any group of rules matches
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}
