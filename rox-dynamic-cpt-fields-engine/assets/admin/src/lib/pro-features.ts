/**
 * Pro Features List
 *
 * Centralized list of all Pro-only features for consistent checking
 * across the application.
 *
 * @package DynamicCPTFieldsEngine
 */

/**
 * Pro-only field types
 */
export const PRO_FIELD_TYPES = [
  'group',
  'repeater',
  'gallery',
  'relationship',
  'taxonomy',
  'user',
  'tab',
  'accordion',
  'endpoint',
  'html',
] as const;

/**
 * Pro-only modules
 */
export const PRO_MODULES = [
  'query_builder',
  'listings',
  'relations',
  'visibility',
  'admin_columns',
  'admin_filters',
  'ai_assistant',
] as const;

/**
 * Pro-only field/form settings
 */
export const PRO_SETTINGS = [
  'conditional_logic',
  'regex_validation',
  'quick_edit',
  'revisions',
] as const;

/**
 * Pro-only location rules
 */
export const PRO_LOCATION_RULES = [
  'page_template',
  'post_parent',
  'post_author',
  'post_format',
  'post_taxonomy_term',
  'user_capability',
  'or_groups',
] as const;

/**
 * Type definitions
 */
export type ProFieldType = (typeof PRO_FIELD_TYPES)[number];
export type ProModule = (typeof PRO_MODULES)[number];
export type ProSetting = (typeof PRO_SETTINGS)[number];
export type ProLocationRule = (typeof PRO_LOCATION_RULES)[number];

export type FeatureCategory = 'field_type' | 'module' | 'setting' | 'location_rule';

/**
 * Pro features object structure (matches PHP)
 */
export interface ProFeaturesConfig {
  field_types: string[];
  modules: string[];
  settings: string[];
  location_rules: string[];
}

/**
 * Default Pro features (fallback if not provided by server)
 */
export const DEFAULT_PRO_FEATURES: ProFeaturesConfig = {
  field_types: [...PRO_FIELD_TYPES],
  modules: [...PRO_MODULES],
  settings: [...PRO_SETTINGS],
  location_rules: [...PRO_LOCATION_RULES],
};

/**
 * Feature descriptions for upgrade modal
 */
export const PRO_FEATURE_DESCRIPTIONS: Record<string, string> = {
  // Field types (Pro)
  group: 'Nested fields grouped as a single object',
  repeater: 'Repeatable rows of fields',
  gallery: 'Multiple image gallery picker',
  relationship: 'Link posts together dynamically',
  taxonomy: 'Advanced term picker',
  user: 'User selection field',
  tab: 'Group fields under tabs',
  accordion: 'Collapsible field sections',
  endpoint: 'Close Tab/Accordion groups',
  html: 'Custom HTML content display',

  // Modules
  query_builder: 'Build advanced WP_Query with visual interface',
  listings: 'Create dynamic listing templates',
  relations: 'Define one-to-one, one-to-many, and many-to-many relationships',
  visibility: 'Show/hide content based on conditions',
  admin_columns: 'Customize admin list columns',
  admin_filters: 'Add custom filters to admin lists',
  ai_assistant: 'AI-powered schema generation',

  // Settings
  conditional_logic: 'Show/hide fields based on other field values',
  regex_validation: 'Custom regex patterns for validation',
  quick_edit: 'Enable fields in Quick Edit',
  revisions: 'Track field value revisions',

  // Location rules
  page_template: 'Target specific page templates',
  post_parent: 'Target child/parent pages',
  post_author: 'Target by post author',
  post_format: 'Target by post format',
  post_taxonomy_term: 'Target posts with specific terms',
  user_capability: 'Target by user capability',
  or_groups: 'Use OR logic in location rules',
};

/**
 * Check if a field type is Pro-only
 */
export function isProFieldType(type: string): boolean {
  return PRO_FIELD_TYPES.includes(type as ProFieldType);
}

/**
 * Check if a module is Pro-only
 */
export function isProModule(module: string): boolean {
  return PRO_MODULES.includes(module as ProModule);
}

/**
 * Check if a setting is Pro-only
 */
export function isProSetting(setting: string): boolean {
  return PRO_SETTINGS.includes(setting as ProSetting);
}

/**
 * Check if a location rule is Pro-only
 */
export function isProLocationRule(rule: string): boolean {
  return PRO_LOCATION_RULES.includes(rule as ProLocationRule);
}

/**
 * Check if a feature is Pro-only by category
 */
export function isProFeature(
  feature: string,
  category: FeatureCategory
): boolean {
  switch (category) {
    case 'field_type':
      return isProFieldType(feature);
    case 'module':
      return isProModule(feature);
    case 'setting':
      return isProSetting(feature);
    case 'location_rule':
      return isProLocationRule(feature);
    default:
      return false;
  }
}

/**
 * Get feature description for upgrade modal
 */
export function getFeatureDescription(feature: string): string {
  return PRO_FEATURE_DESCRIPTIONS[feature] || `Unlock ${feature} with Pro`;
}

/**
 * Free tier limits
 */
export const FREE_LIMITS = {
  post_types: 3,
  taxonomies: 3,
  field_groups: 5,
  options_pages: 1,
} as const;

export type FreeLimitKey = keyof typeof FREE_LIMITS;

/**
 * Get the free limit for a resource type
 */
export function getFreeLimit(resource: FreeLimitKey): number {
  return FREE_LIMITS[resource];
}

/**
 * Check if free limit is reached
 */
export function isFreeLimitReached(resource: FreeLimitKey, currentCount: number): boolean {
  return currentCount >= FREE_LIMITS[resource];
}
