<?php
/**
 * Admin Assets Handler
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Admin;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RDCFE\REST\RestManager;

/**
 * Class AdminAssets
 *
 * Handles enqueueing of admin assets (React app and styles).
 */
class AdminAssets {

	/**
	 * Admin menu instance.
	 *
	 * @var AdminMenu
	 */
	private AdminMenu $admin_menu;

	/**
	 * Constructor.
	 *
	 * @param AdminMenu $admin_menu Admin menu instance.
	 */
	public function __construct( AdminMenu $admin_menu ) {
		$this->admin_menu = $admin_menu;
	}

	/**
	 * Initialize assets.
	 *
	 * @return void
	 */
	public function init(): void {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Enqueue admin scripts and styles.
	 *
	 * @param string $hook The current admin page hook.
	 * @return void
	 */
	public function enqueue_scripts( string $hook ): void {
		// Only load on our admin pages.
		if ( ! $this->admin_menu->is_rdcfe_admin_page() ) {
			return;
		}

		$this->enqueue_prod_assets();

		// Listing builder icon/image pickers + field-group media UI.
		wp_enqueue_style( 'dashicons' );
		wp_enqueue_media();

		// Pass settings to JavaScript.
		$this->localize_settings();
	}

	/**
	 * Enqueue production assets from build directory.
	 *
	 * @return void
	 */
	private function enqueue_prod_assets(): void {
		$build_dir = RDCFE_PLUGIN_DIR . 'assets/build/';
		$build_url = RDCFE_PLUGIN_URL . 'assets/build/';

		$js_file  = null;
		$css_file = null;

		$manifest_path = $build_dir . '.vite/manifest.json';
		if ( is_readable( $manifest_path ) ) {
			$manifest_raw = file_get_contents( $manifest_path );
			$manifest     = is_string( $manifest_raw ) ? json_decode( $manifest_raw, true ) : null;
			$entry        = is_array( $manifest ) ? ( $manifest['src/main.tsx'] ?? null ) : null;

			if ( is_array( $entry ) ) {
				if ( ! empty( $entry['file'] ) && is_string( $entry['file'] ) ) {
					$js_file = $entry['file'];
				}
				if ( ! empty( $entry['css'][0] ) && is_string( $entry['css'][0] ) ) {
					$css_file = $entry['css'][0];
				}
			}
		}

		// Fallback: scan build dir when manifest is missing (legacy builds).
		if ( ( ! $js_file || ! $css_file ) && is_dir( $build_dir ) ) {
			$files = scandir( $build_dir );
			if ( is_array( $files ) ) {
				foreach ( $files as $file ) {
					if ( ! $js_file && $this->is_main_js_build_file( $file ) ) {
						$js_file = $file;
					}
					if ( ! $css_file && $this->is_main_css_build_file( $file ) ) {
						$css_file = $file;
					}
				}
			}
		}

		// Enqueue CSS.
		if ( $css_file ) {
			wp_enqueue_style(
				'rdcfe-admin-app',
				$build_url . $css_file,
				array(),
				RDCFE_VERSION
			);
		}

		// Enqueue JS.
		if ( $js_file ) {
			wp_enqueue_script(
				'rdcfe-admin-app',
				$build_url . $js_file,
				array( 'wp-i18n' ),
				RDCFE_VERSION,
				true
			);

			wp_set_script_translations(
				'rdcfe-admin-app',
				'rox-dynamic-cpt-fields-engine',
				RDCFE_PLUGIN_DIR . 'languages'
			);

			// Add type="module" to script.
			add_filter( 'script_loader_tag', array( $this, 'add_module_type' ), 10, 2 );
		} else {
			// Show notice if assets not found.
			add_action(
				'admin_notices',
				function () {
					?>
					<div class="notice notice-error">
						<p>
							<?php esc_html_e( 'RDCFE: Admin assets not found. Please run `npm run build` in the assets/admin directory.', 'rox-dynamic-cpt-fields-engine' ); ?>
						</p>
					</div>
					<?php
				}
			);
		}
	}

	/**
	 * Whether a build filename is the main JS entry (stable or hashed legacy).
	 *
	 * @param string $file Basename from assets/build/.
	 * @return bool
	 */
	private function is_main_js_build_file( string $file ): bool {
		if ( ! str_ends_with( $file, '.js' ) || str_ends_with( $file, '.js.map' ) ) {
			return false;
		}

		return 'main.js' === $file || str_starts_with( $file, 'main-' );
	}

	/**
	 * Whether a build filename is the main CSS bundle (stable or hashed legacy).
	 *
	 * @param string $file Basename from assets/build/.
	 * @return bool
	 */
	private function is_main_css_build_file( string $file ): bool {
		if ( ! str_ends_with( $file, '.css' ) ) {
			return false;
		}

		return 'main.css' === $file || str_starts_with( $file, 'main-' );
	}

	/**
	 * Add type="module" to script tags.
	 *
	 * @param string $tag The script tag.
	 * @param string $handle The script handle.
	 * @return string
	 */
	public function add_module_type( string $tag, string $handle ): string {
		if ( 'rdcfe-admin-app' === $handle ) {
			$tag = str_replace( ' src', ' type="module" src', $tag );
		}
		return $tag;
	}

	/**
	 * Localize script with settings.
	 *
	 * @return void
	 */
	private function localize_settings(): void {
		$settings = array(
			'restUrl'      => esc_url_raw( rest_url( RestManager::NAMESPACE . '/' ) ),
			'nonce'        => wp_create_nonce( 'wp_rest' ),
			// Used by the React client to fetch a fresh `wp_rest` nonce when the
			// initial one expires after long idle periods (auth cookie rotation
			// or 12h+ tick rollover). WP exposes a built-in `rest-nonce` action
			// that returns the new nonce as plain text.
			'ajaxUrl'      => esc_url_raw( admin_url( 'admin-ajax.php' ) ),
			'restNonceUrl' => esc_url_raw( add_query_arg( 'action', 'rest-nonce', admin_url( 'admin-ajax.php' ) ) ),
			'adminUrl'     => esc_url_raw( admin_url() ),
			'version'      => RDCFE_VERSION,
			'debugMode'    => defined( 'WP_DEBUG' ) && WP_DEBUG,
			'isPro'        => $this->is_pro_active(),
			'proFeatures'  => $this->get_pro_features(),
			'upgradeUrl'   => $this->get_upgrade_url(),
			'adminMenus'   => $this->get_admin_menus(),
			'userRoles'    => $this->get_user_roles(),
			// Multi-object Relations need access to the full registry
			// of post types and taxonomies (not just the rdcfe-managed
			// ones) so the Relations editor can pick `category`,
			// `post_tag`, `attachment`, etc. without an extra REST hop.
			'registry'     => $this->get_object_registry(),
			'elementorActive'    => defined( 'ELEMENTOR_VERSION' ),
			'registeredPostTypes' => $this->get_registered_post_types(),
		);

		wp_add_inline_script(
			'rdcfe-admin-app',
			'window.rdcfeSettings = ' . wp_json_encode( $settings ) . ';',
			'before'
		);
	}

	/**
	 * Get available admin menu items for parent menu selection.
	 *
	 * @return array<array{value: string, label: string}>
	 */
	private function get_admin_menus(): array {
		global $menu;

		$menus = array(
			array(
				'value' => '',
				'label' => __( 'Top Level Menu', 'rox-dynamic-cpt-fields-engine' ),
			),
		);

		// Core menus that are always available.
		$core_menus = array(
			'index.php'          => __( 'Dashboard', 'rox-dynamic-cpt-fields-engine' ),
			'edit.php'           => __( 'Posts', 'rox-dynamic-cpt-fields-engine' ),
			'upload.php'         => __( 'Media', 'rox-dynamic-cpt-fields-engine' ),
			'edit.php?post_type=page' => __( 'Pages', 'rox-dynamic-cpt-fields-engine' ),
			'edit-comments.php'  => __( 'Comments', 'rox-dynamic-cpt-fields-engine' ),
			'themes.php'         => __( 'Appearance', 'rox-dynamic-cpt-fields-engine' ),
			'plugins.php'        => __( 'Plugins', 'rox-dynamic-cpt-fields-engine' ),
			'users.php'          => __( 'Users', 'rox-dynamic-cpt-fields-engine' ),
			'tools.php'          => __( 'Tools', 'rox-dynamic-cpt-fields-engine' ),
			'options-general.php' => __( 'Settings', 'rox-dynamic-cpt-fields-engine' ),
		);

		foreach ( $core_menus as $slug => $label ) {
			$menus[] = array(
				'value' => $slug,
				'label' => $label,
			);
		}

		// Track already-added slugs to avoid duplicates.
		$existing_slugs = array_column( $menus, 'value' );

		// Add custom post types and other top-level menus from the global $menu.
		// This includes plugin menus and any top-level Options Page registered
		// via add_menu_page() with a custom slug (e.g. "theme-options").
		if ( ! empty( $menu ) && is_array( $menu ) ) {
			foreach ( $menu as $menu_item ) {
				if ( empty( $menu_item[2] ) ) {
					continue;
				}

				$menu_slug = (string) $menu_item[2];

				// Skip separators.
				if ( strpos( $menu_slug, 'separator' ) === 0 ) {
					continue;
				}

				// Skip core menus we already added above.
				if ( isset( $core_menus[ $menu_slug ] ) ) {
					continue;
				}

				// Skip our own plugin admin menus (the CPT/field-group/options
				// pages editors). Users should not be able to nest a custom
				// options page under our editor screens.
				if ( strpos( $menu_slug, 'rdcfe-' ) === 0 ) {
					continue;
				}

				// Skip duplicates.
				if ( in_array( $menu_slug, $existing_slugs, true ) ) {
					continue;
				}

				$menu_label = ! empty( $menu_item[0] ) ? wp_strip_all_tags( $menu_item[0] ) : $menu_slug;

				$menus[]          = array(
					'value' => $menu_slug,
					'label' => $menu_label,
				);
				$existing_slugs[] = $menu_slug;
			}
		}

		/**
		 * Filter the list of admin menus surfaced to the parent-menu picker
		 * in the Options Page editor UI.
		 *
		 * @since 1.0.0
		 *
		 * @param array $menus Each entry has `value` (slug) and `label` keys.
		 */
		return (array) apply_filters( 'rdcfe_admin_parent_menus', $menus );
	}

	/**
	 * Get every user role registered on the site, including custom roles
	 * added by other plugins (WooCommerce, Bookmify, Amelia, etc.). The list
	 * is prepended with an "All" pseudo-role that the location matcher treats
	 * as a wildcard (matches any user with at least one role).
	 *
	 * @return array<array{value: string, label: string}>
	 */
	private function get_user_roles(): array {
		$roles = array(
			array(
				'value' => 'all',
				'label' => __( 'All', 'rox-dynamic-cpt-fields-engine' ),
			),
		);

		if ( ! function_exists( 'wp_roles' ) ) {
			return $roles;
		}

		$wp_roles = wp_roles();
		$names    = $wp_roles->get_names();

		foreach ( $names as $slug => $label ) {
			$roles[] = array(
				'value' => (string) $slug,
				'label' => translate_user_role( (string) $label ),
			);
		}

		return (array) apply_filters( 'rdcfe_location_user_roles', $roles );
	}

	/**
	 * Surface the runtime registry of post types, taxonomies, and
	 * roles to the React admin app. Each list is already materialised
	 * at request time by core, so this is essentially free.
	 *
	 * Shape:
	 *   {
	 *     postTypes:  [{ value, label }, …],
	 *     taxonomies: [{ value, label }, …],
	 *     roles:      [{ value, label }, …],
	 *   }
	 *
	 * `value` is always the slug; `label` is the singular human label
	 * with the slug appended in parens — matches the formatting the
	 * Query Builder Source tab uses.
	 *
	 * @return array<string, array<int, array<string, string>>>
	 */
	private function get_object_registry(): array {
		// Public-only post types — keeps internal types like
		// `revision`, `oembed_cache`, `customize_changeset` out of
		// the picker. Authors who need those can add via filter.
		$post_types = array();
		foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) {
			$post_types[] = array(
				'value' => (string) $type->name,
				'label' => sprintf( '%s (%s)', (string) ( $type->labels->singular_name ?? $type->name ), $type->name ),
			);
		}
		$post_types = (array) apply_filters( 'rdcfe_relations_post_types', $post_types );

		// Public taxonomies. Same exclusion rationale.
		$taxonomies = array();
		foreach ( get_taxonomies( array( 'public' => true ), 'objects' ) as $tax ) {
			$taxonomies[] = array(
				'value' => (string) $tax->name,
				'label' => sprintf( '%s (%s)', (string) ( $tax->labels->singular_name ?? $tax->name ), $tax->name ),
			);
		}
		$taxonomies = (array) apply_filters( 'rdcfe_relations_taxonomies', $taxonomies );

		// User roles, with an explicit "Any role" sentinel as the
		// first entry. The validator treats `''` as the sentinel.
		$roles = array(
			array(
				'value' => '',
				'label' => __( 'Any role', 'rox-dynamic-cpt-fields-engine' ),
			),
		);
		if ( function_exists( 'wp_roles' ) ) {
			foreach ( wp_roles()->get_names() as $slug => $label ) {
				$roles[] = array(
					'value' => (string) $slug,
					'label' => translate_user_role( (string) $label ),
				);
			}
		}
		$roles = (array) apply_filters( 'rdcfe_relations_roles', $roles );

		return array(
			'postTypes'  => array_values( $post_types ),
			'taxonomies' => array_values( $taxonomies ),
			'roles'      => array_values( $roles ),
		);
	}

	/**
	 * Get registered public post types for the Create Template modal.
	 *
	 * @return array<int, array{value: string, label: string}>
	 */
	private function get_registered_post_types(): array {
		$types = array();
		foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) {
			$types[] = array(
				'value' => (string) $type->name,
				'label' => (string) ( $type->labels->singular_name ?? $type->name ),
			);
		}
		return array_values( $types );
	}

	/**
	 * Check if Pro license is active.
	 *
	 * Uses filter 'rdcfe_is_pro_active' to allow external license managers
	 * (like EDD Software Licensing) to handle the check.
	 *
	 * @return bool
	 */
	private function is_pro_active(): bool {
		/**
		 * Filter to check if Pro license is active.
		 *
		 * External license managers (EDD, WooCommerce, etc.) can hook into this
		 * to provide their own license validation.
		 *
		 * @since 1.0.0
		 *
		 * @param bool $is_pro Whether Pro license is active. Default false.
		 */
		return (bool) apply_filters( 'rdcfe_is_pro_active', false );
	}

	/**
	 * Get list of Pro-only features.
	 *
	 * @return array<string, array<string>>
	 */
	private function get_pro_features(): array {
		return array(
			'field_types' => array(
				'group',
				'repeater',
				'wysiwyg',
				'gallery',
				'datetime',
				'time',
				'color',
				'relationship',
				'taxonomy',
				'user',
				'tab',
				'accordion',
				'endpoint',
				'html',
			),
			'modules'     => array(
				'query_builder',
				'listings',
				'relations',
				'visibility',
				'admin_columns',
				'admin_filters',
				'ai_assistant',
			),
			'settings'    => array(
				'conditional_logic',
				'regex_validation',
				'quick_edit',
				'revisions',
			),
			'location_rules' => array(
				'page_template',
				'post_parent',
				'post_author',
				'post_format',
				'post_taxonomy_term',
				'user_capability',
				'or_groups',
			),
		);
	}

	/**
	 * Get upgrade URL for Pro.
	 *
	 * @return string
	 */
	private function get_upgrade_url(): string {
		// This will be configurable via settings or filter.
		return apply_filters( 'rdcfe_upgrade_url', 'https://wpmet.com/plugin/dynamic-engine/pricing/' );
	}
}
