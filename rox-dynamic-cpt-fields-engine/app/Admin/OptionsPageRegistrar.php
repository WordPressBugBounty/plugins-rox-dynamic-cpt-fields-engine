<?php
/**
 * Options Page Registrar
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Admin;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RDCFE\Config\ConfigRepository;
use RDCFE\Fields\FieldTypeRegistry;
use RDCFE\Fields\FieldAssetsManager;
use RDCFE\Fields\LocationMatcher;

/**
 * Class OptionsPageRegistrar
 *
 * Registers and renders options pages in WordPress admin.
 */
class OptionsPageRegistrar {

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $config_repository;

	/**
	 * Field type registry.
	 *
	 * @var FieldTypeRegistry
	 */
	private FieldTypeRegistry $field_registry;

	/**
	 * Registered options pages.
	 *
	 * @var array<string, array>
	 */
	private array $registered_pages = array();

	/**
	 * Local options pages registered via PHP API.
	 *
	 * @var array<string, array>
	 */
	private array $local_options_pages = array();

	/**
	 * Constructor.
	 *
	 * @param ConfigRepository|null $config_repository Config repository instance.
	 */
	public function __construct( ?ConfigRepository $config_repository = null ) {
		$this->config_repository = $config_repository ?? new ConfigRepository();
		$this->field_registry    = FieldTypeRegistry::get_instance();
	}

	/**
	 * Initialize the registrar.
	 *
	 * @return void
	 */
	public function init(): void {
		// Register options pages on admin_menu hook.
		add_action( 'admin_menu', array( $this, 'register_options_pages' ), 99 );

		// Custom save handler — replaces the Settings API path so that
		// post/user/term meta backends and the autoload toggle actually take
		// effect. Both the authenticated and anonymous variants are mapped to
		// the same callback; the callback enforces capability internally so
		// the anonymous route fails closed for logged-out visitors.
		add_action( 'admin_post_rdcfe_save_options_page', array( $this, 'handle_form_submission' ) );
		add_action( 'admin_post_nopriv_rdcfe_save_options_page', array( $this, 'handle_form_submission' ) );

		// Enqueue scripts for options pages.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Register all options pages from configurations.
	 *
	 * Order matters: top-level parents are registered before children, so that
	 * `add_submenu_page()` always sees its parent slug. After registering a
	 * top-level page that has children, a duplicate submenu (same slug as the
	 * parent) is added when `redirect` is false, so the parent remains
	 * independently clickable in the admin sidebar (the WP default behavior
	 * otherwise rewrites the parent's URL to the first submenu's URL).
	 *
	 * @return void
	 */
	public function register_options_pages(): void {
		$db_configs    = $this->config_repository->get_all( 'options_page', 'publish' );
		$local_configs = array_values( $this->local_options_pages );
		$all_configs   = array_merge( $db_configs, $local_configs );

		// Build a map of parent_slug => true for any child page that targets it.
		$has_children = array();
		foreach ( $all_configs as $config ) {
			$parent = $config['data']['parent_slug'] ?? '';
			if ( ! empty( $parent ) ) {
				$has_children[ $parent ] = true;
			}
		}

		// Split into parents (top-level) and children, preserving original order
		// within each bucket so user-defined ordering is respected.
		$parents  = array();
		$children = array();
		foreach ( $all_configs as $config ) {
			if ( empty( $config['data']['parent_slug'] ?? '' ) ) {
				$parents[] = $config;
			} else {
				$children[] = $config;
			}
		}

		// Register parents first so their menu slug exists when submenus attach.
		foreach ( $parents as $config ) {
			$this->register_page( $config, $has_children );
		}

		// Register children (submenus).
		foreach ( $children as $config ) {
			$this->register_page( $config, $has_children );
		}
	}

	/**
	 * Register a single options page.
	 *
	 * @param array<string, mixed> $config       The options page configuration.
	 * @param array<string, bool>  $has_children Map of parent slugs that have at
	 *                                            least one registered child. Used
	 *                                            to decide whether to add a
	 *                                            duplicate submenu for parents
	 *                                            with `redirect` disabled.
	 * @return void
	 */
	private function register_page( array $config, array $has_children = array() ): void {
		$data      = $config['data'] ?? array();
		$menu_slug = $data['menu_slug'] ?? '';

		if ( empty( $menu_slug ) ) {
			return;
		}

		$page_title  = $data['page_title'] ?? $config['title'] ?? __( 'Options', 'rox-dynamic-cpt-fields-engine' );
		$menu_title  = $data['menu_title'] ?? $page_title;
		$capability  = $data['capability'] ?? 'manage_options';
		$icon_url    = $data['icon_url'] ?? $data['icon'] ?? 'dashicons-admin-generic';
		$position    = $data['position'] ?? null;
		$parent_slug = $data['parent_slug'] ?? '';
		// `redirect` defaults to true to match the WP default (parent menu
		// click goes to the first submenu). Set to false to keep the parent
		// independently clickable; we add a duplicate submenu in that case.
		$redirect    = (bool) ( $data['redirect'] ?? true );

		// Store config for rendering.
		$this->registered_pages[ $menu_slug ] = array(
			'config_id'  => $config['id'] ?? 0,
			'page_title' => $page_title,
			'menu_title' => $menu_title,
			'menu_slug'  => $menu_slug,
			'capability' => $capability,
			'data'       => $data,
		);

		// Register as submenu or top-level.
		if ( ! empty( $parent_slug ) ) {
			add_submenu_page(
				$parent_slug,
				$page_title,
				$menu_title,
				$capability,
				$menu_slug,
				array( $this, 'render_options_page' )
			);
		} else {
			add_menu_page(
				$page_title,
				$menu_title,
				$capability,
				$menu_slug,
				array( $this, 'render_options_page' ),
				$icon_url,
				$position
			);

			// Branch on the redirect toggle, but only when this top-level page
			// actually has children — a parent without children needs neither
			// branch's special handling.
			if ( ! empty( $has_children[ $menu_slug ] ) ) {
				if ( $redirect ) {
					// redirect=true → "send parent click to first child":
					// WordPress's add_submenu_page() helpfully auto-prepends a
					// duplicate of the parent as the first submenu item the
					// first time you attach a submenu with a different slug
					// (see wp-admin/includes/plugin.php). That auto-duplicate
					// is exactly what makes the parent reachable on its own
					// page, defeating the "redirect to child" UX. We
					// pre-initialize the parent's submenu container to an
					// empty array so the WP `! isset(...)` guard short-circuits
					// and skips the auto-duplicate. The first real submenu
					// added afterwards (the user's child page) then becomes
					// the parent's effective sidebar target.
					global $submenu;
					if ( ! isset( $submenu[ $menu_slug ] ) ) {
						$submenu[ $menu_slug ] = array();
					}
				} else {
					// redirect=false → "keep parent as its own page": add an
					// explicit duplicate submenu with the SAME slug as the
					// parent so its sidebar link resolves back to the parent's
					// own callback. Using the parent's slug here also satisfies
					// the second clause of WP's auto-duplicate guard
					// ($menu_slug !== $parent_slug), so WP will not add a
					// second duplicate on top of ours.
					add_submenu_page(
						$menu_slug,
						$page_title,
						$menu_title,
						$capability,
						$menu_slug,
						array( $this, 'render_options_page' )
					);
				}
			}
		}

		/**
		 * Fires after an options page is registered.
		 *
		 * @since 1.0.0
		 *
		 * @param string $menu_slug The menu slug.
		 * @param array  $config The page configuration.
		 */
		do_action( 'rdcfe_options_page_registered', $menu_slug, $config );
	}

	/**
	 * Handle form submission for options pages.
	 *
	 * Wired to `admin_post_rdcfe_save_options_page`. Validates the nonce,
	 * resolves the target options page, sanitizes input, and persists via
	 * {@see OptionsPageStorage} so the storage backend (options table,
	 * post/user/term meta) and the autoload toggle are honored.
	 *
	 * Always exits with a redirect — either back to the options page on
	 * success/failure, or to the admin home if the menu slug is invalid.
	 *
	 * @return void
	 */
	public function handle_form_submission(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Nonce is verified below before any state mutation.
		$menu_slug = isset( $_POST['rdcfe_menu_slug'] ) ? sanitize_key( wp_unslash( $_POST['rdcfe_menu_slug'] ) ) : '';
		$nonce     = isset( $_POST['rdcfe_options_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['rdcfe_options_nonce'] ) ) : '';
		$raw_input = isset( $_POST['rdcfe_options'] ) && is_array( $_POST['rdcfe_options'] )
			? wp_unslash( $_POST['rdcfe_options'] )
			: array();
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		if ( empty( $menu_slug ) ) {
			wp_safe_redirect( admin_url() );
			exit;
		}

		// Resolve the page config from either runtime registration (admin
		// menu pages) or directly from the repository as a fallback. This
		// keeps the handler usable even before `admin_menu` populates
		// `$this->registered_pages` — e.g. for AJAX or background contexts.
		$page_config = $this->resolve_page_config( $menu_slug );

		if ( null === $page_config ) {
			wp_die(
				esc_html__( 'Options page not found.', 'rox-dynamic-cpt-fields-engine' ),
				esc_html__( 'Not Found', 'rox-dynamic-cpt-fields-engine' ),
				array( 'response' => 404 )
			);
		}

		$page_data  = $page_config['data'] ?? array();
		$capability = $page_data['capability'] ?? 'manage_options';

		if ( ! current_user_can( $capability ) ) {
			wp_die(
				esc_html__( 'You do not have permission to update this options page.', 'rox-dynamic-cpt-fields-engine' ),
				esc_html__( 'Forbidden', 'rox-dynamic-cpt-fields-engine' ),
				array( 'response' => 403 )
			);
		}

		if ( ! wp_verify_nonce( $nonce, 'rdcfe_save_options_' . $menu_slug ) ) {
			wp_die(
				esc_html__( 'Security check failed. Please reload the page and try again.', 'rox-dynamic-cpt-fields-engine' ),
				esc_html__( 'Forbidden', 'rox-dynamic-cpt-fields-engine' ),
				array( 'response' => 403 )
			);
		}

		// Cache the page config so `find_field_config()` (used by
		// `sanitize_options()`) can resolve field types even when the admin
		// menu hasn't run yet for this request.
		$this->registered_pages[ $menu_slug ] = array(
			'config_id'  => $page_config['id'] ?? 0,
			'page_title' => $page_data['page_title'] ?? $page_config['title'] ?? '',
			'menu_title' => $page_data['menu_title'] ?? '',
			'menu_slug'  => $menu_slug,
			'capability' => $capability,
			'data'       => $page_data,
		);

		$sanitized = $this->sanitize_options( $raw_input );
		$saved     = OptionsPageStorage::write( $menu_slug, $page_data, $sanitized );

		$labels          = $page_data['labels'] ?? array();
		$updated_message = $labels['updated_message'] ?? __( 'Settings saved successfully.', 'rox-dynamic-cpt-fields-engine' );

		$redirect = wp_get_referer();
		if ( ! $redirect ) {
			$redirect = admin_url( 'admin.php?page=' . rawurlencode( $menu_slug ) );
		}

		$redirect = add_query_arg(
			array(
				'rdcfe_options_status' => $saved ? 'success' : 'error',
				'rdcfe_options_msg'    => rawurlencode( $saved ? $updated_message : __( 'Failed to save settings. Please try again.', 'rox-dynamic-cpt-fields-engine' ) ),
			),
			$redirect
		);

		wp_safe_redirect( $redirect );
		exit;
	}

	/**
	 * Locate an options page config by its menu slug.
	 *
	 * Looks first at runtime-registered pages (filled by `admin_menu`), then
	 * at locally registered PHP-API pages, and finally falls back to a fresh
	 * repository lookup. Returns the same shape `ConfigRepository::get()`
	 * returns so callers can read `data` consistently.
	 *
	 * @param string $menu_slug The menu slug to look up.
	 * @return array<string, mixed>|null
	 */
	private function resolve_page_config( string $menu_slug ): ?array {
		if ( isset( $this->registered_pages[ $menu_slug ] ) ) {
			$cached = $this->registered_pages[ $menu_slug ];
			return array(
				'id'    => $cached['config_id'] ?? 0,
				'title' => $cached['page_title'] ?? '',
				'data'  => $cached['data'] ?? array(),
			);
		}

		if ( isset( $this->local_options_pages[ $menu_slug ] ) ) {
			return $this->local_options_pages[ $menu_slug ];
		}

		$db_configs = $this->config_repository->get_all( 'options_page', 'publish' );
		foreach ( $db_configs as $config ) {
			if ( ( $config['data']['menu_slug'] ?? '' ) === $menu_slug ) {
				return $config;
			}
		}

		return null;
	}

	/**
	 * Sanitize options values.
	 *
	 * @param mixed $input The input values.
	 * @return array<string, mixed>
	 */
	public function sanitize_options( mixed $input ): array {
		if ( ! is_array( $input ) ) {
			return array();
		}

		$sanitized = array();

		foreach ( $input as $key => $value ) {
			// Get field config to determine type.
			$field_config = $this->find_field_config( $key );

			// Skip layout markers and display-only field types — they
			// have nothing to persist, and writing `null` here would
			// pollute the saved options array with stale keys.
			if ( $field_config && ! $this->field_registry->is_field_storable( $field_config ) ) {
				continue;
			}

			if ( $field_config ) {
				$field_type = $this->field_registry->get( $field_config['type'] ?? 'text' );
				if ( $field_type ) {
					$sanitized[ $key ] = $field_type->sanitize( $value, $field_config );
					continue;
				}
			}

			// Default sanitization.
			if ( is_array( $value ) ) {
				$sanitized[ $key ] = array_map( 'sanitize_text_field', $value );
			} else {
				$sanitized[ $key ] = sanitize_text_field( $value );
			}
		}

		return $sanitized;
	}

	/**
	 * Render the options page.
	 *
	 * @return void
	 */
	public function render_options_page(): void {
		// Get current page slug.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Just getting page parameter.
		$current_page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';

		if ( empty( $current_page ) || ! isset( $this->registered_pages[ $current_page ] ) ) {
			echo '<div class="wrap"><h1>' . esc_html__( 'Options Page Not Found', 'rox-dynamic-cpt-fields-engine' ) . '</h1></div>';
			return;
		}

		$page_data   = $this->registered_pages[ $current_page ];
		$page_title  = $page_data['page_title'];
		$menu_slug   = $page_data['menu_slug'];
		$option_name = OptionsPageStorage::build_key( $menu_slug );

		// Get attached field groups.
		$field_groups = $this->get_attached_field_groups( $page_data['config_id'], $menu_slug );

		// Get embedded meta_fields from options page config.
		$page_config_data = $page_data['data'] ?? array();
		$meta_fields      = $page_config_data['meta_fields'] ?? array();
		$labels           = $page_config_data['labels'] ?? array();
		$icon_url         = $page_config_data['icon_url'] ?? $page_config_data['icon'] ?? 'dashicons-admin-generic';
		$page_subtitle    = (string) ( $page_config_data['description'] ?? $page_config_data['subtitle'] ?? '' );

		// Get custom labels or defaults.
		$update_button_label = $labels['update_button'] ?? __( 'Save Settings', 'rox-dynamic-cpt-fields-engine' );

		// Read from the configured storage backend (options/post/user/term).
		$saved_values = OptionsPageStorage::read( $menu_slug, $page_config_data );

		// Enqueue field assets — load both base and CPT layout CSS so options
		// page fields share the same flex grid, borders, and spacing as
		// metaboxes / CPT meta fields.
		$assets = FieldAssetsManager::get_instance();
		$assets->enqueue_assets();
		$assets->enqueue_cpt_layout();

		$has_fields = ! empty( $field_groups ) || ! empty( $meta_fields );

		// Map dashicons icon class so a clean icon can render in the header.
		// Falls back to a generic admin icon when an SVG/URL is provided.
		$icon_is_dashicon = is_string( $icon_url ) && 0 === strpos( $icon_url, 'dashicons-' );

		?>
		<div class="wrap rdcfe-options-page">
			<div class="rdcfe-options-page__header">
				<div class="rdcfe-options-page__header-icon" aria-hidden="true">
					<?php if ( $icon_is_dashicon ) : ?>
						<span class="dashicons <?php echo esc_attr( $icon_url ); ?>"></span>
					<?php else : ?>
						<span class="dashicons dashicons-admin-generic"></span>
					<?php endif; ?>
				</div>
				<div class="rdcfe-options-page__header-text">
					<h1 class="rdcfe-options-page__title"><?php echo esc_html( $page_title ); ?></h1>
					<?php if ( '' !== $page_subtitle ) : ?>
						<p class="rdcfe-options-page__subtitle"><?php echo esc_html( $page_subtitle ); ?></p>
					<?php else : ?>
						<p class="rdcfe-options-page__subtitle">
							<?php esc_html_e( 'Manage settings and configure values for this page.', 'rox-dynamic-cpt-fields-engine' ); ?>
						</p>
					<?php endif; ?>
				</div>
			</div>

			<?php $this->render_flash_messages(); ?>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="rdcfe-options-form">
				<?php
				printf(
					'<input type="hidden" name="action" value="%s" />',
					'rdcfe_save_options_page'
				);
				printf(
					'<input type="hidden" name="rdcfe_menu_slug" value="%s" />',
					esc_attr( $menu_slug )
				);
				wp_nonce_field( 'rdcfe_save_options_' . $menu_slug, 'rdcfe_options_nonce' );

				if ( ! $has_fields ) {
					$this->render_no_fields_message( $menu_slug );
				} else {
					// Resolve display options for embedded meta_fields. Options
					// pages default to a two-column layout (label on left,
					// field on right) — that matches the WP settings-page
					// convention and is what most users expect on these
					// screens. Authors can still override via the page config.
					$page_label_placement       = ( ( $page_config_data['label_placement'] ?? 'left' ) === 'top' )
						? 'top'
						: 'left';
					$page_instruction_placement = ( ( $page_config_data['instruction_placement'] ?? 'field' ) === 'label' )
						? 'label'
						: 'field';

					// First render embedded meta_fields if any. We pass an
					// empty title so the embedded section doesn't duplicate
					// the page header — the page header above already covers
					// it. A custom section_title from config would override.
					if ( ! empty( $meta_fields ) ) {
						$section_title = (string) ( $page_config_data['section_title'] ?? '' );
						$this->render_meta_fields(
							$meta_fields,
							$option_name,
							$saved_values,
							$section_title,
							$page_label_placement,
							$page_instruction_placement
						);
					}

					// Then render attached field groups.
					foreach ( $field_groups as $group ) {
						$this->render_field_group( $group, $option_name, $saved_values );
					}

					?>
					<div class="rdcfe-options-page__submit">
						<?php submit_button( $update_button_label, 'primary rdcfe-options-page__submit-btn', 'submit', false ); ?>
					</div>
					<?php
				}
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Render embedded meta fields.
	 *
	 * Honors the metabox builder's `tab` / `accordion` / `endpoint` markers in
	 * the flat `meta_fields` array exactly the way CPT meta fields and
	 * taxonomy meta fields do, so an options page can use horizontal tabs,
	 * vertical tabs, or accordions to organise fields. Falls back to a
	 * simple flat layout when no tabs/accordions are present.
	 *
	 * Field markup, JS hooks (`.rdcfe-tabs`, `.rdcfe-accordions`), and CSS
	 * are all reused from the CPT layout, so the same JS that drives tabs
	 * and accordions on post edit screens drives them here too.
	 *
	 * @param array<array<string, mixed>> $meta_fields           The meta fields array.
	 * @param string                      $option_name           The option name.
	 * @param array<string, mixed>        $saved_values          The saved values.
	 * @param string                      $section_title         Optional section title; '' to omit.
	 * @param string                      $label_placement       'top'|'left' — defaults to 'left' for options pages.
	 * @param string                      $instruction_placement 'label'|'field' — defaults to 'field'.
	 * @return void
	 */
	private function render_meta_fields(
		array $meta_fields,
		string $option_name,
		array $saved_values,
		string $section_title = '',
		string $label_placement = 'left',
		string $instruction_placement = 'field'
	): void {
		if ( empty( $meta_fields ) ) {
			return;
		}

		$layout = $this->parse_field_layout( $meta_fields );

		if ( empty( $layout['sections'] ) ) {
			return;
		}

		$this->render_layout(
			$layout,
			$option_name,
			$saved_values,
			sanitize_key( $option_name ) . '_meta',
			$section_title,
			$label_placement,
			$instruction_placement
		);
	}

	/**
	 * Render message when no fields are attached.
	 *
	 * @param string $menu_slug The menu slug.
	 * @return void
	 */
	private function render_no_fields_message( string $menu_slug ): void {
		?>
		<div class="rdcfe-options-page__empty">
			<div class="rdcfe-options-page__empty-icon">
				<span class="dashicons dashicons-layout"></span>
			</div>
			<h2><?php esc_html_e( 'No Fields Configured', 'rox-dynamic-cpt-fields-engine' ); ?></h2>
			<p><?php esc_html_e( 'Add meta fields to this options page or attach field groups with "Options Page" location rules.', 'rox-dynamic-cpt-fields-engine' ); ?></p>
			<div class="rdcfe-options-page__empty-buttons">
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=rdcfe-options-pages#/options-pages/' . esc_attr( $menu_slug ) ) ); ?>" class="button button-primary">
				<?php esc_html_e( 'Edit Options Page', 'rox-dynamic-cpt-fields-engine' ); ?>
			</a>
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=rdcfe-metaboxes#/metaboxes/new?location=options_page&value=' . rawurlencode( $menu_slug ) ) ); ?>" class="button">
					<?php esc_html_e( 'Create Field Group', 'rox-dynamic-cpt-fields-engine' ); ?>
				</a>
			</div>
		</div>
		<?php
	}

	/**
	 * Render a field group.
	 *
	 * Honors the field group's `label_placement` and `instruction_placement`
	 * settings so options-page rendering matches what the user already
	 * configured for metaboxes — the same field group on a post edit screen
	 * and on an options page now looks identical.
	 *
	 * Tabs / accordions / endpoints embedded in the group's flat `fields`
	 * array (`object_type` markers) are honored too, so a field group
	 * organised with tabs renders with tabs on the options page just like it
	 * does on a post edit screen.
	 *
	 * @param array<string, mixed> $group The field group configuration.
	 * @param string               $option_name The option name.
	 * @param array<string, mixed> $saved_values The saved values.
	 * @return void
	 */
	private function render_field_group( array $group, string $option_name, array $saved_values ): void {
		$group_data  = $group['data'] ?? array();
		$group_title = $group_data['title'] ?? $group['title'] ?? __( 'Settings', 'rox-dynamic-cpt-fields-engine' );
		$fields      = $group_data['fields'] ?? array();
		$group_id    = (int) ( $group['id'] ?? 0 );

		if ( empty( $fields ) ) {
			return;
		}

		// Resolve presentation settings the same way MetaBoxRenderer does so
		// the same field group renders consistently on both surfaces.
		$label_placement       = ( ( $group_data['label_placement'] ?? 'top' ) === 'left' )
			? 'left'
			: 'top';
		$instruction_placement = ( ( $group_data['instruction_placement'] ?? 'field' ) === 'label' )
			? 'label'
			: 'field';

		$layout = $this->parse_field_layout( $fields );

		if ( empty( $layout['sections'] ) ) {
			return;
		}

		$this->render_layout(
			$layout,
			$option_name,
			$saved_values,
			'rdcfe_options_group_' . $group_id,
			$group_title,
			$label_placement,
			$instruction_placement
		);
	}

	/**
	 * Render a single field.
	 *
	 * Delegates to the field type's own `render()` method which emits the
	 * full `.rdcfe-field` wrapper (label + input + instructions). This is the
	 * exact same path used by metaboxes and CPT meta fields, so options-page
	 * fields share the same look and behavior. We only rewrite the field
	 * name to wrap it under the form's `rdcfe_options[]` namespace so a
	 * single grouped array reaches the admin-post handler, and store the
	 * original key on `id` so labels' `for=` and JS hooks keep working.
	 *
	 * @param array<string, mixed> $field        The field configuration.
	 * @param string               $option_name  Unused. Retained for backwards
	 *                                            compatibility with internal
	 *                                            callers; the form submission
	 *                                            namespace is now fixed.
	 * @param array<string, mixed> $saved_values The saved values.
	 * @return void
	 */
	private function render_field( array $field, string $option_name, array $saved_values ): void {
		unset( $option_name );

		$field_type     = $field['type'] ?? 'text';
		$field_name     = $field['name'] ?? '';
		$field_type_obj = $this->field_registry->get( $field_type );

		// Display-only field types (e.g. `html`) don't need a name and
		// are not persisted to the options array — render them directly
		// without the `rdcfe_options[...]` wrapping that storable fields
		// require for the form-submit round trip.
		if ( $field_type_obj && ! $this->field_registry->is_field_storable( $field ) ) {
			$field_type_obj->render( $field, null, 0 );
			return;
		}

		if ( empty( $field_name ) ) {
			return;
		}

		// Get value from saved options.
		$value = $saved_values[ $field_name ] ?? '';

		// Use default if no value.
		if ( ( '' === $value || null === $value ) && $field_type_obj ) {
			$value = $field_type_obj->get_default_value( $field );
		}

		// Wrap the field name under the form's namespaced array so the
		// admin-post handler receives a single sanitizable bundle. The
		// storage backend (options/post/user/term meta) is then resolved
		// server-side from the page config.
		$input_name = 'rdcfe_options[' . $field_name . ']';

		if ( $field_type_obj ) {
			$modified_field         = $field;
			$modified_field['name'] = $input_name;
			$modified_field['id']   = $field_name;

			// object_id is 0 for options pages — no post/term context.
			$field_type_obj->render( $modified_field, $value, 0 );
			return;
		}

		// Fallback for unknown field types — keep visual parity with the
		// modern wrapper so it doesn't look out of place.
		$field_label = $field['label'] ?? $field_name;
		$hint        = $field['description'] ?? $field['instructions'] ?? '';
		$required    = ! empty( $field['required'] );
		$classes     = array( 'rdcfe-field', 'rdcfe-field--' . $field_type );
		if ( $required ) {
			$classes[] = 'rdcfe-field--required';
		}
		?>
		<div class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>" style="width: 100%;">
			<div class="rdcfe-field__label">
				<label for="<?php echo esc_attr( $field_name ); ?>">
					<?php echo esc_html( $field_label ); ?>
					<?php if ( $required ) : ?>
						<span class="rdcfe-required" aria-hidden="true">*</span>
					<?php endif; ?>
				</label>
			</div>
			<div class="rdcfe-field__input">
				<input
					type="text"
					id="<?php echo esc_attr( $field_name ); ?>"
					name="<?php echo esc_attr( $input_name ); ?>"
					value="<?php echo esc_attr( (string) $value ); ?>"
					class="rdcfe-input"
				/>
			</div>
			<?php if ( ! empty( $hint ) ) : ?>
				<div class="rdcfe-field__instructions"><?php echo esc_html( $hint ); ?></div>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Parse a flat meta_fields array into a structured layout.
	 *
	 * Mirrors the same parser used by `TaxonomyMetaFieldsManager` and the CPT
	 * meta fields manager so options pages, taxonomy terms, and post-edit
	 * screens all interpret the metabox builder output identically. Walks
	 * the flat list once and groups subsequent `field` items under whichever
	 * `tab` or `accordion` marker preceded them. An `endpoint` marker breaks
	 * the current grouping back to standalone fields.
	 *
	 * @param array<array<string, mixed>> $meta_fields Flat field list.
	 * @return array{type:string, tab_type:string, sections:array<int,array<string,mixed>>}
	 */
	private function parse_field_layout( array $meta_fields ): array {
		$layout = array(
			'type'     => 'simple',
			'tab_type' => 'horizontal',
			'sections' => array(),
		);

		$current_section = array(
			'type'   => 'fields',
			'tab'    => null,
			'fields' => array(),
		);

		$has_tabs       = false;
		$has_accordions = false;
		$first_tab      = null;

		foreach ( $meta_fields as $field ) {
			$object_type = $field['object_type'] ?? 'field';

			switch ( $object_type ) {
				case 'tab':
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					$has_tabs        = true;
					$current_section = array(
						'type'   => 'tab',
						'tab'    => $field,
						'fields' => array(),
					);

					if ( null === $first_tab ) {
						$first_tab          = $field;
						$layout['tab_type'] = ( 'vertical' === ( $field['layout'] ?? 'horizontal' ) ) ? 'vertical' : 'horizontal';
					}
					break;

				case 'accordion':
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					$has_accordions  = true;
					$current_section = array(
						'type'      => 'accordion',
						'accordion' => $field,
						'fields'    => array(),
					);
					break;

				case 'endpoint':
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					// Push an explicit break marker. The renderer treats this
					// as a hard block separator, so a sequence like
					// `tab → endpoint → tab` produces TWO distinct tab strips
					// instead of one strip with both tabs flattened together.
					// Without this, consecutive same-type sections separated
					// only by an endpoint would still be grouped into the
					// same block by the run-collector in render_section_blocks().
					$layout['sections'][] = array(
						'type'   => 'break',
						'fields' => array(),
					);

					$current_section = array(
						'type'   => 'fields',
						'tab'    => null,
						'fields' => array(),
					);
					break;

				case 'field':
				default:
					$current_section['fields'][] = $field;
					break;
			}
		}

		if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
			$layout['sections'][] = $current_section;
		}

		if ( $has_tabs ) {
			$layout['type'] = 'tabs';
		} elseif ( $has_accordions ) {
			$layout['type'] = 'accordions';
		} else {
			$layout['type'] = 'simple';
		}

		return $layout;
	}

	/**
	 * Render a parsed layout, preserving the author's section ordering.
	 *
	 * Walks `$layout['sections']` once and groups CONSECUTIVE same-kind
	 * sections into "blocks" (a run of tab sections becomes one tab strip,
	 * a run of accordion sections becomes one accordion list, a run of
	 * standalone field sections becomes one flat fields-container). Each
	 * block is then emitted in document order, so a sequence like
	 * `tab → endpoint → accordion` renders as a tab strip FOLLOWED BY an
	 * accordion list — not a tab strip with the accordion's fields
	 * silently flattened out into a standalone strip above it (which was
	 * the bug in the previous "tabs OR accordions, exclusive" dispatcher).
	 *
	 * The wrapping section card chrome (`.rdcfe-options-section`) is bare
	 * whenever any block needs its own card surface (tabs / accordions),
	 * because stacking both card chromes produces a visible double border.
	 *
	 * @param array{type:string, tab_type:string, sections:array<int,array<string,mixed>>} $layout       Parsed layout.
	 * @param string                                                                       $option_name  The option name.
	 * @param array<string, mixed>                                                         $saved_values Saved values.
	 * @param string                                                                       $unique_id    DOM-safe ID prefix for tabs/accordions.
	 * @param string                                                                       $section_title Optional title shown above the layout.
	 * @param string                                                                       $label_placement       'top'|'left'.
	 * @param string                                                                       $instruction_placement 'label'|'field'.
	 * @return void
	 */
	private function render_layout(
		array $layout,
		string $option_name,
		array $saved_values,
		string $unique_id,
		string $section_title,
		string $label_placement,
		string $instruction_placement
	): void {
		$sections = $layout['sections'] ?? array();
		$tab_type = $layout['tab_type'] ?? 'horizontal';

		if ( empty( $sections ) ) {
			return;
		}

		$label_placement       = 'top' === $label_placement ? 'top' : 'left';
		$instruction_placement = 'label' === $instruction_placement ? 'label' : 'field';

		$wrapper_classes = array(
			'rdcfe-meta-box',
			'rdcfe-cpt-meta-fields',
			'rdcfe-options-fields',
			'rdcfe-meta-box--label-' . $label_placement,
			'rdcfe-meta-box--instructions-' . $instruction_placement,
		);

		// Drop section card chrome whenever a block needs its own card
		// surface (tabs/accordions). The bare modifier keeps the title bar
		// + spacing but strips border/shadow/background.
		$has_complex = false;
		foreach ( $sections as $section ) {
			$section_type = $section['type'] ?? 'fields';
			if ( 'tab' === $section_type || 'accordion' === $section_type ) {
				$has_complex = true;
				break;
			}
		}

		$section_classes = array( 'rdcfe-options-section' );
		if ( $has_complex ) {
			$section_classes[] = 'rdcfe-options-section--bare';
		}

		?>
		<div class="<?php echo esc_attr( implode( ' ', $section_classes ) ); ?>">
			<?php if ( '' !== $section_title ) : ?>
				<h2 class="rdcfe-options-section__title"><?php echo esc_html( $section_title ); ?></h2>
			<?php endif; ?>
			<div class="rdcfe-options-section__content">
				<div class="<?php echo esc_attr( implode( ' ', $wrapper_classes ) ); ?>">
					<?php $this->render_section_blocks( $sections, $tab_type, $unique_id, $option_name, $saved_values ); ?>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Walk parsed sections in order and emit each consecutive run as a
	 * block (tabs strip / accordions list / standalone fields).
	 *
	 * Splitting into runs (rather than re-grouping all tabs together,
	 * then all accordions, etc.) preserves the author's intended ordering
	 * — e.g. `tab → endpoint → accordion → accordion` renders one tab
	 * strip followed by one accordion list with two items, exactly as
	 * configured in the metabox builder. Each tab/accordion block gets a
	 * unique DOM ID derived from the parent `$unique_id` plus a running
	 * block index, so multiple strips on the same page never collide.
	 *
	 * @param array<int, array<string, mixed>> $sections     Parsed sections in document order.
	 * @param string                           $tab_type     'horizontal'|'vertical' (applies to tab blocks only).
	 * @param string                           $unique_id    DOM-safe ID prefix.
	 * @param string                           $option_name  The option name.
	 * @param array<string, mixed>             $saved_values Saved values.
	 * @return void
	 */
	private function render_section_blocks(
		array $sections,
		string $tab_type,
		string $unique_id,
		string $option_name,
		array $saved_values
	): void {
		$count       = count( $sections );
		$index       = 0;
		$block_index = 0;

		while ( $index < $count ) {
			$section_type = $sections[ $index ]['type'] ?? 'fields';

			// Hard block separator emitted by the parser whenever the author
			// dropped an `endpoint` marker. We just consume it and let the
			// outer loop start a fresh block — never merge across a break.
			if ( 'break' === $section_type ) {
				++$index;
				continue;
			}

			if ( 'tab' === $section_type ) {
				$run = array();
				while ( $index < $count && 'tab' === ( $sections[ $index ]['type'] ?? '' ) ) {
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_tabs_block(
					$run,
					$tab_type,
					$unique_id . '_b' . $block_index,
					$option_name,
					$saved_values
				);
			} elseif ( 'accordion' === $section_type ) {
				$run = array();
				while ( $index < $count && 'accordion' === ( $sections[ $index ]['type'] ?? '' ) ) {
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_accordions_block(
					$run,
					$unique_id . '_b' . $block_index,
					$option_name,
					$saved_values
				);
			} else {
				$run = array();
				while ( $index < $count ) {
					$current_type = $sections[ $index ]['type'] ?? 'fields';
					if ( 'tab' === $current_type || 'accordion' === $current_type || 'break' === $current_type ) {
						break;
					}
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_fields_block( $run, $option_name, $saved_values );
			}

			++$block_index;
		}
	}

	/**
	 * Render a run of standalone field sections as a single flat
	 * `.rdcfe-fields-container` flex grid.
	 *
	 * @param array<int, array<string, mixed>> $sections     Section subset (all `type === 'fields'`).
	 * @param string                           $option_name  The option name.
	 * @param array<string, mixed>             $saved_values Saved values.
	 * @return void
	 */
	private function render_fields_block( array $sections, string $option_name, array $saved_values ): void {
		$has_any = false;
		foreach ( $sections as $section ) {
			if ( ! empty( $section['fields'] ?? array() ) ) {
				$has_any = true;
				break;
			}
		}

		if ( ! $has_any ) {
			return;
		}

		echo '<div class="rdcfe-fields-container rdcfe-standalone-fields">';
		foreach ( $sections as $section ) {
			foreach ( $section['fields'] ?? array() as $field ) {
				$this->render_field( $field, $option_name, $saved_values );
			}
		}
		echo '</div>';
	}

	/**
	 * Render a run of tab sections as one horizontal/vertical tab strip.
	 *
	 * Uses the same `.rdcfe-tabs` / `.rdcfe-tabs__tab` / `.rdcfe-tabs__panel`
	 * class names as CPT meta fields so the existing JS in
	 * `assets/js/rdcfe-fields.js` (which delegates clicks for `.rdcfe-tabs`)
	 * picks up options-page tabs without any extra wiring.
	 *
	 * @param array<int, array<string, mixed>> $sections     Section subset (all `type === 'tab'`).
	 * @param string                           $tab_type     'horizontal'|'vertical'.
	 * @param string                           $unique_id    DOM-safe ID prefix for THIS strip.
	 * @param string                           $option_name  The option name.
	 * @param array<string, mixed>             $saved_values Saved values.
	 * @return void
	 */
	private function render_tabs_block(
		array $sections,
		string $tab_type,
		string $unique_id,
		string $option_name,
		array $saved_values
	): void {
		if ( empty( $sections ) ) {
			return;
		}

		$layout_class = 'vertical' === $tab_type ? 'rdcfe-tabs--vertical' : 'rdcfe-tabs--horizontal';

		echo '<div class="rdcfe-tabs ' . esc_attr( $layout_class ) . '" data-tabs-id="' . esc_attr( $unique_id ) . '">';

		echo '<div class="rdcfe-tabs__nav" role="tablist">';
		foreach ( $sections as $tab_index => $section ) {
			$tab_meta     = $section['tab'] ?? array();
			$tab_id       = $unique_id . '_tab_' . $tab_index;
			$panel_id     = $unique_id . '_panel_' . $tab_index;
			$is_active    = 0 === $tab_index;
			$tab_label    = $tab_meta['label'] ?? sprintf( '%s %d', __( 'Tab', 'rox-dynamic-cpt-fields-engine' ), $tab_index + 1 );
			$active_class = $is_active ? 'rdcfe-tabs__tab--active' : '';

			printf(
				'<button type="button" class="rdcfe-tabs__tab %s" role="tab" id="%s" aria-selected="%s" aria-controls="%s" data-tab-index="%d">%s</button>',
				esc_attr( $active_class ),
				esc_attr( $tab_id ),
				$is_active ? 'true' : 'false',
				esc_attr( $panel_id ),
				(int) $tab_index,
				esc_html( $tab_label )
			);
		}
		echo '</div>';

		echo '<div class="rdcfe-tabs__panels">';
		foreach ( $sections as $tab_index => $section ) {
			$tab_id       = $unique_id . '_tab_' . $tab_index;
			$panel_id     = $unique_id . '_panel_' . $tab_index;
			$is_active    = 0 === $tab_index;
			$active_class = $is_active ? 'rdcfe-tabs__panel--active' : '';
			$hidden       = ! $is_active ? 'hidden' : '';

			printf(
				'<div class="rdcfe-tabs__panel %s" role="tabpanel" id="%s" aria-labelledby="%s" %s>',
				esc_attr( $active_class ),
				esc_attr( $panel_id ),
				esc_attr( $tab_id ),
				esc_attr( $hidden )
			);

			echo '<div class="rdcfe-fields-container">';
			foreach ( $section['fields'] ?? array() as $field ) {
				$this->render_field( $field, $option_name, $saved_values );
			}
			echo '</div>';

			echo '</div>';
		}
		echo '</div>';

		echo '</div>';
	}

	/**
	 * Render a run of accordion sections as one accordion list.
	 *
	 * Uses the same `.rdcfe-accordions` / `.rdcfe-accordion__header` /
	 * `.rdcfe-accordion__content` class names as CPT meta fields so the
	 * existing toggle JS in `assets/js/rdcfe-fields.js` works on options
	 * pages without changes.
	 *
	 * @param array<int, array<string, mixed>> $sections     Section subset (all `type === 'accordion'`).
	 * @param string                           $unique_id    DOM-safe ID prefix for THIS list.
	 * @param string                           $option_name  The option name.
	 * @param array<string, mixed>             $saved_values Saved values.
	 * @return void
	 */
	private function render_accordions_block(
		array $sections,
		string $unique_id,
		string $option_name,
		array $saved_values
	): void {
		if ( empty( $sections ) ) {
			return;
		}

		echo '<div class="rdcfe-accordions" data-accordion-id="' . esc_attr( $unique_id ) . '">';

		foreach ( $sections as $accordion_index => $section ) {
			$accordion       = $section['accordion'] ?? array();
			$fields          = $section['fields'] ?? array();
			$accordion_label = $accordion['label'] ?? sprintf( '%s %d', __( 'Section', 'rox-dynamic-cpt-fields-engine' ), $accordion_index + 1 );
			$header_id       = $unique_id . '_accordion_header_' . $accordion_index;
			$content_id      = $unique_id . '_accordion_content_' . $accordion_index;
			$is_open         = 0 === $accordion_index;

			echo '<div class="rdcfe-accordion' . ( $is_open ? ' rdcfe-accordion--open' : '' ) . '">';
			printf(
				'<button type="button" class="rdcfe-accordion__header" id="%s" aria-expanded="%s" aria-controls="%s" data-accordion-index="%d">',
				esc_attr( $header_id ),
				$is_open ? 'true' : 'false',
				esc_attr( $content_id ),
				(int) $accordion_index
			);
			echo '<span class="rdcfe-accordion__title">' . esc_html( $accordion_label ) . '</span>';
			echo '<span class="rdcfe-accordion__icon"></span>';
			echo '</button>';

			printf(
				'<div class="rdcfe-accordion__content" id="%s" role="region" aria-labelledby="%s" %s>',
				esc_attr( $content_id ),
				esc_attr( $header_id ),
				esc_attr( ! $is_open ? 'hidden' : '' )
			);
			echo '<div class="rdcfe-fields-container">';
			foreach ( $fields as $field ) {
				$this->render_field( $field, $option_name, $saved_values );
			}
			echo '</div>';
			echo '</div>';

			echo '</div>';
		}

		echo '</div>';
	}

	/**
	 * Get field groups attached to an options page.
	 *
	 * Uses the central LocationMatcher so that AND/OR rule groups,
	 * Pro location filters (current_user_role, current_user_capability, etc.),
	 * and the `all` wildcard all behave consistently with other contexts
	 * (post, term, user). An "anchor" guard ensures only field groups that
	 * explicitly target this specific options page are considered, so
	 * generic rules (e.g. `user_role == administrator` alone) do not bleed
	 * into every options page.
	 *
	 * @param int    $page_id   The options page config ID (kept for API compatibility).
	 * @param string $menu_slug The menu slug.
	 * @return array<array<string, mixed>>
	 */
	private function get_attached_field_groups( int $page_id, string $menu_slug ): array {
		unset( $page_id );

		$all_groups = $this->config_repository->get_all( 'field_group', 'publish' );
		$matcher    = new LocationMatcher();
		$context    = $matcher->build_options_context( $menu_slug );
		$matched    = array();

		foreach ( $all_groups as $group ) {
			$field_group = $group['data'] ?? array();
			$location    = $field_group['location'] ?? array();

			if ( ! $this->has_options_page_anchor( $location, $menu_slug ) ) {
				continue;
			}

			if ( $matcher->matches( $field_group, $context ) ) {
				$matched[] = $group;
			}
		}

		// Order by Step 25 `match_priority` (higher first, default 10), then
		// by legacy `menu_order` (lower first) as a tiebreaker. Mirrors
		// `FieldGroupManager::compare_match_priority()` so options pages,
		// post-edit metaboxes, term forms and user profiles all order
		// matched field groups consistently.
		usort(
			$matched,
			static function ( $a, $b ): int {
				$mp_a = (int) ( $a['data']['match_priority'] ?? 10 );
				$mp_b = (int) ( $b['data']['match_priority'] ?? 10 );

				if ( $mp_a !== $mp_b ) {
					return $mp_b <=> $mp_a;
				}

				$mo_a = (int) ( $a['data']['menu_order'] ?? 0 );
				$mo_b = (int) ( $b['data']['menu_order'] ?? 0 );

				return $mo_a <=> $mo_b;
			}
		);

		return $matched;
	}

	/**
	 * Verify that at least one rule group explicitly targets this options page.
	 *
	 * Without this guard, a field group with only a generic rule
	 * (e.g. `user_role == administrator`) would render on every options page,
	 * which is rarely the intent. We require an explicit
	 * `options_page == <menu_slug>` rule somewhere in the location config.
	 *
	 * @param array<int, array<int, array<string, mixed>>> $location  The location config.
	 * @param string                                       $menu_slug The current options page slug.
	 * @return bool
	 */
	private function has_options_page_anchor( array $location, string $menu_slug ): bool {
		$location = LocationMatcher::normalize_location_groups( $location );

		foreach ( $location as $rule_group ) {
			if ( ! is_array( $rule_group ) ) {
				continue;
			}

			foreach ( $rule_group as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}

				$param    = $rule['param'] ?? '';
				$operator = $rule['operator'] ?? '==';
				$val      = (string) ( $rule['value'] ?? '' );

				if ( 'options_page' !== $param || '==' !== $operator ) {
					continue;
				}

				if ( $val === $menu_slug || 'all' === $val ) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Find field configuration by name.
	 *
	 * @param string $field_name The field name.
	 * @return array<string, mixed>|null
	 */
	private function find_field_config( string $field_name ): ?array {
		// First search in options page meta_fields.
		foreach ( $this->registered_pages as $page_data ) {
			$meta_fields = $page_data['data']['meta_fields'] ?? array();
			foreach ( $meta_fields as $field ) {
				if ( ( $field['name'] ?? '' ) === $field_name ) {
					return $field;
				}
			}
		}

		// Then search in attached field groups.
		$field_groups = $this->config_repository->get_all( 'field_group', 'publish' );

		foreach ( $field_groups as $group ) {
			$fields = $group['data']['fields'] ?? array();

			foreach ( $fields as $field ) {
				if ( ( $field['name'] ?? '' ) === $field_name ) {
					return $field;
				}
			}
		}

		return null;
	}

	/**
	 * Enqueue scripts for options pages.
	 *
	 * @param string $hook The current admin page hook.
	 * @return void
	 */
	public function enqueue_scripts( string $hook ): void {
		unset( $hook );

		// Check if we're on one of our options pages.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Just checking page parameter.
		$current_page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';

		if ( empty( $current_page ) || ! isset( $this->registered_pages[ $current_page ] ) ) {
			return;
		}

		// Enqueue media library for image/file fields.
		wp_enqueue_media();

		// All options-page styles live in `assets/css/rdcfe-fields.css`
		// (`.rdcfe-options-page*` rules) so they share one source of truth
		// with metabox / CPT field styles and benefit from the same
		// filemtime cache busting. The render method enqueues
		// `rdcfe-fields` + `rdcfe-cpt-layout`, which is sufficient.
	}

	/**
	 * Render success / error notice from the redirect query args.
	 *
	 * The handler redirects back to the options page with
	 * `rdcfe_options_status` + `rdcfe_options_msg` set; this method renders
	 * them as a WordPress-style admin notice. Replaces the Settings API's
	 * `settings_errors()` output now that we own the save path.
	 *
	 * @return void
	 */
	private function render_flash_messages(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Display-only flash messages from a same-origin redirect.
		$status = isset( $_GET['rdcfe_options_status'] ) ? sanitize_key( wp_unslash( $_GET['rdcfe_options_status'] ) ) : '';
		$msg    = isset( $_GET['rdcfe_options_msg'] ) ? sanitize_text_field( wp_unslash( $_GET['rdcfe_options_msg'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( '' === $status || '' === $msg ) {
			return;
		}

		$class = 'success' === $status ? 'notice-success' : 'notice-error';
		printf(
			'<div class="notice %s is-dismissible inline"><p>%s</p></div>',
			esc_attr( $class ),
			esc_html( $msg )
		);
	}

	/**
	 * Get registered options pages.
	 *
	 * @return array<string, array>
	 */
	public function get_registered_pages(): array {
		return $this->registered_pages;
	}

	/**
	 * Resolve an options page's storage configuration from any context.
	 *
	 * Static helper for {@see self::get_option()} / {@see self::update_option()}
	 * — those run from theme templates / front-end requests where the
	 * `admin_menu` hook has not fired and `$registered_pages` is empty.
	 *
	 * @param string $menu_slug The options page menu slug.
	 * @return array<string, mixed>|null The page `data` array, or null if
	 *                                   no published page matches.
	 */
	private static function locate_page_data( string $menu_slug ): ?array {
		static $cache = array();

		if ( array_key_exists( $menu_slug, $cache ) ) {
			return $cache[ $menu_slug ];
		}

		$repo    = new \RDCFE\Config\ConfigRepository();
		$configs = $repo->get_all( 'options_page', 'publish' );

		foreach ( $configs as $config ) {
			if ( ( $config['data']['menu_slug'] ?? '' ) === $menu_slug ) {
				$cache[ $menu_slug ] = $config['data'] ?? array();
				return $cache[ $menu_slug ];
			}
		}

		$cache[ $menu_slug ] = null;
		return null;
	}

	/**
	 * Get option value from an options page.
	 *
	 * Honors the page's configured storage backend so a value saved to
	 * `user_2` is read from user meta, not from the options table.
	 *
	 * @param string $menu_slug The options page menu slug.
	 * @param string $field_name The field name.
	 * @param mixed  $default_value Default value if not found.
	 * @return mixed
	 */
	public static function get_option( string $menu_slug, string $field_name, mixed $default_value = '' ): mixed {
		$page_data = self::locate_page_data( $menu_slug ) ?? array();
		$values    = OptionsPageStorage::read( $menu_slug, $page_data );

		return $values[ $field_name ] ?? $default_value;
	}

	/**
	 * Update option value for an options page.
	 *
	 * Honors the page's configured storage backend.
	 *
	 * @param string $menu_slug The options page menu slug.
	 * @param string $field_name The field name.
	 * @param mixed  $value The value to save.
	 * @return bool
	 */
	public static function update_option( string $menu_slug, string $field_name, mixed $value ): bool {
		$page_data              = self::locate_page_data( $menu_slug ) ?? array();
		$values                 = OptionsPageStorage::read( $menu_slug, $page_data );
		$values[ $field_name ]  = $value;

		return OptionsPageStorage::write( $menu_slug, $page_data, $values );
	}

	/**
	 * Register a local options page from PHP API.
	 *
	 * @param array<string, mixed> $config The options page configuration.
	 * @return bool True on success.
	 */
	public function register_local_options_page( array $config ): bool {
		$menu_slug = $config['menu_slug'] ?? '';

		if ( empty( $menu_slug ) ) {
			return false;
		}

		// Normalize the config to match database format.
		$this->local_options_pages[ $menu_slug ] = array(
			'id'    => 0,
			'title' => $config['page_title'] ?? $config['menu_title'] ?? '',
			'data'  => $config,
		);

		return true;
	}
}
