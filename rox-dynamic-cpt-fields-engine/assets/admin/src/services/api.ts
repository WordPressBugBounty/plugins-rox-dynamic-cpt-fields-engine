/**
 * API Service for RDCFE REST endpoints.
 */

// Get settings from WordPress localized script
const getSettings = () => {
  return window.rdcfeSettings || {
    restUrl: '/wp-json/dcfe/v1/',
    nonce: '',
    version: '1.0.0',
    debugMode: false,
  };
};

/**
 * Update the in-memory nonce so subsequent requests use the fresh value.
 *
 * WordPress nonces have a 12–24h lifetime and the `wordpress_logged_in_*`
 * cookie can also rotate while a tab stays open. To survive both cases we
 * mutate `window.rdcfeSettings.nonce` whenever WP hands us a refreshed token.
 */
const updateNonce = (nonce: string): void => {
  if (!nonce) {
    return;
  }
  if (window.rdcfeSettings) {
    window.rdcfeSettings.nonce = nonce;
  }
};

/**
 * Codes WP core / our middleware emit when the REST nonce is no longer valid.
 *
 * `rest_cookie_invalid_nonce` comes from `wp-includes/rest-api.php` (auth
 * cookie scheme), `rest_invalid_nonce` is what our `CapabilityCheck`
 * middleware returns.
 */
const STALE_NONCE_CODES = new Set([
  'rest_cookie_invalid_nonce',
  'rest_invalid_nonce',
]);

let pendingNonceRefresh: Promise<string | null> | null = null;

/**
 * Fetch a brand-new `wp_rest` nonce from WordPress' built-in
 * `admin-ajax.php?action=rest-nonce` endpoint. Multiple concurrent failed
 * requests share the same in-flight refresh so we only ask WP once.
 */
const refreshNonce = async (): Promise<string | null> => {
  if (pendingNonceRefresh) {
    return pendingNonceRefresh;
  }

  const settings = getSettings();
  const refreshUrl =
    settings.restNonceUrl ||
    (settings.ajaxUrl ? `${settings.ajaxUrl}?action=rest-nonce` : '/wp-admin/admin-ajax.php?action=rest-nonce');

  pendingNonceRefresh = (async () => {
    try {
      const response = await fetch(refreshUrl, {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        return null;
      }
      const text = (await response.text()).trim();
      if (!text || text === '0' || text === '-1') {
        return null;
      }
      updateNonce(text);
      return text;
    } catch {
      return null;
    } finally {
      pendingNonceRefresh = null;
    }
  })();

  return pendingNonceRefresh;
};

interface ApiResponse<T> {
  data: T;
  status: number;
  success: boolean;
  message?: string;
}

interface ApiError {
  code: string;
  message: string;
  data?: {
    status: number;
    /**
     * Two distinct error-bag shapes WP REST emits:
     *   1. `errors`: legacy shape used by older endpoints
     *      `[ { field, message } ]`.
     *   2. The  `\RDCFE\Schema\ValidationResult::to_array()` shape
     *      used by every config validator (post types, taxonomies, field
     *      groups, queries, …): top-level `valid: false` plus
     *      `errors: [ { path, message, code } ]`. We render this when
     *      present so the user sees "orderby: invalid value" instead of
     *      a generic "Validation failed."
     */
    errors?: Array<{ field?: string; path?: string; message: string; code?: string }>;
    valid?: boolean;
    warnings?: Array<{ path?: string; message: string; code: string }>;
  };
}

/**
 * REST returned HTTP 409 with code ai_warnings_unacknowledged — schema is
 * valid but slug conflicts / unknown references must be acknowledged before apply.
 */
export class AiWarningsUnacknowledgedError extends Error {
  readonly warnings: Array<{ path?: string; message: string; code: string }>;

  constructor(
    message: string,
    warnings: Array<{ path?: string; message: string; code: string }>
  ) {
    super(message);
    this.name = 'AiWarningsUnacknowledgedError';
    this.warnings = warnings;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Perform a single REST request, layering the current nonce in.
 */
async function performFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  const settings = getSettings();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-WP-Nonce': settings.nonce,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? 'same-origin',
  });
}

/**
 * Make an API request to the RDCFE REST endpoint.
 *
 * Two resilience layers are baked in:
 *   1. Every successful response refreshes our cached nonce from the
 *      `X-WP-Nonce` response header WP core emits on authenticated calls.
 *   2. If the request fails with `rest_cookie_invalid_nonce` or our own
 *      `rest_invalid_nonce`, we transparently fetch a fresh nonce and retry
 *      once before bubbling the error up to the UI.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const settings = getSettings();
  const url = `${settings.restUrl}${endpoint}`;

  try {
    let response = await performFetch(url, options);
    let refreshedNonce = response.headers.get('X-WP-Nonce');

    if (!response.ok && response.status === 403) {
      const cloned = response.clone();
      let errorBody: ApiError | null = null;
      try {
        errorBody = (await cloned.json()) as ApiError;
      } catch {
        errorBody = null;
      }

      if (errorBody && STALE_NONCE_CODES.has(errorBody.code)) {
        const freshNonce = await refreshNonce();
        if (freshNonce) {
          response = await performFetch(url, options);
          refreshedNonce = response.headers.get('X-WP-Nonce') || refreshedNonce;
        }
      }
    }

    if (refreshedNonce) {
      updateNonce(refreshedNonce);
    }

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;

      // Surface the actual validation failures when WP returns the
      // ValidationResult bag — otherwise a "Validation failed." top
      // line with no per-field detail is genuinely useless to the
      // user (and forces a network-tab dive every time).
      const validationDetails = error?.data?.errors;
      let detailedMessage = error?.message || 'An error occurred';
      if (Array.isArray(validationDetails) && validationDetails.length) {
        const lines = validationDetails
          .slice(0, 5)
          .map((item) => {
            const where = item.path || item.field || '';
            return where ? `${where}: ${item.message}` : item.message;
          })
          .join('; ');
        const overflow =
          validationDetails.length > 5 ? ` (+${validationDetails.length - 5} more)` : '';
        detailedMessage = `${detailedMessage} — ${lines}${overflow}`;
      }

      const message =
        error?.code && STALE_NONCE_CODES.has(error.code)
          ? 'Your session has expired. Please reload the page and try again.'
          : detailedMessage;

      if (error.code === 'ai_warnings_unacknowledged') {
        const raw = error?.data?.warnings;
        const warnings = Array.isArray(raw)
          ? raw.map((w) => ({
              path: typeof w?.path === 'string' ? w.path : undefined,
              message: typeof w?.message === 'string' ? w.message : '',
              code: typeof w?.code === 'string' ? w.code : '',
            }))
          : [];
        throw new AiWarningsUnacknowledgedError(
          typeof error.message === 'string' && error.message ? error.message : message,
          warnings
        );
      }

      throw new Error(message);
    }

    return {
      data: data as T,
      status: response.status,
      success: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error( 'An unexpected error occurred', { cause: error } );
  }
}

/**
 * GET request
 */
export function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export function post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 */
export function put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
export function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// Specific API methods for each resource type.

export interface PostTypeConfig {
  id: number;
  title: string;
  slug: string;
  config_type?: string;
  schema?: {
    type: 'post_type';
    slug: string;
    labels: Record<string, string>;
    args: Record<string, unknown>;
  };
  data?: {
    slug?: string;
    label?: string;
    singular_label?: string;
    description?: string;
    public?: boolean;
    hierarchical?: boolean;
    has_archive?: boolean;
    show_in_rest?: boolean;
    supports?: string[];
    menu_icon?: string;
    menu_position?: number;
    [key: string]: unknown;
  };
  status: string;
  schema_version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaxonomyConfig {
  id: number;
  title: string;
  slug: string;
  config_type?: string;
  schema?: {
    type: 'taxonomy';
    slug: string;
    object_type: string[];
    labels: Record<string, string>;
    args: Record<string, unknown>;
  };
  data?: {
    slug?: string;
    label?: string;
    singular_label?: string;
    description?: string;
    post_types?: string[];
    public?: boolean;
    hierarchical?: boolean;
    show_in_rest?: boolean;
    show_admin_column?: boolean;
    show_tagcloud?: boolean;
    [key: string]: unknown;
  };
  status: string;
  schema_version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MetaboxConfig {
  id: number;
  title: string;
  slug?: string;
  config_type?: string;
  schema?: {
    type: 'field_group';
    locations: Array<Array<{ param: string; operator: string; value: string }>>;
    fields: Array<{
      name: string;
      type: string;
      label: string;
      args?: Record<string, unknown>;
    }>;
  };
  data?: {
    title?: string;
    location?: string;
    position?: string;
    style?: string;
    fields?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  status: string;
  schema_version?: string;
  created_at?: string;
  updated_at?: string;
}

// Alias for backward compatibility
export type FieldGroupConfig = MetaboxConfig;

export interface OptionsPageConfig {
  id: number;
  title: string;
  slug?: string;
  config_type?: string;
  schema?: {
    type: 'options_page';
    menu_title: string;
    menu_slug: string;
    capability: string;
    position?: number;
    icon?: string;
  };
  data?: {
    page_title?: string;
    menu_title?: string;
    menu_slug?: string;
    icon_url?: string;
    parent_slug?: string;
    capability?: string;
    redirect?: boolean;
    position?: number;
    [key: string]: unknown;
  };
  status: string;
  schema_version?: string;
  created_at?: string;
  updated_at?: string;
}

// Post Types API
export const postTypesApi = {
  getAll: () => get<PostTypeConfig[]>('post-types'),
  get: (id: number) => get<PostTypeConfig>(`post-types/${id}`),
  create: (data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    post<PostTypeConfig>('post-types', data),
  update: (id: number, data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    put<PostTypeConfig>(`post-types/${id}`, data),
  delete: (id: number) => del<{ success: boolean }>(`post-types/${id}`),
  duplicate: (id: number, title: string) =>
    post<PostTypeConfig>(`post-types/${id}/duplicate`, { title }),
  toggleStatus: (id: number, status: 'publish' | 'draft') =>
    put<{ id: number; status: string }>(`post-types/${id}/status`, { status }),
};

// Taxonomies API
export const taxonomiesApi = {
  getAll: () => get<TaxonomyConfig[]>('taxonomies'),
  get: (id: number) => get<TaxonomyConfig>(`taxonomies/${id}`),
  create: (data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    post<TaxonomyConfig>('taxonomies', data),
  update: (id: number, data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    put<TaxonomyConfig>(`taxonomies/${id}`, data),
  delete: (id: number) => del<{ success: boolean }>(`taxonomies/${id}`),
  duplicate: (id: number, title: string) =>
    post<TaxonomyConfig>(`taxonomies/${id}/duplicate`, { title }),
  toggleStatus: (id: number, status: 'publish' | 'draft') =>
    put<{ id: number; status: string }>(`taxonomies/${id}/status`, { status }),
};

// Metaboxes API (Field Groups in backend)
export const metaboxesApi = {
  getAll: () => get<MetaboxConfig[]>('field-groups'),
  get: (id: number) => get<MetaboxConfig>(`field-groups/${id}`),
  create: (data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    post<MetaboxConfig>('field-groups', data),
  update: (id: number, data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    put<MetaboxConfig>(`field-groups/${id}`, data),
  delete: (id: number) => del<{ success: boolean }>(`field-groups/${id}`),
  duplicate: (id: number, title: string) =>
    post<MetaboxConfig>(`field-groups/${id}/duplicate`, { title }),
  toggleStatus: (id: number, status: 'publish' | 'draft') =>
    put<{ id: number; status: string }>(`field-groups/${id}/status`, { status }),
};

// Alias for backward compatibility
export const fieldGroupsApi = metaboxesApi;

// Options Pages API
export const optionsPagesApi = {
  getAll: () => get<OptionsPageConfig[]>('options-pages'),
  get: (id: number) => get<OptionsPageConfig>(`options-pages/${id}`),
  create: (data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    post<OptionsPageConfig>('options-pages', data),
  update: (id: number, data: { title: string; data: Record<string, unknown>; status?: 'publish' | 'draft' }) =>
    put<OptionsPageConfig>(`options-pages/${id}`, data),
  delete: (id: number) => del<{ success: boolean }>(`options-pages/${id}`),
  duplicate: (id: number, title: string) =>
    post<OptionsPageConfig>(`options-pages/${id}/duplicate`, { title }),
  toggleStatus: (id: number, status: 'publish' | 'draft') =>
    put<{ id: number; status: string }>(`options-pages/${id}/status`, { status }),
};

// Health Check API
export const healthApi = {
  check: () => get<{ status: string; version: string; time: string }>('health'),
};

// Import/Export Types
export interface ExportData {
  version: string;
  plugin: string;
  generated: string;
  site_url: string;
  configs: {
    post_type?: Array<Record<string, unknown>>;
    taxonomy?: Array<Record<string, unknown>>;
    field_group?: Array<Record<string, unknown>>;
    options_page?: Array<Record<string, unknown>>;
  };
  summary: {
    total: number;
    post_types: number;
    taxonomies: number;
    field_groups: number;
    options_pages: number;
  };
}

export interface ExportResponse {
  success: boolean;
  filename: string;
  data: ExportData;
}

export interface ImportValidation {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    type?: string;
    index?: number;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    type?: string;
    index?: number;
  }>;
  valid_items: Record<string, number>;
}

export interface ImportResult {
  success: boolean;
  dry_run: boolean;
  message: string;
  validation: ImportValidation;
  imported: Array<{
    type: string;
    slug: string;
    title: string;
    id: number;
    action: string;
  }>;
  updated: Array<{
    type: string;
    slug: string;
    title: string;
    id: number;
    action: string;
  }>;
  skipped: Array<{
    type: string;
    slug: string;
    title: string;
  }>;
  failed: Array<{
    type: string;
    slug: string;
    title: string;
    action: string;
    error: string;
  }>;
  summary?: {
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    total: number;
  };
}

/** Pro — field-level change row from import diff. */
export interface ImportDiffChange {
  path: string;
  before: unknown;
  after: unknown;
}

/** Pro — one config row in the import diff. */
export interface ImportDiffItem {
  key: string;
  type: string;
  slug: string;
  title: string;
  import_title: string;
  status_category: 'new' | 'unchanged' | 'modified';
  existing_id: number | null;
  change_count: number;
  changes: ImportDiffChange[];
  changes_total: number;
  changes_truncated: boolean;
}

/** Pro — `POST /tools/import-diff` response body. */
export interface ImportDiffResponse {
  success: boolean;
  validation: ImportValidation;
  summary: {
    new: number;
    modified: number;
    unchanged: number;
  };
  items: ImportDiffItem[];
  message: string;
}

export type ImportResolutionAction = 'overwrite' | 'skip' | 'rename' | 'keep';

export interface ImportResolutionPayload {
  action: ImportResolutionAction;
  new_slug?: string;
}

export interface SnapshotListEntry {
  id: string;
  created_at: string;
  label: string;
  source: string | null;
  summary: Record<string, unknown>;
}

export interface SnapshotsListResponse {
  retention: number;
  snapshots: SnapshotListEntry[];
}

export interface SnapshotDetailResponse {
  id: string;
  created_at: string;
  label: string;
  source: string | null;
  summary: Record<string, unknown>;
  export: ExportData;
}

// Plugin Settings types and API
export interface PluginSettings {
  auto_flush_rewrite: boolean;
  clean_uninstall: boolean;
  debug_mode: boolean;
}

interface SettingsEnvelope {
  success: boolean;
  data: PluginSettings;
}

export const settingsApi = {
  get: () => get<SettingsEnvelope>('settings'),
  update: (settings: Partial<PluginSettings>) =>
    post<SettingsEnvelope>('settings', settings),
};

// ===========================================
// License (Pro)
// ===========================================

/**
 * Public (browser-safe) view of the license state. Mirrors
 * `\RDCFE_Pro\Admin\License\LicenseManager::to_public_array()` — the raw
 * key is NEVER returned, only a masked preview plus status flags.
 *
 * The `/license` route family is registered by the Pro plugin, so these
 * calls only resolve when Pro is active (the React tab is gated on `isPro`).
 */
export interface LicensePublic {
  /** `'valid'` once both a key and server checksum are stored. */
  status: 'valid' | 'invalid';
  /** Whether a license key has been saved. */
  has_key: boolean;
  /** Masked key, last 4 chars visible (e.g. `••••••AB12`). Empty when unset. */
  masked_key: string;
}

/** Response shape for the activate / deactivate actions. */
export interface LicenseActionResult {
  status: 'valid' | 'invalid';
  message: string;
}

export const licenseApi = {
  /** Current status + masked key. */
  get: () => get<LicensePublic>('license'),
  /** Activate a license key against the remote license server. */
  activate: (licenseKey: string) =>
    post<LicenseActionResult>('license/activate', { license_key: licenseKey }),
  /** Deactivate the stored license locally. */
  deactivate: () => post<LicenseActionResult>('license/deactivate', {}),
};

// ===========================================
// Query Builder (Pro)
// ===========================================

/**
 * Saved-query config schema mirrored from PHP `QueryValidator`.
 * Kept as a permissive shape so the tab editors can mutate slices
 * without TypeScript fighting them — every backend-known key is typed,
 * everything else falls under `[key: string]: unknown`.
 */
export interface QueryTaxQueryRow {
  taxonomy: string;
  terms: string | number | Array<string | number>;
  operator?: 'IN' | 'NOT IN' | 'AND' | 'EXISTS' | 'NOT EXISTS';
  field?: 'term_id' | 'name' | 'slug' | 'term_taxonomy_id';
}

export interface QueryMetaQueryRow {
  key: string;
  value?: string | number | Array<string | number>;
  compare?:
    | '='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'LIKE'
    | 'NOT LIKE'
    | 'IN'
    | 'NOT IN'
    | 'BETWEEN'
    | 'NOT BETWEEN'
    | 'EXISTS'
    | 'NOT EXISTS'
    | 'REGEXP'
    | 'NOT REGEXP'
    | 'RLIKE';
  type?: 'NUMERIC' | 'BINARY' | 'CHAR' | 'DATE' | 'DATETIME' | 'DECIMAL' | 'SIGNED' | 'TIME' | 'UNSIGNED';
}

/**
 * One pair-meta predicate inside a `relation_query` row. Mirrors the
 * scalar subset of WordPress' meta_query syntax — we only support
 * primitives because pair meta lives in a JSON `meta` column rather
 * than the `postmeta` table, so we can't lean on WP_Meta_Query for
 * fancy joins.
 */
export interface RelationQueryMetaClause {
  key: string;
  compare?: '=' | '!=' | 'IN' | 'NOT IN' | 'LIKE' | 'NOT LIKE' | 'EXISTS' | 'NOT EXISTS';
  value?: string | number | boolean | Array<string | number>;
}

/**
 * One row inside `relation_query.queries`. The backend filter
 * (`RelationQueryFilter::inject_relation_filter()`) intersects /
 * unions row results into the resolved query.
 */
export interface RelationQueryRow {
  /** Slug of the relation definition (matches `RelationConfigData.slug`). */
  relation_slug: string;
  /** Forward (source-side) or reverse (target-side) lookup. */
  direction?: 'from' | 'to';
  /**
   * Compare operator.
   *
   *   - `IN` / `NOT IN` need an `object_id` anchor.
   *   - `EXISTS` / `NOT EXISTS` ignore it (any-pair lookups).
   *   - `INHERITED IN` / `INHERITED NOT IN` walk the anchor's hierarchy
   *     (post-parent or term-parent chain) and merge in pairs from
   *     each ancestor — only meaningful when the relation definition
   *     opts into `inherit_from_parent`. Pair-meta clauses are
   *     ignored for the INHERITED variants in v1.
   */
  compare?:
    | 'IN'
    | 'NOT IN'
    | 'EXISTS'
    | 'NOT EXISTS'
    | 'INHERITED IN'
    | 'INHERITED NOT IN';
  /**
   * Anchor object ID (numeric) or macro string (`{{current_post_id}}`).
   * Stored as `string` so the form can carry both shapes; backend
   * coerces. Empty for EXISTS / NOT EXISTS.
   */
  object_id?: string | number;
  /** Optional pair-meta predicates ANDed together. */
  meta?: RelationQueryMetaClause[];
}

export interface QueryConfigData {
  query_type: 'posts' | 'terms' | 'users';
  source: {
    post_types?: string[];
    status?: string[];
    taxonomies?: string[];
    hide_empty?: boolean;
    roles?: string[];
  };
  filters?: {
    include_ids?: number[];
    exclude_ids?: number[];
    author?: number | '';
    date_after?: string;
    date_before?: string;
  };
  tax_query?: {
    relation?: 'AND' | 'OR';
    queries?: QueryTaxQueryRow[];
  };
  meta_query?: {
    relation?: 'AND' | 'OR';
    queries?: QueryMetaQueryRow[];
  };
  /**
   * Filter the result set by relations. Multiple rows are combined
   * with `relation_query.relation` (AND intersects, OR unions).
   * Backend: `RelationQueryFilter::inject_relation_filter()`.
   */
  relation_query?: {
    relation?: 'AND' | 'OR';
    queries?: RelationQueryRow[];
  };
  orderby?: string;
  order?: 'ASC' | 'DESC';
  orderby_meta_key?: string;
  posts_per_page?: number;
  offset?: number;
  /**
   * Posts queries only. Maps to WP_Query `ignore_sticky_posts` (default true).
   * When true, sticky posts do not move to the top — normal for “latest” lists.
   */
  ignore_sticky_posts?: boolean;
  macros?: Record<string, unknown>;
}

export interface QueryHealthWarning {
  code: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  path: string;
}

export interface QueryConfig {
  id: number;
  title: string;
  slug?: string;
  config_type?: string;
  data: QueryConfigData;
  status: 'publish' | 'draft';
  schema_version?: string;
  created_at?: string;
  updated_at?: string;
  /** Health-check warnings (only present on single-item GET responses). */
  health?: QueryHealthWarning[];
}

export interface QueryPreviewResult {
  query_type: 'posts' | 'terms' | 'users';
  total: number;
  returned: number;
  results: Array<Record<string, unknown>>;
  warnings: QueryHealthWarning[];
}

export interface QueryPreviewContext {
  current_post_id?: number;
  current_term_id?: number;
  current_user_id?: number;
  url_params?: Record<string, string>;
}

/** Meta keys harvested from one CPT config or one Metabox (field group). */
export interface MetaKeyGroup {
  source: 'post_type' | 'field_group';
  id: number;
  label: string;
  keys: string[];
}

export interface MetaKeysResponse {
  meta_keys: string[];
  /** Grouped by post type label or metabox title (for listing Field picker). */
  meta_key_groups: MetaKeyGroup[];
  count: number;
}

/** One field key inside a dynamic source group. */
export interface DynamicSourceFieldKey {
  value: string;
  label: string;
}

/** Grouped keys for a dynamic source type (Post, Meta box, Relation, …). */
export interface DynamicSourceFieldGroup {
  group: string;
  scope?: string;
  keys: DynamicSourceFieldKey[];
}

/** source family + conditional field groups. */
export interface DynamicSourceCatalogEntry {
  value: 'object' | 'meta' | 'query_var' | 'options' | 'relations';
  label: string;
  groups: DynamicSourceFieldGroup[];
}

export interface DynamicSourcesResponse {
  sources: DynamicSourceCatalogEntry[];
}

interface ValidationDetail {
  valid: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  warnings: Array<{ path: string; message: string; code: string }>;
}

export interface QueryValidationError extends Error {
  validation?: ValidationDetail;
}

// Saved Queries API.
export const queriesApi = {
  getAll: (status: 'all' | 'publish' | 'draft' = 'all') =>
    get<QueryConfig[]>(`queries?status=${encodeURIComponent(status)}`),
  get: (id: number) => get<QueryConfig>(`queries/${id}`),
  create: (data: { title: string; data: QueryConfigData; status?: 'publish' | 'draft' }) =>
    post<QueryConfig>('queries', data),
  update: (
    id: number,
    data: { title?: string; data: QueryConfigData; status?: 'publish' | 'draft' }
  ) => put<QueryConfig>(`queries/${id}`, data),
  delete: (id: number) => del<{ deleted: boolean; id: number }>(`queries/${id}`),
  duplicate: (id: number, title?: string) =>
    post<QueryConfig>(`queries/${id}/duplicate`, { title: title ?? '' }),
  toggleStatus: (id: number, status: 'publish' | 'draft') =>
    put<{ id: number; status: string }>(`queries/${id}/status`, { status }),

  /** Run an unsaved draft config and return preview + warnings. */
  previewDraft: (
    config: QueryConfigData,
    options?: { limit?: number; context?: QueryPreviewContext }
  ) =>
    post<QueryPreviewResult>('queries/preview', {
      data: config,
      limit: options?.limit ?? 50,
      context: options?.context ?? {},
    }),

  /** Run a saved query (server-side macro context overrides supported). */
  previewSaved: (
    id: number,
    options?: { limit?: number; context?: QueryPreviewContext }
  ) =>
    post<QueryPreviewResult>(`queries/${id}/preview`, {
      limit: options?.limit ?? 50,
      context: options?.context ?? {},
    }),

  /** Unique meta keys harvested across every published field group + CPT meta. */
  getMetaKeys: () => get<MetaKeysResponse>('queries/meta-keys'),
};

// =====================================================================
// Listings
// =====================================================================

export type ListingComponentType =
  | 'dynamic_text'
  | 'dynamic_image'
  | 'dynamic_link'
  | 'dynamic_meta'
  | 'dynamic_fields_inline'
  | 'term_badges'
  | 'repeater_output'
  | 'post_content'
  | 'breadcrumbs'
  | 'post_nav'
  | 'comments'
  | 'author_box'
  | 'share_buttons'
  | 'related_posts'
  | 'archive_title'
  | 'archive_description'
  | 'pagination'
  | 'posts_count';

/** Dynamic visibility — Pro listings only; evaluated server-side. */
export type ListingVisibilityLogic = 'all' | 'any';

export type ListingVisibilityRuleType =
  | 'user_logged_in'
  | 'user_logged_out'
  | 'user_role'
  | 'field_value'
  | 'relation_exists'
  | 'taxonomy_has';

export interface ListingVisibilityRule {
  type: ListingVisibilityRuleType;
  operator?: string;
  field?: string;
  relation?: string;
  taxonomy?: string;
  direction?: 'from' | 'to';
  value?: string | number | boolean;
}

export interface ListingVisibilityConfig {
  enabled?: boolean;
  logic?: ListingVisibilityLogic;
  rules?: ListingVisibilityRule[];
}

export interface ListingComponentNode {
  id: string;
  type: ListingComponentType;
  settings: Record<string, unknown>;
  visibility?: ListingVisibilityConfig;
}

export interface ListingCardStyle {
  padding: boolean;
  border: boolean;
  shadow: boolean;
  hover_lift: boolean;
  border_radius: boolean;
  image_hover_zoom: boolean;
}

export const DEFAULT_CARD_STYLE: ListingCardStyle = {
  padding: true,
  border: true,
  shadow: true,
  hover_lift: true,
  border_radius: true,
  image_hover_zoom: true,
};

export type ListingType = 'template' | 'grid' | 'single_page' | 'archive_page';

export type ListingEditor = 'rdcfe' | 'gutenberg' | 'elementor';

export type ListingPlacement =
  | 'template_include'
  | 'replace_content'
  | 'before_content'
  | 'after_content';

export type ListingCanvasMode = 'full_width' | 'default' | 'canvas';

export interface ListingConfigData {
  listing_type: ListingType;
  /**
   * Data source for the iterated rows.
   *
   *   - `posts` / `terms` / `users` — the grid runs a saved Query
   *     (or, when no `query_id` is set, the host-page default loop).
   *   - `relation_children` — iterate over a relation's pairs from
   *     a single anchor; each row carries `pair_meta` accessible to
   *     components via the `pair_meta:<key>` source token.
   */
  data_source: 'posts' | 'terms' | 'users' | 'relation_children';
  /** For template — restricts which post types this template renders. */
  post_types?: string[];
  /** For template — ordered tree of components on the canvas. */
  components?: ListingComponentNode[];
  /** For template — card wrapper appearance toggles. */
  card_style?: Partial<ListingCardStyle>;
  /** For grid — id of a saved listing template. */
  template_id?: number;
  /** For grid — id of a saved Pro query. Ignored when `data_source` is `relation_children`. */
  query_id?: number;
  /** For grid — relation slug to iterate (only when `data_source = relation_children`). */
  relation_slug?: string;
  /** For grid — direction of the iteration (`from` = children, `to` = parents). */
  relation_direction?: 'from' | 'to';
  /** For grid — anchor object id, numeric or `{{macro}}` string. Empty falls back to the queried object. */
  relation_anchor?: string;
  /** For grid — page size for relation_children pagination (0 = unlimited). */
  posts_per_page?: number;
  /** For grid — number of CSS columns (1–6). */
  columns?: number;
  /** For grid — CSS gap. */
  gap?: string;
  /** For grid — pagination strategy. */
  pagination?: 'none' | 'numeric' | 'load_more';
  /** For grid — message rendered when there are zero rows. */
  empty_message?: string;
  /** Optional whole-grid visibility (Pro). Evaluated against host context / macros. */
  visibility?: ListingVisibilityConfig;
  /** Editor used to build this template (Step 45). */
  editor?: ListingEditor;
  /** For single_page/archive_page — which post types this template overrides. */
  override_post_types?: string[];
  /** For single_page/archive_page — canvas rendering mode. */
  canvas_mode?: ListingCanvasMode;
  /** For single_page/archive_page — how the template is injected into the page. */
  placement?: ListingPlacement;
  /** For gutenberg/elementor — linked WordPress page id. */
  page_id?: number;
}

export interface ListingConfig {
  id: number;
  title: string;
  slug?: string;
  config_type?: string;
  data: ListingConfigData;
  status: 'publish' | 'draft';
  schema_version?: string;
  created_at?: string;
  updated_at?: string;
  _links?: { editor_url?: string };
  page_status?: string;
}

/**
 * Component descriptor returned by `GET /listings/components` — drives
 * the React palette tiles and the inspector's default settings.
 */
export type ListingComponentContext = 'all' | 'single_page' | 'archive_page';

export interface ListingComponentDescriptor {
  type: ListingComponentType;
  label: string;
  icon: string;
  category: 'core' | 'media' | 'taxonomy' | 'repeater' | 'page_structure';
  default_settings: Record<string, unknown>;
  context?: ListingComponentContext[];
}

export interface ListingComponentsResponse {
  components: ListingComponentDescriptor[];
}

export interface ListingPreviewResult {
  /** Rendered HTML for the listing card / grid. */
  html: string;
  /** Sample object id used for a template preview. */
  sample_id?: number;
  /** Columns count echoed back for grid previews. */
  columns?: number;
  /** Optional empty-state message when there is nothing to render. */
  message?: string;
}

// Saved Listings API.
export const listingsApi = {
  getAll: (status: 'all' | 'publish' | 'draft' = 'all') =>
    get<ListingConfig[]>(`listings?status=${encodeURIComponent(status)}`),
  get: (id: number) => get<ListingConfig>(`listings/${id}`),
  create: (data: { title: string; data: ListingConfigData; status?: 'publish' | 'draft' }) =>
    post<ListingConfig>('listings', data),
  update: (
    id: number,
    data: { title?: string; data: ListingConfigData; status?: 'publish' | 'draft' }
  ) => put<ListingConfig>(`listings/${id}`, data),
  delete: (id: number) => del<{ deleted: boolean; id: number }>(`listings/${id}`),
  duplicate: (id: number, title?: string) =>
    post<ListingConfig>(`listings/${id}/duplicate`, { title: title ?? '' }),
  toggleStatus: (id: number, status: 'publish' | 'draft') =>
    put<{ id: number; status: string }>(`listings/${id}/status`, { status }),

  /** Component palette catalogue — built-ins + any add-on extensions. */
  getComponents: () => get<ListingComponentsResponse>('listings/components'),

  /** Hierarchical dynamic source catalog (Object / Meta / Query Var / …). */
  getDynamicSources: () => get<DynamicSourcesResponse>('listings/dynamic-sources'),

  /** Templates only — used by the grid-builder template picker. */
  getTemplates: () => get<ListingConfig[]>('listings/templates'),

  /** Grids only — used by the Gutenberg block selector. */
  getGrids: () => get<ListingConfig[]>('listings/grids'),

  /** Render an unsaved draft config to HTML. */
  previewDraft: (
    config: ListingConfigData,
    options?: { sample_id?: number; context?: QueryPreviewContext }
  ) =>
    post<ListingPreviewResult>('listings/preview', {
      data: config,
      sample_id: options?.sample_id ?? 0,
      context: options?.context ?? {},
    }),

  /** Render a saved listing to HTML. */
  previewSaved: (
    id: number,
    options?: { sample_id?: number; context?: QueryPreviewContext }
  ) =>
    post<ListingPreviewResult>(`listings/${id}/preview`, {
      sample_id: options?.sample_id ?? 0,
      context: options?.context ?? {},
    }),
};

// =====================================================================
// Relations.
//
// Definition CRUD lives under `/relations/{id}` (numeric), pair-level
// mutations live under `/relations/{slug}/...` so the meta box can
// stay slug-only (it never knows the parent post ID until the user
// loads an edit screen). Mirrors the queriesApi/listingsApi shape so
// the React hooks file can copy-paste the same patterns.
// =====================================================================

/** Cardinality enum — must stay in sync with `RelationValidator::TYPES`. */
export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';

/** Object kind for either side of a relation — must stay in sync with
 * `RelationValidator::OBJECT_KINDS`. Pre-multi-object relations
 * default to `post` for both sides on read. */
export type RelationObjectKind = 'post' | 'term' | 'user';

/** Allowed input types for per-pair meta fields. Mirrors
 * `RelationValidator::META_FIELD_TYPES` — keep the two lists in sync. */
export type RelationMetaFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select';

/** A single per-pair custom-field definition. Authors declare these
 * in the relation editor; the meta box turns each one into an input
 * underneath every attached pair, and the values land in
 * `wp_rdcfe_relations.meta` (JSON-encoded by the manager). */
export interface RelationMetaField {
  /** Machine key, `[a-z][a-z0-9_]*`, max 64 chars. Stable identifier
   * for the value in the JSON column. */
  key: string;
  /** Human label rendered above the input. */
  label: string;
  /** Input type — drives the renderer in the meta box. */
  type: RelationMetaFieldType;
  /** When true, the meta box marks the input as required. */
  required?: boolean;
  /** Pre-fill value for fresh pairs. Cast per type by the manager. */
  default?: string | number | boolean;
  /** Options for `type='select'` — `[{ value, label }]`. */
  options?: Array<{ value: string; label: string }>;
}

/** Direction flag returned by `get_for_target()` — only the meta
 * box uses it; the React admin pages always store the canonical
 * direction (`from_cpt → to_cpt`). */
export type RelationDirection = 'from' | 'to';

export interface RelationConfigData {
  /** Machine slug ([a-z][a-z0-9_]*, max 64 chars). Stored on the
   * `wp_rdcfe_relations.relation_id` column; cannot change once pairs
   * exist or the join breaks. */
  slug: string;
  /** Human label — surfaced in admin menus + meta box titles when no
   * `from_label` / `to_label` is set. */
  name: string;
  /** Source object kind. Defaults to `post` for back-compat. */
  from_object?: RelationObjectKind;
  /** Source slug, qualified by `from_object`:
   * - `post` → post type slug (e.g. `property`)
   * - `term` → taxonomy slug (e.g. `category`)
   * - `user` → role slug (e.g. `author`), or '' for "any role"
   */
  from_cpt: string;
  /** Target object kind. */
  to_object?: RelationObjectKind;
  /** Target slug, qualified by `to_object`. */
  to_cpt: string;
  /** Cardinality. */
  type: RelationType;
  /** Label shown on the source-side edit screen (e.g. "Assigned Agent"). */
  from_label?: string;
  /** Label shown on the target-side edit screen when bidirectional. */
  to_label?: string;
  /** When true, the picker renders on both sides (storage stays canonical). */
  bidirectional?: boolean;
  /** Max children per parent (source side). 0 = unlimited. */
  from_max?: number;
  /** Max parents per child (target side). 0 = unlimited. */
  to_max?: number;
  /** Hierarchical reads: when true, the picker (and the
   * `INHERITED IN` query op) merges in pairs from the anchor's
   * post-parent or term-parent chain. Only meaningful when at least
   * one side is a hierarchical post type or taxonomy; user-to-user
   * relations reject this flag at validation time. */
  inherit_from_parent?: boolean;
  /** Hierarchical writes: when true, attach/detach on the canonical
   * parent propagate to every descendant up to the bounded
   * `rdcfe_relation_inheritance_max_depth` (default 5). */
  cascade_to_descendants?: boolean;
  /** How aggressively a cascade detach removes descendant rows.
   *   - `merge` (default) — only descendants currently attached to
   *                          the same child lose the row.
   *   - `replace` — every descendant loses the row, even when it had
   *                 a manual override outside the cascade flow.
   * Ignored when `cascade_to_descendants = false`. */
  cascade_strategy?: 'merge' | 'replace';
  /** Per-pair custom field schema. When non-empty, the meta box
   * renders inputs for each declared field underneath every attached
   * pair and stores the values in the relation row's `meta` column. */
  meta_fields?: RelationMetaField[];
}

export interface RelationConfig {
  id: number;
  title: string;
  slug?: string;
  config_type?: string;
  data: RelationConfigData;
  status: 'publish' | 'draft';
  schema_version?: string;
  created_at?: string;
  updated_at?: string;
  /** Live count from `wp_rdcfe_relations` — present on list + single GETs. */
  pair_count?: number;
}

/** A hydrated row returned by `GET /relations/{slug}/related`.
 *
 * The backend returns mixed `WP_Post|WP_Term|WP_User` objects with
 * a `kind` discriminator. The `post_type` field doubles as the
 * taxonomy slug for term rows and the role slug for user rows —
 * that's deliberate so the React picker can use a single "type chip"
 * component for all three. */
export interface RelationRelatedItem {
  id: number;
  /** Object kind discriminator. Defaults to `post` on the wire when missing. */
  kind?: RelationObjectKind;
  title: string;
  status: string;
  /** Post type slug for posts, taxonomy slug for terms, role slug for users. */
  post_type: string;
  type_label?: string;
  thumbnail?: string;
  edit_link?: string;
  excerpt?: string;
  rel_order?: number;
  /** Per-pair custom field values keyed by `meta_fields[].key`. Empty
   * object when the relation declares no schema. */
  meta?: Record<string, string | number | boolean | null>;
  /** Inheritance markers — only present on rows surfaced from an
   * ancestor when the GET request asked for `inherit=1` and the
   * relation opts into `inherit_from_parent`. */
  inherited_from?: number;
  inherited_depth?: number;
}

export interface RelationRelatedResponse {
  items: RelationRelatedItem[];
  total: number;
  direction: RelationDirection;
}

export const relationsApi = {
  // Definition CRUD.
  getAll: (status: 'all' | 'publish' | 'draft' = 'all') =>
    get<RelationConfig[]>(`relations?status=${encodeURIComponent(status)}`),
  get: (id: number) => get<RelationConfig>(`relations/${id}`),
  create: (data: { title: string; data: RelationConfigData; status?: 'publish' | 'draft' }) =>
    post<RelationConfig>('relations', data),
  update: (
    id: number,
    data: { title?: string; data: RelationConfigData; status?: 'publish' | 'draft' }
  ) => put<RelationConfig>(`relations/${id}`, data),
  /** `purge=1` also wipes attached pairs from `wp_rdcfe_relations`. */
  delete: (id: number, purge = false) =>
    del<{ deleted: boolean; id: number }>(
      `relations/${id}${purge ? '?purge=1' : ''}`
    ),
  duplicate: (id: number, title?: string) =>
    post<RelationConfig>(`relations/${id}/duplicate`, { title: title ?? '' }),
  toggleStatus: (id: number, status: 'publish' | 'draft') =>
    put<{ id: number; status: string }>(`relations/${id}/status`, { status }),

  // Pair-level operations (meta box / future Pro picker fields).
  attach: (
    slug: string,
    payload: { parent_id: number; child_id: number; direction?: RelationDirection }
  ) => post<{ attached: boolean }>(`relations/${slug}/attach`, payload),
  detach: (
    slug: string,
    payload: { parent_id: number; child_id: number; direction?: RelationDirection }
  ) => post<{ detached: boolean }>(`relations/${slug}/detach`, payload),
  /** Replace-all-pairs flow used by the React picker. */
  sync: (
    slug: string,
    payload: { parent_id: number; child_ids: number[]; direction?: RelationDirection }
  ) => post<{ synced: number; added: number; removed: number }>(
    `relations/${slug}/sync`,
    payload
  ),
  getRelated: (
    slug: string,
    options: { from_id: number; direction?: RelationDirection }
  ) =>
    get<RelationRelatedResponse>(
      `relations/${slug}/related?from_id=${encodeURIComponent(
        String(options.from_id)
      )}${options.direction ? `&direction=${options.direction}` : ''}`
    ),
};

// Tools API (Import/Export)
export const toolsApi = {
  // Export configurations
  export: (types: string[] = [], ids: number[] = []) =>
    post<ExportResponse>('tools/export', { types, ids }),

  // Import configurations
  import: (data: ExportData) =>
    post<ImportResult>('tools/import', { data }),

  // Validate import (dry run)
  validateImport: (data: ExportData) =>
    post<ImportResult>('tools/validate-import', { data }),

  /** Pro — structured diff + same validation envelope as validate-import. */
  importDiff: (data: ExportData) =>
    post<ImportDiffResponse>('tools/import-diff', { data }),

  /** Pro — snapshot, optional resolutions, then import. */
  importApply: (payload: {
    data: ExportData;
    resolutions?: Record<string, ImportResolutionPayload>;
    create_snapshot_before?: boolean;
    snapshot_label?: string;
    snapshot_source?: string;
  }) => post<ImportResult>('tools/import-apply', payload),

  /** Pro — list rollback snapshots + retention. */
  listSnapshots: () => get<SnapshotsListResponse>('tools/snapshots'),

  /** Pro — capture current config export as a snapshot. */
  createSnapshot: (body?: { label?: string; source?: string }) =>
    post<{ id: string; message: string }>('tools/snapshots', body ?? {}),

  /** Pro — one snapshot with full export payload. */
  getSnapshot: (id: string) =>
    get<SnapshotDetailResponse>(`tools/snapshots/${encodeURIComponent(id)}`),

  /** Pro — restore site configs from snapshot. */
  restoreSnapshot: (id: string) =>
    post<ImportResult>(`tools/snapshots/${encodeURIComponent(id)}/restore`, {}),

  /** Pro — set max snapshots to keep (oldest dropped). */
  setSnapshotRetention: (retention: number) =>
    post<SnapshotsListResponse>('tools/snapshots/retention', { retention }),

  // Flush rewrite rules
  flushRewrite: () =>
    post<{ success: boolean; message: string }>('tools/flush-rewrite', {}),
};

// ===========================================
// AI Assistant (Pro)
// ===========================================

/**
 * AI generation modes mirrored from `\RDCFE_Pro\AI\PromptBuilder::MODES`.
 *
 *   - `create_new`       — start from scratch.
 *   - `modify_existing`  — produce a patch against an existing CPT /
 *                          metabox / etc.
 *   - `fix_schema`       — repair user-supplied JSON.
 */
export type AIMode = 'create_new' | 'modify_existing' | 'fix_schema';

export interface AISettingsPublic {
  /** Master toggle from Settings → AI Assistant. */
  enabled: boolean;
  /** Whether an API key has been saved. The raw key is NEVER returned. */
  has_api_key: boolean;
  /** Masked preview the UI can show next to "Saved" state, e.g. `sk-…AB12`. */
  api_key_preview: string;
  /** Active model slug (e.g. `gpt-4o-mini`). */
  model: string;
  /** Max generations per hour, per user. */
  rate_limit_per_hour: number;
  /** Whitelisted models the dropdown can offer. */
  allowed_models: string[];
}

/**
 * Patch shape accepted by `PUT /ai/settings`. All fields are optional —
 * the backend merges the patch onto the existing settings and only
 * writes the keys that were present in the request.
 */
export interface AISettingsPatch {
  enabled?: boolean;
  api_key?: string;
  model?: string;
  rate_limit_per_hour?: number;
}

export interface AIGenerateRequest {
  mode: AIMode;
  prompt: string;
  context?: {
    selected_cpt?: string;
    selected_field_group?: string | number;
    existing_schema?: Record<string, unknown> | string;
  };
  options?: {
    include_queries?: boolean;
    include_listings?: boolean;
    include_relations?: boolean;
  };
}

export interface AIWarning {
  type: 'info' | 'warning' | 'error';
  message: string;
  code?: string;
  path?: string;
}

export interface AISchemaPayload {
  post_types: Array<Record<string, unknown>>;
  taxonomies: Array<Record<string, unknown>>;
  field_groups: Array<Record<string, unknown>>;
  options_pages: Array<Record<string, unknown>>;
  /** Pro only — empty array on Free sites. */
  queries: Array<Record<string, unknown>>;
  /** Pro only — empty array on Free sites. */
  listings: Array<Record<string, unknown>>;
  /** Pro only — empty array on Free sites. */
  relations: Array<Record<string, unknown>>;
}

export interface AIGenerateResponse {
  success: boolean;
  mode: AIMode;
  schema: AISchemaPayload;
  summary: string[];
  warnings: AIWarning[];
  errors: Array<{ path: string; message: string; code: string }>;
  validation: {
    valid: boolean;
    errors: Array<{ path: string; message: string; code: string }>;
    warnings: Array<{ path: string; message: string; code: string }>;
  };
  model: string;
}

export interface AIValidateResponse {
  success: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  warnings: Array<{ path: string; message: string; code: string }>;
}

export interface AIApplyResponse {
  success: boolean;
  created: Array<{ type: string; id: number; slug?: string; title?: string }>;
  updated: Array<{ type: string; id: number; slug?: string; title?: string }>;
  failed: Array<{ type: string; slug?: string; title?: string; message: string }>;
  snapshot_id: string;
  summary: { created: number; updated: number; failed: number };
}

export interface AITemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  summary: string[];
}

/**
 * Per-module AI generation.
 *
 * Unlike the full-schema `generate` endpoint, `module-generate` returns
 * a suggestion scoped to a single builder form so the user can accept
 * the values straight into the form they're already editing.
 */
export type AIModuleType =
  | 'post_type'
  | 'taxonomy'
  | 'metabox'
  | 'options_page'
  | 'query'
  | 'listing'
  | 'relation';

export interface AIModuleGenerateRequest {
  module: AIModuleType;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AIModuleGenerateResponse {
  success: boolean;
  module: AIModuleType;
  suggestion: Record<string, unknown>;
  summary: string[];
  warnings: AIWarning[];
  model: string;
}

export const aiApi = {
  // Settings (lives next to the React Settings → AI Assistant tab).
  getSettings: () => get<AISettingsPublic>('ai/settings'),
  updateSettings: (patch: AISettingsPatch) =>
    put<AISettingsPublic>('ai/settings', patch),

  // Templates (Quick Start presets — work even without an API key).
  listTemplates: () => get<{ templates: AITemplate[] }>('ai/templates'),

  // Core AI workflow.
  generate: (payload: AIGenerateRequest) =>
    post<AIGenerateResponse>('ai/generate', payload),
  validate: (schema: Partial<AISchemaPayload>) =>
    post<AIValidateResponse>('ai/validate', { schema }),
  apply: (schema: Partial<AISchemaPayload>, confirmedWarnings: string[] = []) =>
    post<AIApplyResponse>('ai/apply', {
      schema,
      confirmed_warnings: confirmedWarnings,
    }),
  rollback: (snapshotId: string) =>
    post<{ restored: number; missing: number }>('ai/rollback', {
      snapshot_id: snapshotId,
    }),

  // Per-module generation.
  moduleGenerate: (payload: AIModuleGenerateRequest) =>
    post<AIModuleGenerateResponse>('ai/module-generate', payload),
};

