<?php
/**
 * Admin Menu Registration
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Admin;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdminMenu
 *
 * Handles the registration and rendering of admin menu pages.
 */
class AdminMenu {

	/**
	 * Menu slug.
	 */
	public const MENU_SLUG = 'rdcfe';

	/**
	 * Page hook suffix.
	 *
	 * @var string
	 */
	private string $page_hook = '';

	/**
	 * Get submenu items.
	 *
	 * @return array<int, array{title: string, slug: string, hash: string}>
	 */
	private function get_submenus(): array {
		return array(
		array(
			'title' => __( 'Dashboard', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => '',
			'hash'  => '#/',
		),
		array(
			'title' => __( 'Post Types', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'post-types',
			'hash'  => '#/post-types',
		),
		array(
			'title' => __( 'Taxonomies', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'taxonomies',
			'hash'  => '#/taxonomies',
		),
		array(
			'title' => __( 'Metabox', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'metaboxes',
			'hash'  => '#/metaboxes',
		),
		array(
			'title' => __( 'Options Pages', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'options-pages',
			'hash'  => '#/options-pages',
		),

		array(
			'title' => __( 'Query Builder', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'queries',
			'hash'  => '#/queries',
		),
		array(
			'title' => __( 'Listings', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'listings',
			'hash'  => '#/listings',
		),
		// Relations is a Pro module, but the submenu link is rendered
		// for everyone — Free users still land on the React page
		// where the `<ProModuleGate>` shows the upgrade overlay
		// (consistent with Listings + Query Builder above).
		array(
			'title' => __( 'Relations', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'relations',
			'hash'  => '#/relations',
		),
		// AI Assistant is Pro-only. Same Free-rendering
		// pattern as Relations / Listings / Query Builder — the
		// React page itself wraps in `<ProModuleGate>` and falls
		// back to an upgrade overlay for non-Pro sites, so the
		// submenu link is universal.
		array(
			'title' => __( 'AI Assistant', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'ai-assistant',
			'hash'  => '#/ai-assistant',
		),
		array(
			'title' => __( 'Settings', 'rox-dynamic-cpt-fields-engine' ),
			'slug'  => 'settings',
			'hash'  => '#/settings',
		),
		);
	}

	/**
	 * Initialize admin menu.
	 *
	 * @return void
	 */
	public function init(): void {
		add_action( 'admin_menu', array( $this, 'register_menu' ), 10 );
		add_action( 'admin_head', array( $this, 'add_submenu_hash_script' ) );
	}

	/**
	 * Register admin menu.
	 *
	 * @return void
	 */
	public function register_menu(): void {
		// Main menu page.
		$this->page_hook = add_menu_page(
			__( 'Rox Dynamic CPT Fields Engine', 'rox-dynamic-cpt-fields-engine' ),
			__( 'Dynamic Engine', 'rox-dynamic-cpt-fields-engine' ),
			'manage_options',
			self::MENU_SLUG,
			array( $this, 'render_admin_page' ),
			$this->get_menu_icon(),
			30
		);

		// Add submenus for WordPress sidebar navigation.
		foreach ( $this->get_submenus() as $submenu ) {
			$menu_slug = empty( $submenu['slug'] ) ? self::MENU_SLUG : self::MENU_SLUG . '-' . $submenu['slug'];

			add_submenu_page(
				self::MENU_SLUG,
				sprintf(
					/* translators: %s: Admin submenu title. */
					__( '%s - RDCFE', 'rox-dynamic-cpt-fields-engine' ),
					$submenu['title']
				),
				$submenu['title'],
				'manage_options',
				$menu_slug,
				array( $this, 'render_admin_page' )
			);
		}

		// Remove duplicate "Rox Dynamic CPT" submenu created by add_menu_page.
		global $submenu;
		if ( isset( $submenu[ self::MENU_SLUG ] ) ) {
			$submenu[ self::MENU_SLUG ][0][0] = __( 'Dashboard', 'rox-dynamic-cpt-fields-engine' );
		}
	}

	/**
	 * Add script to handle submenu hash navigation.
	 *
	 * @return void
	 */
	public function add_submenu_hash_script(): void {
		if ( ! $this->is_rdcfe_admin_page() ) {
			return;
		}

		$hash_map = array();
		foreach ( $this->get_submenus() as $submenu ) {
			$menu_slug              = empty( $submenu['slug'] ) ? self::MENU_SLUG : self::MENU_SLUG . '-' . $submenu['slug'];
			$hash_map[ $menu_slug ] = $submenu['hash'];
		}

		// Get all valid hashes for validation.
		$valid_hashes = array_values(
			array_filter(
				array_map(
					function ( $submenu ) {
						return $submenu['hash'];
					},
					$this->get_submenus()
				)
			)
		);

		// Build inline script for hash routing.
		$inline_script = sprintf(
			'(function() {
				var hashMap = %s;
				var validHashes = %s;
				var urlParams = new URLSearchParams(window.location.search);
				var page = urlParams.get("page");
				var currentHash = window.location.hash;
				var isValidHash = currentHash && (
					currentHash === "#/" ||
					validHashes.some(function(h) { return currentHash.startsWith(h); })
				);
				if (page && hashMap[page]) {
					if (!currentHash || !isValidHash) {
						window.location.hash = hashMap[page];
					}
				}
			})();',
			wp_json_encode( $hash_map ),
			wp_json_encode( $valid_hashes )
		);

		// Use wp_add_inline_script attached to common script.
		wp_add_inline_script( 'common', $inline_script );
	}

	/**
	 * Get SVG menu icon.
	 *
	 * @return string Base64 encoded SVG icon.
	 */
	private function get_menu_icon(): string {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>';

		return 'data:image/svg+xml;base64,' . base64_encode( $svg );
	}

	/**
	 * Render admin page.
	 *
	 * @return void
	 */
	public function render_admin_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'rox-dynamic-cpt-fields-engine' ) );
		}

		// Add inline styles for admin page layout.
		$this->add_admin_page_styles();

		?>
		<div id="rdcfe-root" class="rdcfe-root"></div>
		<?php
	}

	/**
	 * Add inline styles for admin page.
	 *
	 * @return void
	 */
	private function add_admin_page_styles(): void {
		$inline_css = sprintf(
			'
			/* Position below WordPress admin bar */
			#rdcfe-root {
				margin: 0 0 0 -20px;
				min-height: calc(100vh - 32px - 56px);
				background: #f9fafb;
			}
			#wpcontent {
				padding-left: 0;
			}
			#wpbody-content {
				padding-bottom: 0;
			}
			@media screen and (max-width: 782px) {
				#rdcfe-root {
					margin-left: -10px;
					min-height: calc(100vh - 46px - 56px);
				}
			}
			/* Hide footer */
			#wpfooter {
				display: none;
			}
			/* Loading state */
			#rdcfe-root:empty::before {
				content: %s;
				display: flex;
				align-items: center;
				justify-content: center;
				min-height: 300px;
				color: #6b7280;
				font-size: 14px;
			}
		',
			wp_json_encode( __( 'Loading...', 'rox-dynamic-cpt-fields-engine' ) )
		);

		// Attach to common admin style.
		wp_add_inline_style( 'common', $inline_css );
	}

	/**
	 * Get page hook suffix.
	 *
	 * @return string
	 */
	public function get_page_hook(): string {
		return $this->page_hook;
	}

	/**
	 * Check if current screen is RDCFE admin page.
	 *
	 * @return bool
	 */
	public function is_rdcfe_admin_page(): bool {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return false;
		}

		$screen = get_current_screen();

		if ( ! $screen ) {
			return false;
		}

		return str_starts_with( $screen->id, 'toplevel_page_' . self::MENU_SLUG )
			|| str_contains( $screen->id, self::MENU_SLUG );
	}
}
