<?php
/**
 * Public API Functions
 *
 * These functions provide a developer-friendly API for registering
 * Post Types, Taxonomies, Field Groups, and Options Pages programmatically.
 *
 * These functions provide a developer-friendly API for registering
 * Post Types, Taxonomies, Field Groups, and Options Pages programmatically.
 * They require the RDCFE plugin to be active.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Store for local configurations registered via PHP.
 */
class RDCFE_Local_Store {

	/**
	 * Registered post types.
	 *
	 * @var array
	 */
	private static array $post_types = array();

	/**
	 * Registered taxonomies.
	 *
	 * @var array
	 */
	private static array $taxonomies = array();

	/**
	 * Registered field groups.
	 *
	 * @var array
	 */
	private static array $field_groups = array();

	/**
	 * Registered options pages.
	 *
	 * @var array
	 */
	private static array $options_pages = array();

	/**
	 * Add a post type configuration.
	 *
	 * @param array $config Post type configuration.
	 * @return bool
	 */
	public static function add_post_type( array $config ): bool {
		if ( empty( $config['slug'] ) ) {
			return false;
		}
		self::$post_types[ $config['slug'] ] = $config;
		return true;
	}

	/**
	 * Get all registered post types.
	 *
	 * @return array
	 */
	public static function get_post_types(): array {
		return self::$post_types;
	}

	/**
	 * Add a taxonomy configuration.
	 *
	 * @param array $config Taxonomy configuration.
	 * @return bool
	 */
	public static function add_taxonomy( array $config ): bool {
		if ( empty( $config['slug'] ) ) {
			return false;
		}
		self::$taxonomies[ $config['slug'] ] = $config;
		return true;
	}

	/**
	 * Get all registered taxonomies.
	 *
	 * @return array
	 */
	public static function get_taxonomies(): array {
		return self::$taxonomies;
	}

	/**
	 * Add a field group configuration.
	 *
	 * @param array $config Field group configuration.
	 * @return bool
	 */
	public static function add_field_group( array $config ): bool {
		$key = $config['key'] ?? $config['slug'] ?? '';
		if ( empty( $key ) ) {
			return false;
		}
		self::$field_groups[ $key ] = $config;
		return true;
	}

	/**
	 * Get all registered field groups.
	 *
	 * @return array
	 */
	public static function get_field_groups(): array {
		return self::$field_groups;
	}

	/**
	 * Add an options page configuration.
	 *
	 * @param array $config Options page configuration.
	 * @return bool
	 */
	public static function add_options_page( array $config ): bool {
		$key = $config['menu_slug'] ?? '';
		if ( empty( $key ) ) {
			return false;
		}
		self::$options_pages[ $key ] = $config;
		return true;
	}

	/**
	 * Get all registered options pages.
	 *
	 * @return array
	 */
	public static function get_options_pages(): array {
		return self::$options_pages;
	}

	/**
	 * Check if there are any local configurations.
	 *
	 * @return bool
	 */
	public static function has_local_configs(): bool {
		return ! empty( self::$post_types ) ||
			   ! empty( self::$taxonomies ) ||
			   ! empty( self::$field_groups ) ||
			   ! empty( self::$options_pages );
	}
}

/**
 * Register a custom post type with RDCFE.
 *
 * @since 1.0.0
 *
 * @param array $config {
 *     Post type configuration array.
 *
 *     @type string $slug           Required. Post type slug (max 20 chars, no capital letters or spaces).
 *     @type string $label          Required. Plural label for the post type.
 *     @type string $singular_label Required. Singular label for the post type.
 *     @type string $description    Optional. Post type description.
 *     @type bool   $public         Optional. Whether the post type is public. Default true.
 *     @type bool   $hierarchical   Optional. Whether the post type is hierarchical. Default false.
 *     @type bool   $has_archive    Optional. Whether to enable archives. Default true.
 *     @type bool   $show_in_rest   Optional. Whether to show in REST API. Default true.
 *     @type string $menu_icon      Optional. Dashicon or custom icon URL. Default 'dashicons-admin-post'.
 *     @type int    $menu_position  Optional. Menu position. Default 20.
 *     @type array  $supports       Optional. Features the post type supports. Default array('title', 'editor', 'thumbnail').
 *     @type array  $taxonomies     Optional. Taxonomies to associate with the post type.
 *     @type array  $fields         Optional. Embedded field definitions for this post type.
 * }
 * @return bool True on success, false on failure.
 */
function rdcfe_register_post_type( array $config ): bool {
	if ( ! function_exists( 'RDCFE_Local_Store' ) && ! class_exists( 'RDCFE_Local_Store' ) ) {
		return false;
	}
	return RDCFE_Local_Store::add_post_type( $config );
}

/**
 * Register a custom taxonomy with RDCFE.
 *
 * @since 1.0.0
 *
 * @param array $config {
 *     Taxonomy configuration array.
 *
 *     @type string $slug              Required. Taxonomy slug (max 32 chars, no capital letters or spaces).
 *     @type string $label             Required. Plural label for the taxonomy.
 *     @type string $singular_label    Required. Singular label for the taxonomy.
 *     @type string $description       Optional. Taxonomy description.
 *     @type array  $post_types        Required. Post types to attach this taxonomy to.
 *     @type bool   $public            Optional. Whether the taxonomy is public. Default true.
 *     @type bool   $hierarchical      Optional. Whether the taxonomy is hierarchical (like categories). Default false.
 *     @type bool   $show_in_rest      Optional. Whether to show in REST API. Default true.
 *     @type bool   $show_admin_column Optional. Whether to show in admin list table. Default true.
 *     @type array  $fields            Optional. Embedded field definitions for this taxonomy.
 * }
 * @return bool True on success, false on failure.
 */
function rdcfe_register_taxonomy( array $config ): bool {
	if ( ! class_exists( 'RDCFE_Local_Store' ) ) {
		return false;
	}
	return RDCFE_Local_Store::add_taxonomy( $config );
}

/**
 * Add a local field group.
 *
 * This function allows you to register field groups via PHP code,
 * This function allows you to register field groups via PHP code.
 *
 * @since 1.0.0
 *
 * @param array $config {
 *     Field group configuration array.
 *
 *     @type string $key        Required. Unique key for the field group.
 *     @type string $title      Required. Field group title.
 *     @type array  $fields     Required. Array of field definitions.
 *     @type array  $location   Required. Location rules determining where the field group appears.
 *     @type string $position   Optional. Position of the meta box. 'normal', 'side', or 'acf_after_title' (after title). Default 'normal'.
 *     @type string $style      Optional. Style of the meta box. 'default' or 'seamless'. Default 'default'.
 *     @type int    $menu_order Optional. Order of the field group. Default 0.
 *     @type bool   $active     Optional. Whether the field group is active. Default true.
 * }
 * @return bool True on success, false on failure.
 */
function rdcfe_add_local_field_group( array $config ): bool {
	if ( ! class_exists( 'RDCFE_Local_Store' ) ) {
		return false;
	}
	return RDCFE_Local_Store::add_field_group( $config );
}

/**
 * Alias for rdcfe_add_local_field_group for convenience.
 *
 * @since 1.0.0
 *
 * @param array $config Field group configuration.
 * @return bool True on success, false on failure.
 */
function rdcfe_add_field_group( array $config ): bool {
	return rdcfe_add_local_field_group( $config );
}

/**
 * Add an options page.
 *
 * @since 1.0.0
 *
 * @param array $config {
 *     Options page configuration array.
 *
 *     @type string $page_title  Required. The page title displayed in the browser tab.
 *     @type string $menu_title  Required. The menu title displayed in the admin menu.
 *     @type string $menu_slug   Required. The URL slug for the options page.
 *     @type string $capability  Optional. The capability required to access. Default 'manage_options'.
 *     @type string $parent_slug Optional. Parent menu slug for submenu pages.
 *     @type string $icon_url    Optional. Menu icon (dashicon or URL). Default 'dashicons-admin-generic'.
 *     @type int    $position    Optional. Menu position. Default 80.
 *     @type bool   $redirect    Optional. Whether to redirect to the first child page. Default false.
 *     @type array  $fields      Optional. Field groups to display on this page.
 * }
 * @return bool True on success, false on failure.
 */
function rdcfe_add_options_page( array $config ): bool {
	if ( ! class_exists( 'RDCFE_Local_Store' ) ) {
		return false;
	}
	return RDCFE_Local_Store::add_options_page( $config );
}

/**
 * Walk a field definition tree and return the first matching field config.
 *
 * @param array<int, mixed> $definitions Field rows.
 * @param string            $field_name  Target field name.
 * @return array<string, mixed>|null
 */
function rdcfe_walk_field_definitions( array $definitions, string $field_name ): ?array {
	foreach ( $definitions as $field ) {
		if ( ! is_array( $field ) ) {
			continue;
		}

		$object_type = (string) ( $field['object_type'] ?? 'field' );
		if ( in_array( $object_type, array( 'tab', 'accordion', 'endpoint' ), true ) ) {
			continue;
		}

		if ( ( $field['name'] ?? '' ) === $field_name ) {
			return $field;
		}

		if ( ! empty( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
			$found = rdcfe_walk_field_definitions( $field['sub_fields'], $field_name );
			if ( null !== $found ) {
				return $found;
			}
		}
	}

	return null;
}

/**
 * Resolve an options page menu slug from a config row.
 *
 * @param array<string, mixed> $config Config row.
 * @param array<string, mixed> $data   Config data.
 * @return string
 */
function rdcfe_resolve_options_page_menu_slug( array $config, array $data ): string {
	$menu_slug = sanitize_key( (string) ( $data['menu_slug'] ?? '' ) );
	if ( '' !== $menu_slug ) {
		return $menu_slug;
	}

	$schema = isset( $config['schema'] ) && is_array( $config['schema'] )
		? $config['schema']
		: array();

	$menu_slug = sanitize_key( (string) ( $schema['menu_slug'] ?? '' ) );
	if ( '' !== $menu_slug ) {
		return $menu_slug;
	}

	return sanitize_key( (string) ( $config['slug'] ?? '' ) );
}

/**
 * Check whether an options page defines a field.
 *
 * @param array<string, mixed> $config     Config row.
 * @param array<string, mixed> $data       Config data.
 * @param string               $field_name Field name.
 * @return bool
 */
function rdcfe_options_page_has_field( array $config, array $data, string $field_name ): bool {
	$definitions = $data['meta_fields'] ?? $data['fields'] ?? array();
	if ( rdcfe_walk_field_definitions( (array) $definitions, $field_name ) ) {
		return true;
	}

	if ( ! class_exists( '\RDCFE\Config\ConfigRepository' ) || ! class_exists( '\RDCFE\Fields\LocationMatcher' ) ) {
		return false;
	}

	$menu_slug = rdcfe_resolve_options_page_menu_slug( $config, $data );
	if ( '' === $menu_slug ) {
		return false;
	}

	$repo    = new \RDCFE\Config\ConfigRepository();
	$matcher = new \RDCFE\Fields\LocationMatcher();
	$context = $matcher->build_options_context( $menu_slug );

	foreach ( $repo->get_all( 'field_group', 'publish' ) as $group ) {
		$group_data = (array) ( $group['data'] ?? array() );
		if ( ! $matcher->matches( $group_data, $context ) ) {
			continue;
		}

		if ( rdcfe_walk_field_definitions( (array) ( $group_data['fields'] ?? array() ), $field_name ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Find the options page menu slug that owns a field.
 *
 * @param string $field_name Field name.
 * @return string
 */
function rdcfe_find_options_page_slug_for_field( string $field_name ): string {
	foreach ( RDCFE_Local_Store::get_options_pages() as $slug => $config ) {
		if ( rdcfe_options_page_has_field( array(), $config, $field_name ) ) {
			return sanitize_key( (string) ( $config['menu_slug'] ?? $slug ) );
		}
	}

	if ( ! class_exists( '\RDCFE\Config\ConfigRepository' ) ) {
		return '';
	}

	$repo = new \RDCFE\Config\ConfigRepository();

	foreach ( $repo->get_all( 'options_page', 'publish' ) as $config ) {
		$data = (array) ( $config['data'] ?? array() );
		if ( ! rdcfe_options_page_has_field( $config, $data, $field_name ) ) {
			continue;
		}

		return rdcfe_resolve_options_page_menu_slug( $config, $data );
	}

	return '';
}

/**
 * Find a field definition by name across options pages, field groups, CPTs, and taxonomies.
 *
 * @param string $field_name Field name.
 * @return array<string, mixed>|null
 */
function rdcfe_find_field_definition( string $field_name ): ?array {
	static $cache = array();

	if ( array_key_exists( $field_name, $cache ) ) {
		return $cache[ $field_name ];
	}

	foreach ( RDCFE_Local_Store::get_options_pages() as $config ) {
		$definitions = $config['meta_fields'] ?? $config['fields'] ?? array();
		$found       = rdcfe_walk_field_definitions( (array) $definitions, $field_name );
		if ( null !== $found ) {
			$cache[ $field_name ] = $found;
			return $found;
		}
	}

	foreach ( RDCFE_Local_Store::get_field_groups() as $group ) {
		$found = rdcfe_walk_field_definitions( (array) ( $group['fields'] ?? array() ), $field_name );
		if ( null !== $found ) {
			$cache[ $field_name ] = $found;
			return $found;
		}
	}

	if ( ! class_exists( '\RDCFE\Config\ConfigRepository' ) ) {
		$cache[ $field_name ] = null;
		return null;
	}

	$repo = new \RDCFE\Config\ConfigRepository();

	foreach ( $repo->get_all( 'options_page', 'publish' ) as $config ) {
		$data        = (array) ( $config['data'] ?? array() );
		$definitions = $data['meta_fields'] ?? $data['fields'] ?? array();
		$found       = rdcfe_walk_field_definitions( (array) $definitions, $field_name );
		if ( null !== $found ) {
			$cache[ $field_name ] = $found;
			return $found;
		}
	}

	foreach ( $repo->get_all( 'field_group', 'publish' ) as $group ) {
		$data  = (array) ( $group['data'] ?? array() );
		$found = rdcfe_walk_field_definitions( (array) ( $data['fields'] ?? array() ), $field_name );
		if ( null !== $found ) {
			$cache[ $field_name ] = $found;
			return $found;
		}
	}

	foreach ( $repo->get_all( 'post_type', 'publish' ) as $post_type ) {
		$data  = (array) ( $post_type['data'] ?? array() );
		$found = rdcfe_walk_field_definitions( (array) ( $data['meta_fields'] ?? array() ), $field_name );
		if ( null !== $found ) {
			$cache[ $field_name ] = $found;
			return $found;
		}
	}

	foreach ( $repo->get_all( 'taxonomy', 'publish' ) as $taxonomy ) {
		$data  = (array) ( $taxonomy['data'] ?? array() );
		$found = rdcfe_walk_field_definitions( (array) ( $data['meta_fields'] ?? array() ), $field_name );
		if ( null !== $found ) {
			$cache[ $field_name ] = $found;
			return $found;
		}
	}

	$cache[ $field_name ] = null;
	return null;
}

/**
 * Apply a field type's return format to a raw stored value.
 *
 * @param string $field_name Field name.
 * @param mixed  $value      Raw stored value.
 * @param mixed  $default    Default when empty.
 * @return mixed
 */
function rdcfe_format_field_value( string $field_name, mixed $value, mixed $default = '' ): mixed {
	if ( '' === $value || null === $value ) {
		return $default;
	}

	$field_config = rdcfe_find_field_definition( $field_name );
	if ( null === $field_config || ! class_exists( '\RDCFE\Fields\FieldTypeRegistry' ) ) {
		return $value;
	}

	$field_type = \RDCFE\Fields\FieldTypeRegistry::get_instance()->get( $field_config['type'] ?? 'text' );
	if ( ! $field_type ) {
		return $value;
	}

	return $field_type->format( $value, $field_config );
}

/**
 * Parse the second argument passed to rdcfe_get_field().
 *
 * Accepts post IDs and context strings (`option`, `user_2`, `term_5`),
 * numeric strings, and options page menu slugs.
 *
 * @param int|string|null $context Context identifier.
 * @return array{type:string, id:int, slug:string}
 */
function rdcfe_parse_field_context( int|string|null $context ): array {
	if ( is_int( $context ) ) {
		return array(
			'type' => 'post',
			'id'   => $context,
			'slug' => '',
		);
	}

	if ( null === $context ) {
		return array(
			'type' => 'post',
			'id'   => (int) get_the_ID(),
			'slug' => '',
		);
	}

	$context = trim( (string) $context );

	if ( '' === $context ) {
		return array(
			'type' => 'post',
			'id'   => (int) get_the_ID(),
			'slug' => '',
		);
	}

	if ( ctype_digit( $context ) ) {
		return array(
			'type' => 'post',
			'id'   => (int) $context,
			'slug' => '',
		);
	}

	if ( in_array( $context, array( 'option', 'options' ), true ) ) {
		return array(
			'type' => 'option',
			'id'   => 0,
			'slug' => '',
		);
	}

	if ( preg_match( '/^user_(?<id>\d+)$/i', $context, $matches ) ) {
		return array(
			'type' => 'user',
			'id'   => (int) $matches['id'],
			'slug' => '',
		);
	}

	if ( preg_match( '/^(?:term|category|post_tag|[a-z0-9_-]+)_(?<id>\d+)$/i', $context, $matches ) ) {
		return array(
			'type' => 'term',
			'id'   => (int) $matches['id'],
			'slug' => '',
		);
	}

	return array(
		'type' => 'option',
		'id'   => 0,
		'slug' => sanitize_key( $context ),
	);
}

/**
 * Read a raw field value from the requested storage context.
 *
 * @param string               $field_name Field name.
 * @param array<string, mixed> $context    Parsed context from rdcfe_parse_field_context().
 * @param mixed                $default    Default value.
 * @return mixed
 */
function rdcfe_read_raw_field_value( string $field_name, array $context, mixed $default = '' ): mixed {
	switch ( $context['type'] ?? 'post' ) {
		case 'user':
			if ( empty( $context['id'] ) ) {
				return $default;
			}
			return get_user_meta( (int) $context['id'], $field_name, true );

		case 'term':
			if ( empty( $context['id'] ) ) {
				return $default;
			}
			return get_term_meta( (int) $context['id'], $field_name, true );

		case 'option':
			$menu_slug = (string) ( $context['slug'] ?? '' );
			if ( '' === $menu_slug ) {
				$menu_slug = rdcfe_find_options_page_slug_for_field( $field_name );
			}

			if ( '' !== $menu_slug && class_exists( '\RDCFE\Admin\OptionsPageRegistrar' ) ) {
				return \RDCFE\Admin\OptionsPageRegistrar::get_option( $menu_slug, $field_name, $default );
			}

			if ( '' !== $menu_slug && class_exists( '\RDCFE\Admin\OptionsPageStorage' ) && class_exists( '\RDCFE\Config\ConfigRepository' ) ) {
				$page_data = array();
				$repo      = new \RDCFE\Config\ConfigRepository();
				foreach ( $repo->get_all( 'options_page', 'publish' ) as $config ) {
					$data = (array) ( $config['data'] ?? array() );
					if ( rdcfe_resolve_options_page_menu_slug( $config, $data ) === $menu_slug ) {
						$page_data = $data;
						break;
					}
				}

				$values = \RDCFE\Admin\OptionsPageStorage::read( $menu_slug, $page_data );
				return $values[ $field_name ] ?? $default;
			}

			return $default;

		case 'post':
		default:
			if ( empty( $context['id'] ) ) {
				return $default;
			}
			return get_post_meta( (int) $context['id'], $field_name, true );
	}
}

/**
 * Get a field value.
 *
 * @since 1.0.0
 *
 * @param string            $field_name The field name/key.
 * @param int|string|null   $post_id    Optional. Post ID, options page slug, or context string.
 *                                       Use `null` for the current post, `'option'` for an
 *                                       options page field, `'user_2'` / `'term_5'` for user or
 *                                       term meta, or the options page menu slug directly.
 * @param mixed             $default    Optional. Default value if field is empty.
 * @return mixed The field value.
 */
function rdcfe_get_field( string $field_name, int|string|null $post_id = null, mixed $default = '' ): mixed {
	$context = rdcfe_parse_field_context( $post_id );
	$value   = rdcfe_read_raw_field_value( $field_name, $context, $default );

	return rdcfe_format_field_value( $field_name, $value, $default );
}

/**
 * Update a field value.
 *
 * @since 1.0.0
 *
 * @param string $field_name The field name/key.
 * @param mixed  $value      The value to save.
 * @param int    $post_id    The post ID.
 * @return bool True on success, false on failure.
 */
function rdcfe_update_field( string $field_name, mixed $value, int $post_id ): bool {
	return (bool) update_post_meta( $post_id, $field_name, $value );
}

/**
 * Delete a field value.
 *
 * @since 1.0.0
 *
 * @param string $field_name The field name/key.
 * @param int    $post_id    The post ID.
 * @return bool True on success, false on failure.
 */
function rdcfe_delete_field( string $field_name, int $post_id ): bool {
	return delete_post_meta( $post_id, $field_name );
}

/**
 * Get a term meta field value.
 *
 * @since 1.0.0
 *
 * @param string   $field_name The field name/key.
 * @param int      $term_id    The term ID.
 * @param mixed    $default    Optional. Default value if field is empty.
 * @return mixed The field value.
 */
function rdcfe_get_term_field( string $field_name, int $term_id, mixed $default = '' ): mixed {
	$value = get_term_meta( $term_id, $field_name, true );
	return '' !== $value ? $value : $default;
}

/**
 * Get an option value from an options page.
 *
 * @since 1.0.0
 *
 * @param string $menu_slug  The options page menu slug.
 * @param string $field_name The field name within the options page.
 * @param mixed  $default    Optional. Default value if not set.
 * @return mixed The option value.
 */
function rdcfe_get_option( string $menu_slug, string $field_name = '', mixed $default = '' ): mixed {
	if ( '' === $field_name ) {
		if ( class_exists( '\RDCFE\Admin\OptionsPageStorage' ) && class_exists( '\RDCFE\Config\ConfigRepository' ) ) {
			$page_data = array();
			$repo      = new \RDCFE\Config\ConfigRepository();
			foreach ( $repo->get_all( 'options_page', 'publish' ) as $config ) {
				$data = (array) ( $config['data'] ?? array() );
				if ( rdcfe_resolve_options_page_menu_slug( $config, $data ) === sanitize_key( $menu_slug ) ) {
					$page_data = $data;
					break;
				}
			}

			return \RDCFE\Admin\OptionsPageStorage::read( sanitize_key( $menu_slug ), $page_data );
		}

		$prefix     = class_exists( '\RDCFE\Admin\OptionsPageStorage' )
			? \RDCFE\Admin\OptionsPageStorage::KEY_PREFIX
			: 'rdcfe_options_';
		$legacy_key = 0 === strpos( $menu_slug, $prefix )
			? $menu_slug
			: $prefix . sanitize_key( $menu_slug );
		$option     = get_option( $legacy_key, array() );

		return is_array( $option ) ? $option : array();
	}

	if ( class_exists( '\RDCFE\Admin\OptionsPageRegistrar' ) ) {
		return \RDCFE\Admin\OptionsPageRegistrar::get_option( sanitize_key( $menu_slug ), $field_name, $default );
	}

	return rdcfe_get_field( $field_name, $menu_slug, $default );
}

/**
 * Check if RDCFE plugin is active.
 *
 * @since 1.0.0
 *
 * @return bool True if RDCFE is active.
 */
function rdcfe_is_active(): bool {
	return defined( 'RDCFE_VERSION' );
}

/**
 * Get all registered post types (from database + local).
 *
 * @since 1.0.0
 *
 * @return array Array of post type configurations.
 */
function rdcfe_get_post_types(): array {
	$local = RDCFE_Local_Store::get_post_types();
	
	// If plugin is fully loaded, also get database configs.
	if ( function_exists( 'RDCFE\\Plugin::get_instance' ) ) {
		$plugin = \RDCFE\Plugin::get_instance();
		$repo   = $plugin->get_config_repository();
		if ( $repo ) {
			$db_configs = $repo->get_by_type( 'post_type' );
			foreach ( $db_configs as $config ) {
				$local[ $config['data']['slug'] ?? '' ] = $config['data'] ?? array();
			}
		}
	}

	return $local;
}

/**
 * Get all registered taxonomies (from database + local).
 *
 * @since 1.0.0
 *
 * @return array Array of taxonomy configurations.
 */
function rdcfe_get_taxonomies(): array {
	$local = RDCFE_Local_Store::get_taxonomies();
	
	// If plugin is fully loaded, also get database configs.
	if ( function_exists( 'RDCFE\\Plugin::get_instance' ) ) {
		$plugin = \RDCFE\Plugin::get_instance();
		$repo   = $plugin->get_config_repository();
		if ( $repo ) {
			$db_configs = $repo->get_by_type( 'taxonomy' );
			foreach ( $db_configs as $config ) {
				$local[ $config['data']['slug'] ?? '' ] = $config['data'] ?? array();
			}
		}
	}

	return $local;
}

/**
 * Get all registered field groups (from database + local).
 *
 * @since 1.0.0
 *
 * @return array Array of field group configurations.
 */
function rdcfe_get_field_groups(): array {
	$local = RDCFE_Local_Store::get_field_groups();
	
	// If plugin is fully loaded, also get database configs.
	if ( function_exists( 'RDCFE\\Plugin::get_instance' ) ) {
		$plugin = \RDCFE\Plugin::get_instance();
		$repo   = $plugin->get_config_repository();
		if ( $repo ) {
			$db_configs = $repo->get_by_type( 'field_group' );
			foreach ( $db_configs as $config ) {
				$key          = $config['data']['key'] ?? $config['data']['slug'] ?? '';
				$local[ $key ] = $config['data'] ?? array();
			}
		}
	}

	return $local;
}

/**
 * Fire action to include field groups.
 * This is called by the plugin after init.
 *
 * @since 1.0.0
 * @internal
 *
 * @return void
 */
function rdcfe_include_fields(): void {
	/**
	 * Fires when field groups should be included.
	 *
	 * Use this hook to register your field groups via rdcfe_add_local_field_group().
	 *
	 * @since 1.0.0
	 */
	do_action( 'rdcfe/include_fields' );

	/**
	 * Alternative hook name for familiarity.
	 *
	 * @since 1.0.0
	 */
	do_action( 'rdcfe/init' );
}

/**
 * Fire action to include post types.
 *
 * @since 1.0.0
 * @internal
 *
 * @return void
 */
function rdcfe_include_post_types(): void {
	/**
	 * Fires when post types should be registered.
	 *
	 * Use this hook to register your post types via rdcfe_register_post_type().
	 *
	 * @since 1.0.0
	 */
	do_action( 'rdcfe/include_post_types' );
}

/**
 * Fire action to include taxonomies.
 *
 * @since 1.0.0
 * @internal
 *
 * @return void
 */
function rdcfe_include_taxonomies(): void {
	/**
	 * Fires when taxonomies should be registered.
	 *
	 * Use this hook to register your taxonomies via rdcfe_register_taxonomy().
	 *
	 * @since 1.0.0
	 */
	do_action( 'rdcfe/include_taxonomies' );
}

/**
 * Fire action to include options pages.
 *
 * @since 1.0.0
 * @internal
 *
 * @return void
 */
function rdcfe_include_options_pages(): void {
	/**
	 * Fires when options pages should be registered.
	 *
	 * Use this hook to register your options pages via rdcfe_add_options_page().
	 *
	 * @since 1.0.0
	 */
	do_action( 'rdcfe/include_options_pages' );
}
