<?php
/**
 * Field Group Manager
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RDCFE\Config\ConfigRepository;

/**
 * Class FieldGroupManager
 *
 * Orchestrates field groups: loading, matching, rendering, and saving.
 */
class FieldGroupManager {

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $config_repository;

	/**
	 * Location matcher.
	 *
	 * @var LocationMatcher
	 */
	private LocationMatcher $location_matcher;

	/**
	 * Meta box renderer.
	 *
	 * @var MetaBoxRenderer
	 */
	private MetaBoxRenderer $renderer;

	/**
	 * Matched field groups for current screen.
	 *
	 * @var array<array<string, mixed>>
	 */
	private array $matched_groups = array();

	/**
	 * Local field groups registered via PHP API.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private array $local_field_groups = array();

	/**
	 * Constructor.
	 *
	 * @param ConfigRepository|null $config_repository Config repository instance.
	 * @param LocationMatcher|null  $location_matcher Location matcher instance.
	 * @param MetaBoxRenderer|null  $renderer Meta box renderer instance.
	 */
	public function __construct(
		?ConfigRepository $config_repository = null,
		?LocationMatcher $location_matcher = null,
		?MetaBoxRenderer $renderer = null
	) {
		$this->config_repository = $config_repository ?? new ConfigRepository();
		$this->location_matcher  = $location_matcher ?? new LocationMatcher();
		$this->renderer          = $renderer ?? new MetaBoxRenderer();
	}

	/**
	 * Initialize field group manager.
	 *
	 * @return void
	 */
	public function init(): void {
		// Add meta boxes.
		add_action( 'add_meta_boxes', array( $this, 'register_meta_boxes' ), 10, 2 );

		// Save meta box data.
		add_action( 'save_post', array( $this, 'save_meta_boxes' ), 10, 2 );

		// Register meta for REST API.
		add_action( 'init', array( $this, 'register_meta_fields' ), 20 );

		// Register taxonomy term form hooks for field groups whose location
		// rules target a taxonomy. Runs late so custom taxonomies registered
		// by RDCFE itself are available.
		add_action( 'init', array( $this, 'register_taxonomy_metaboxes' ), 25 );

		// Render and save field groups whose location rules target a user
		// (e.g. `user_role == administrator` or `user_form == add`). The
		// per-hook wrappers tell the location matcher which form is firing
		// so the free-tier `user_form` rule can scope to a specific screen.
		add_action( 'show_user_profile', array( $this, 'render_own_profile_fields' ) );
		add_action( 'edit_user_profile', array( $this, 'render_edit_user_fields' ) );
		add_action( 'user_new_form', array( $this, 'render_new_user_fields' ) );
		add_action( 'personal_options_update', array( $this, 'save_user_profile_fields' ) );
		add_action( 'edit_user_profile_update', array( $this, 'save_user_profile_fields' ) );
		add_action( 'user_register', array( $this, 'save_new_user_fields' ) );

		// Enqueue media library scripts.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );

		// Display validation error notices.
		add_action( 'admin_notices', array( $this, 'display_validation_errors' ) );
	}

	/**
	 * Display validation error notices in admin.
	 *
	 * @return void
	 */
	public function display_validation_errors(): void {
		// Check if we have a validation error query arg.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Just checking for query arg.
		if ( ! isset( $_GET['rdcfe_metabox_validation_error'] ) ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->base ) {
			return;
		}

		// Get post ID.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Just getting post ID.
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( ! $post_id ) {
			return;
		}

		// Get validation errors from transient.
		$errors = get_transient( 'rdcfe_metabox_validation_errors_' . $post_id );
		if ( empty( $errors ) ) {
			return;
		}

		// Delete the transient.
		delete_transient( 'rdcfe_metabox_validation_errors_' . $post_id );

		// Build error message.
		$error_list = '<ul style="margin: 0.5em 0 0 1.5em; list-style: disc;">';
		foreach ( $errors as $field_name => $error_message ) {
			$error_list .= '<li>' . esc_html( $error_message ) . '</li>';
		}
		$error_list .= '</ul>';

		printf(
			'<div class="notice notice-error is-dismissible"><p><strong>%s</strong>%s</p></div>',
			esc_html__( 'Validation Error: Please fix the following issues:', 'rox-dynamic-cpt-fields-engine' ),
			$error_list // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already escaped above.
		);
	}

	/**
	 * Register meta boxes for matching field groups.
	 *
	 * @param string   $post_type The post type.
	 * @param \WP_Post $post The post object.
	 * @return void
	 */
	public function register_meta_boxes( string $post_type, \WP_Post $post ): void {
		// Build context for the current post.
		$context = $this->location_matcher->build_post_context( $post );

		// Get all field groups (database + local).
		$field_groups = $this->get_all_field_groups();

		// Filter to matching groups.
		$this->matched_groups = array_filter(
			$field_groups,
			fn( $group ) => $this->location_matcher->matches( $group['data'] ?? array(), $context )
		);

		// Sort matched groups: higher `match_priority` (0-100) first, then
		// lower `menu_order` first as a tiebreaker. `match_priority` is the
		// Step 25 metabox priority (UI: "Match Priority") and is independent
		// from the WP `add_meta_box()` `$priority` arg ('high'|'core'|...).
		usort( $this->matched_groups, array( $this, 'compare_match_priority' ) );

		// Track configured positions so we can enforce them against any
		// user-saved drag order (`meta-box-order_{post_type}` user meta).
		// Without this, once a user drags one of our boxes — or once a box
		// previously sat in a different context before the setting was
		// changed — WordPress will restore it from user meta inside
		// do_meta_boxes() and silently ignore the `position` we just declared.
		$configured_positions = array();

		// Register meta box for each matched group.
		foreach ( $this->matched_groups as $group ) {
			$group_data = $group['data'] ?? array();
			$group_id   = 'rdcfe_field_group_' . $group['id'];

			// WordPress only understands `normal`, `side`, and `advanced` for
			// the meta-box context. Anything else silently falls back to the
			// "advanced" bucket which is what shows up at the bottom of the
			// page — exactly the bug we want to avoid here.
			$position = $group_data['position'] ?? 'normal';
			if ( ! in_array( $position, array( 'normal', 'side', 'advanced' ), true ) ) {
				$position = 'normal';
			}

			$configured_positions[ $group_id ] = $position;

			add_meta_box(
				$group_id,
				$group_data['title'] ?? $group['title'] ?? __( 'Fields', 'rox-dynamic-cpt-fields-engine' ),
				array( $this->renderer, 'render_meta_box' ),
				$post_type,
				$position,
				$group_data['priority'] ?? 'default',
				array( 'field_group' => $group_data )
			);
		}

		if ( ! empty( $configured_positions ) ) {
			$this->enforce_configured_positions( $post_type, $configured_positions );
		}
	}

	/**
	 * Force WordPress to honor each field group's configured position over
	 * any saved user drag order.
	 *
	 * WordPress reads `meta-box-order_{post_type}` user meta inside
	 * `do_meta_boxes()` and re-applies it via `add_meta_box(..., 'sorted')`,
	 * which moves boxes back to whichever context the user last dragged them
	 * to. By filtering that user option we strip our IDs out of every saved
	 * bucket and inject them into the bucket that matches the current
	 * field-group setting, so the configured position always wins.
	 *
	 * @param string                $post_type            Post type slug.
	 * @param array<string, string> $configured_positions Map of meta-box ID => context.
	 * @return void
	 */
	private function enforce_configured_positions( string $post_type, array $configured_positions ): void {
		$filter = "get_user_option_meta-box-order_{$post_type}";

		add_filter(
			$filter,
			function ( $order ) use ( $configured_positions ) {
				if ( ! is_array( $order ) ) {
					$order = array();
				}

				$our_ids = array_keys( $configured_positions );

				// Strip our IDs from every saved context — wherever the user
				// had previously dragged them.
				foreach ( $order as $context => $ids_str ) {
					if ( ! is_string( $ids_str ) ) {
						continue;
					}

					$ids      = array_filter( explode( ',', $ids_str ), 'strlen' );
					$filtered = array_values( array_diff( $ids, $our_ids ) );

					$order[ $context ] = implode( ',', $filtered );
				}

				// Re-insert each ID into its configured context so WP's sort
				// pass leaves it exactly where we want it.
				foreach ( $configured_positions as $box_id => $context ) {
					$existing = isset( $order[ $context ] ) && is_string( $order[ $context ] )
						? trim( $order[ $context ], ',' )
						: '';

					$order[ $context ] = '' === $existing
						? $box_id
						: $existing . ',' . $box_id;
				}

				return $order;
			}
		);
	}

	/**
	 * Save meta box data.
	 *
	 * @param int      $post_id The post ID.
	 * @param \WP_Post $post The post object.
	 * @return void
	 */
	public function save_meta_boxes( int $post_id, \WP_Post $post ): void {
		// Verify nonce.
		if ( ! isset( $_POST['rdcfe_fields_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rdcfe_fields_nonce'] ) ), 'rdcfe_save_fields' ) ) {
			return;
		}

		// Check autosave.
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		// Check permissions.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		// Check post type.
		if ( 'revision' === $post->post_type ) {
			return;
		}

		// Build context.
		$context = $this->location_matcher->build_post_context( $post );

		// Get all matching field groups (database + local).
		$field_groups = $this->get_all_field_groups();

		// Collect all fields for validation.
		$all_fields = array();
		foreach ( $field_groups as $group ) {
			$group_data = $group['data'] ?? array();

			if ( $this->location_matcher->matches( $group_data, $context ) ) {
				$fields = $group_data['fields'] ?? array();
				$all_fields = array_merge( $all_fields, $fields );
			}
		}

		// Server-side validation.
		$validation_errors = $this->validate_fields( $all_fields );
		if ( ! empty( $validation_errors ) ) {
			// Store validation errors in transient to display later.
			set_transient( 'rdcfe_metabox_validation_errors_' . $post_id, $validation_errors, 60 );

			// Add admin notice hook.
			add_filter( 'redirect_post_location', array( $this, 'add_validation_error_query_arg' ), 99 );

			return; // Don't save if validation fails.
		}

		// Save fields.
		foreach ( $field_groups as $group ) {
			$group_data = $group['data'] ?? array();

			if ( $this->location_matcher->matches( $group_data, $context ) ) {
				$this->renderer->save_fields( $post_id, $group_data );
			}
		}

		/**
		 * Fires after all field groups are saved for a post.
		 *
		 * @since 1.0.0
		 *
		 * @param int      $post_id The post ID.
		 * @param \WP_Post $post The post object.
		 */
		do_action( 'rdcfe_after_save_fields', $post_id, $post );
	}

	/**
	 * Validate fields server-side.
	 *
	 * @param array<array<string, mixed>> $fields The fields to validate.
	 * @return array<string, string> Validation errors (field_name => error_message).
	 */
	private function validate_fields( array $fields ): array {
		$errors = array();

		foreach ( $fields as $field ) {
			$field_name  = $field['name'] ?? '';
			$field_label = $field['label'] ?? $field_name;
			$field_type  = $field['type'] ?? 'text';
			$required    = $field['required'] ?? false;

			if ( empty( $field_name ) ) {
				continue;
			}

			// Get value from POST.
			// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce verified in save_meta_boxes, value validated below.
			$value = isset( $_POST[ $field_name ] ) ? wp_unslash( $_POST[ $field_name ] ) : '';

			// Handle arrays (checkboxes).
			if ( is_array( $value ) ) {
				$value    = array_filter( $value );
				$is_empty = empty( $value );
			} else {
				$value    = trim( (string) $value );
				$is_empty = '' === $value;
			}

			// Required validation.
			if ( $required && $is_empty ) {
				$errors[ $field_name ] = sprintf(
					/* translators: %s: field label */
					__( '%s is required.', 'rox-dynamic-cpt-fields-engine' ),
					$field_label
				);
				continue;
			}

			// Skip further validation if empty and not required.
			if ( $is_empty ) {
				continue;
			}

			// URL validation.
			if ( 'url' === $field_type && ! filter_var( $value, FILTER_VALIDATE_URL ) ) {
				$errors[ $field_name ] = sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid URL.', 'rox-dynamic-cpt-fields-engine' ),
					$field_label
				);
			}

			// Email validation.
			if ( 'email' === $field_type && ! is_email( $value ) ) {
				$errors[ $field_name ] = sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid email address.', 'rox-dynamic-cpt-fields-engine' ),
					$field_label
				);
			}

			// Date validation.
			if ( 'date' === $field_type && ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
				$errors[ $field_name ] = sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid date.', 'rox-dynamic-cpt-fields-engine' ),
					$field_label
				);
			}
		}

		return $errors;
	}

	/**
	 * Add query arg for validation error.
	 *
	 * @param string $location The redirect location.
	 * @return string Modified location.
	 */
	public function add_validation_error_query_arg( string $location ): string {
		return add_query_arg( 'rdcfe_metabox_validation_error', '1', $location );
	}

	/**
	 * Register meta fields for REST API.
	 *
	 * @return void
	 */
	public function register_meta_fields(): void {
		$field_groups = $this->get_all_field_groups();

		foreach ( $field_groups as $group ) {
			$group_data = $group['data'] ?? array();
			$fields     = $group_data['fields'] ?? array();

			foreach ( $fields as $field ) {
				$this->register_meta_field( $field, $group_data );
			}
		}
	}

	/**
	 * Register a single meta field.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param array<string, mixed> $field_group The field group configuration.
	 * @return void
	 */
	private function register_meta_field( array $field, array $field_group ): void {
		// Skip layout markers — they are pure UI scaffolding and have no
		// real meta value to expose through register_post_meta()/REST.
		// Without this guard a marker named e.g. `tab` would advertise
		// itself as a real post-meta key in the REST API and pollute the
		// schema for every matching post type.
		$object_type = $field['object_type'] ?? 'field';
		if ( 'field' !== $object_type ) {
			return;
		}

		$meta_key = $field['name'] ?? '';

		if ( empty( $meta_key ) ) {
			return;
		}

		$show_in_rest = $field['show_in_rest'] ?? true;
		$meta_type    = $this->get_meta_type( $field );

		// Get post types from location rules.
		$post_types = $this->get_post_types_from_location( $field_group );

		foreach ( $post_types as $post_type ) {
			register_post_meta(
				$post_type,
				$meta_key,
				array(
					'type'          => $meta_type,
					'single'        => true,
					'show_in_rest'  => MetaRegistration::normalize_show_in_rest( $show_in_rest, $meta_type ),
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}

	/**
	 * Get post types from field group location rules.
	 *
	 * @param array<string, mixed> $field_group The field group configuration.
	 * @return array<string>
	 */
	private function get_post_types_from_location( array $field_group ): array {
		$post_types = array();
		$raw_loc    = $field_group['location'] ?? array();
		$location   = LocationMatcher::normalize_location_groups( is_array( $raw_loc ) ? $raw_loc : array() );

		foreach ( $location as $rule_group ) {
			foreach ( $rule_group as $rule ) {
				if ( 'post_type' === ( $rule['param'] ?? '' ) && '==' === ( $rule['operator'] ?? '' ) ) {
					$value = $rule['value'] ?? '';
					if ( 'all' === $value ) {
						// Get all public post types.
						$all_types  = get_post_types( array( 'public' => true ) );
						$post_types = array_merge( $post_types, $all_types );
					} else {
						$post_types[] = $value;
					}
				}
			}
		}

		return array_unique( $post_types );
	}

	/**
	 * Get meta type for a field.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return string
	 */
	private function get_meta_type( array $field ): string {
		$type = $field['type'] ?? 'text';

		return match ( $type ) {
			'number'   => 'number',
			'toggle'   => 'boolean',
			'checkbox' => 'array',
			'image', 'file' => 'integer',
			default    => 'string',
		};
	}

	/**
	 * Enqueue admin scripts.
	 *
	 * @param string $hook The current admin page hook.
	 * @return void
	 */
	public function enqueue_scripts( string $hook ): void {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php', 'term.php', 'edit-tags.php', 'profile.php', 'user-edit.php' ), true ) ) {
			return;
		}

		// Enqueue media library.
		wp_enqueue_media();

		// Field scripts and validation are handled by rdcfe-fields.js
		// which is enqueued by FieldAssetsManager.
	}

	/**
	 * Register `{taxonomy}_*_form_fields` hooks for every taxonomy targeted by
	 * a field group's location rules. Runs once on `init` (priority 25) so
	 * dynamic taxonomies registered by RDCFE itself are already available.
	 *
	 * @return void
	 */
	public function register_taxonomy_metaboxes(): void {
		$field_groups = $this->get_all_field_groups();
		$taxonomies   = array();

		foreach ( $field_groups as $group ) {
			$raw_loc    = $group['data']['location'] ?? array();
			$location   = LocationMatcher::normalize_location_groups( is_array( $raw_loc ) ? $raw_loc : array() );
			$taxonomies = array_merge( $taxonomies, $this->extract_taxonomies_from_location( $location ) );
		}

		$taxonomies = array_unique( $taxonomies );

		// `taxonomy = all` expands to every registered taxonomy.
		if ( in_array( 'all', $taxonomies, true ) ) {
			$taxonomies = array_merge(
				array_diff( $taxonomies, array( 'all' ) ),
				array_keys( get_taxonomies( array(), 'objects' ) )
			);
			$taxonomies = array_unique( $taxonomies );
		}

		foreach ( $taxonomies as $taxonomy ) {
			if ( ! is_string( $taxonomy ) || '' === $taxonomy ) {
				continue;
			}

			add_action( "{$taxonomy}_add_form_fields", array( $this, 'render_term_add_form_fields' ), 10, 1 );
			add_action( "{$taxonomy}_edit_form_fields", array( $this, 'render_term_edit_form_fields' ), 10, 2 );
			add_action( "created_{$taxonomy}", array( $this, 'save_term_metaboxes' ), 10, 2 );
			add_action( "edited_{$taxonomy}", array( $this, 'save_term_metaboxes' ), 10, 2 );
		}
	}

	/**
	 * Extract every taxonomy slug referenced by `taxonomy ==` rules in a
	 * field group's location config.
	 *
	 * @param array<array<array<string, mixed>>> $location Location rule groups.
	 * @return array<string>
	 */
	private function extract_taxonomies_from_location( array $location ): array {
		$taxonomies = array();

		foreach ( $location as $rule_group ) {
			foreach ( $rule_group as $rule ) {
				if ( 'taxonomy' === ( $rule['param'] ?? '' ) && '==' === ( $rule['operator'] ?? '' ) ) {
					$value = $rule['value'] ?? '';
					if ( '' !== $value ) {
						$taxonomies[] = (string) $value;
					}
				}
			}
		}

		return $taxonomies;
	}

	/**
	 * Render matching field groups on the "Add new term" form for a taxonomy.
	 * Output goes into a div-based form, so each group is wrapped in
	 * `<div class="form-field">` to match WordPress's native add-term layout.
	 *
	 * @param string $taxonomy Taxonomy slug.
	 * @return void
	 */
	public function render_term_add_form_fields( string $taxonomy ): void {
		$context = array(
			'taxonomy'     => $taxonomy,
			'term_id'      => 0,
			'current_user' => get_current_user_id(),
			'user_role'    => wp_get_current_user()->roles,
		);

		$matched = $this->get_matched_field_groups( $context );
		if ( empty( $matched ) ) {
			return;
		}

		wp_nonce_field( 'rdcfe_save_term_fields', 'rdcfe_term_fields_nonce' );

		foreach ( $matched as $group ) {
			$this->render_term_field_group( $group, 0, $taxonomy, 'add' );
		}
	}

	/**
	 * Render matching field groups on the "Edit term" form. WordPress fires
	 * this hook inside a `<table class="form-table">`, so each group is wrapped
	 * in `<tr><td colspan="2">` to fit that layout.
	 *
	 * @param \WP_Term $term Current term being edited.
	 * @param string   $taxonomy Taxonomy slug.
	 * @return void
	 */
	public function render_term_edit_form_fields( \WP_Term $term, string $taxonomy ): void {
		$context = $this->location_matcher->build_term_context( $term );
		$matched = $this->get_matched_field_groups( $context );

		if ( empty( $matched ) ) {
			return;
		}

		wp_nonce_field( 'rdcfe_save_term_fields', 'rdcfe_term_fields_nonce' );

		foreach ( $matched as $group ) {
			$this->render_term_field_group( $group, $term->term_id, $taxonomy, 'edit' );
		}
	}

	/**
	 * Render a single field group on a term form. Delegates the actual field
	 * markup to `TaxonomyMetaFieldsManager::render_meta_fields()` so taxonomy
	 * meta and field group fields share the same layout, styling, asset
	 * pipeline, and tab/accordion support — no duplicated rendering code.
	 *
	 * @param array<string, mixed> $group Field group configuration.
	 * @param int                  $term_id Term ID (0 on the add form).
	 * @param string               $taxonomy Taxonomy slug (used for unique IDs).
	 * @param string               $context_type Either `'add'` or `'edit'`.
	 * @return void
	 */
	private function render_term_field_group( array $group, int $term_id, string $taxonomy, string $context_type ): void {
		$group_data = $group['data'] ?? array();
		$fields     = $group_data['fields'] ?? array();

		if ( empty( $fields ) ) {
			return;
		}

		$taxonomy_renderer = $this->get_taxonomy_meta_fields_manager();
		if ( null === $taxonomy_renderer ) {
			return;
		}

		$title = $group_data['title'] ?? $group['title'] ?? '';

		if ( 'edit' === $context_type ) {
			// Title gets its own full-width row above the field rows so the
			// remaining fields can still flow as native form-table TR/TH/TD
			// rows aligned with WP's default Name/Slug/Description columns.
			if ( ! empty( $title ) ) {
				echo '<tr class="rdcfe-term-field-group__heading-row"><td colspan="2"><h2 class="rdcfe-term-field-group__title">' . esc_html( $title ) . '</h2></td></tr>';
			}
			$taxonomy_renderer->render_meta_fields( $fields, $term_id, 'edit', $taxonomy );
		} else {
			echo '<div class="form-field rdcfe-term-field-group">';
			if ( ! empty( $title ) ) {
				echo '<h2 class="rdcfe-term-field-group__title">' . esc_html( $title ) . '</h2>';
			}
			$taxonomy_renderer->render_meta_fields( $fields, $term_id, 'add', $taxonomy );
			echo '</div>';
		}
	}

	/**
	 * Resolve the shared `TaxonomyMetaFieldsManager` instance lazily from the
	 * plugin singleton. Lazy because the field group manager is wired up
	 * before the taxonomy manager during plugin bootstrap.
	 *
	 * @return TaxonomyMetaFieldsManager|null
	 */
	private function get_taxonomy_meta_fields_manager(): ?TaxonomyMetaFieldsManager {
		if ( ! class_exists( '\\RDCFE\\Plugin' ) ) {
			return null;
		}

		return \RDCFE\Plugin::get_instance()->get_taxonomy_meta_fields_manager();
	}

	/**
	 * Hook callback for `show_user_profile` (the current user's own profile).
	 *
	 * @param \WP_User $user Current user.
	 * @return void
	 */
	public function render_own_profile_fields( \WP_User $user ): void {
		$this->render_user_profile_fields( $user, 'profile' );
	}

	/**
	 * Hook callback for `edit_user_profile` (admins editing other users).
	 *
	 * @param \WP_User $user User being edited.
	 * @return void
	 */
	public function render_edit_user_fields( \WP_User $user ): void {
		$this->render_user_profile_fields( $user, 'edit' );
	}

	/**
	 * Hook callback for `user_new_form` (the Add New User screen).
	 *
	 * No `$user` exists yet on this screen, so we synthesize a minimal
	 * context (`user_form == add`) and render any matching field groups
	 * inline. Saved values land via the `user_register` action below.
	 *
	 * @param string $type Either `add-existing-user` (multisite) or
	 *                     `add-new-user`. Unused — we render in both cases.
	 * @return void
	 */
	public function render_new_user_fields( string $type ): void {
		unset( $type );

		$context = $this->location_matcher->build_user_context( 0, 'add' );
		$matched = $this->get_matched_field_groups( $context );

		if ( empty( $matched ) ) {
			return;
		}

		$assets = FieldAssetsManager::get_instance();
		$assets->enqueue_assets();
		$assets->enqueue_taxonomy_layout();
		$assets->enqueue_cpt_layout();

		wp_nonce_field( 'rdcfe_save_user_fields', 'rdcfe_user_fields_nonce' );

		foreach ( $matched as $group ) {
			$this->render_user_field_group( $group, 0 );
		}
	}

	/**
	 * Render every field group whose location rules match the given user
	 * (e.g. `user_role == administrator`) on the user profile / user edit
	 * screens. Each group is emitted as its own `<table class="form-table">`
	 * so labels sit in the left column and inputs in the right, matching
	 * native profile fields.
	 *
	 * @param \WP_User $user      The user being viewed/edited.
	 * @param string   $form_type Which user form is firing — `profile`,
	 *                            `edit` or `add`. Forwarded to the
	 *                            location matcher so `user_form` rules
	 *                            can scope to a specific screen.
	 * @return void
	 */
	public function render_user_profile_fields( \WP_User $user, string $form_type = 'edit' ): void {
		$context = $this->location_matcher->build_user_context( $user, $form_type );
		$matched = $this->get_matched_field_groups( $context );

		if ( empty( $matched ) ) {
			return;
		}

		// Load both the taxonomy form-table styling (for the simple row
		// layout) AND the CPT layout CSS — the latter ships the
		// `.rdcfe-tabs` / `.rdcfe-accordions` block styles we reuse when a
		// field group on a profile uses tab/accordion markers. Without
		// the CPT layout enqueue tabs would render unstyled inside the
		// colspan row we emit below.
		$assets = FieldAssetsManager::get_instance();
		$assets->enqueue_assets();
		$assets->enqueue_taxonomy_layout();
		$assets->enqueue_cpt_layout();

		wp_nonce_field( 'rdcfe_save_user_fields', 'rdcfe_user_fields_nonce' );

		foreach ( $matched as $group ) {
			$this->render_user_field_group( $group, $user->ID );
		}
	}

	/**
	 * Render one field group as a profile section: an `<h2>` heading followed
	 * by a `form-table` of native row-mode rows.
	 *
	 * @param array<string, mixed> $group Field group configuration.
	 * @param int                  $user_id Target user ID.
	 * @return void
	 */
	private function render_user_field_group( array $group, int $user_id ): void {
		$group_data = $group['data'] ?? array();
		$fields     = $group_data['fields'] ?? array();

		if ( empty( $fields ) ) {
			return;
		}

		$title = $group_data['title']
			?? $group['title']
			?? __( 'Custom Fields', 'rox-dynamic-cpt-fields-engine' );

		// Honor the metabox builder's tab/accordion/endpoint markers on
		// user profiles too. Authors who built a field group with a
		// vertical tab strip + accordion list and pointed it at a User
		// Role rule expect that exact layout to show up on the profile
		// edit screen — not a flat list with the markers silently
		// stripped out (which is what the previous flat foreach did).
		$layout    = $this->parse_user_field_layout( $fields );
		$sections  = $layout['sections'] ?? array();
		$tab_type  = $layout['tab_type'] ?? 'horizontal';

		$has_complex = false;
		foreach ( $sections as $section ) {
			$section_type = $section['type'] ?? 'fields';
			if ( 'tab' === $section_type || 'accordion' === $section_type ) {
				$has_complex = true;
				break;
			}
		}

		echo '<h2 class="rdcfe-user-field-group__title">' . esc_html( $title ) . '</h2>';
		echo '<table class="form-table rdcfe-user-fields" role="presentation"><tbody>';

		if ( $has_complex ) {
			// Complex layout doesn't fit the two-column form-table grid,
			// so we collapse the entire group into a single full-width
			// `<tr><td colspan="2">` row and let the CPT-style layout CSS
			// take over inside it. Same trick taxonomy edit-form uses.
			$unique_id = 'rdcfe_user_' . sanitize_key(
				(string) ( $group_data['id'] ?? $group['id'] ?? 'group' )
			);
			echo '<tr class="form-field rdcfe-user-meta-row"><td colspan="2">';
			echo '<div class="rdcfe-meta-box rdcfe-cpt-meta-fields rdcfe-user-fields-complex">';
			$this->render_user_section_blocks( $sections, $tab_type, $unique_id, $user_id );
			echo '</div>';
			echo '</td></tr>';
		} else {
			foreach ( $fields as $field ) {
				$this->render_user_field_row( $field, $user_id );
			}
		}

		echo '</tbody></table>';
	}

	/**
	 * Parse a flat user-meta fields array into a structured layout.
	 *
	 * Mirror of the parser used by CPT/Options/Taxonomy/MetaBox renderers
	 * — converts `tab` / `accordion` / `endpoint` markers into a sequence
	 * of "sections" so that downstream rendering can group consecutive
	 * tabs into a tab strip, consecutive accordions into an accordion
	 * list, etc., while honoring `endpoint` as a hard block separator.
	 *
	 * @param array<array<string, mixed>> $fields Flat field list.
	 * @return array{type:string, tab_type:string, sections:array<int,array<string,mixed>>}
	 */
	private function parse_user_field_layout( array $fields ): array {
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

		foreach ( $fields as $field ) {
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
	 * Walk parsed sections in order and emit each consecutive run as a
	 * block (tabs strip / accordions list / standalone fields), using
	 * user-meta lookups for current values.
	 *
	 * @param array<int, array<string, mixed>> $sections  Parsed sections in document order.
	 * @param string                           $tab_type  'horizontal'|'vertical' (applies to tab blocks only).
	 * @param string                           $unique_id DOM-safe ID prefix.
	 * @param int                              $user_id   Target user ID.
	 * @return void
	 */
	private function render_user_section_blocks( array $sections, string $tab_type, string $unique_id, int $user_id ): void {
		$count       = count( $sections );
		$index       = 0;
		$block_index = 0;

		while ( $index < $count ) {
			$section_type = $sections[ $index ]['type'] ?? 'fields';

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
				$this->render_user_tabs_block( $run, $tab_type, $unique_id . '_b' . $block_index, $user_id );
			} elseif ( 'accordion' === $section_type ) {
				$run = array();
				while ( $index < $count && 'accordion' === ( $sections[ $index ]['type'] ?? '' ) ) {
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_user_accordions_block( $run, $unique_id . '_b' . $block_index, $user_id );
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
				$this->render_user_fields_block( $run, $user_id );
			}

			++$block_index;
		}
	}

	/**
	 * Render a run of standalone field sections as one flat fields grid.
	 *
	 * @param array<int, array<string, mixed>> $sections Section subset (all `type === 'fields'`).
	 * @param int                              $user_id  Target user ID.
	 * @return void
	 */
	private function render_user_fields_block( array $sections, int $user_id ): void {
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
				$this->render_user_field_div( $field, $user_id );
			}
		}
		echo '</div>';
	}

	/**
	 * Render a run of tab sections as one horizontal/vertical tab strip.
	 *
	 * @param array<int, array<string, mixed>> $sections  Section subset (all `type === 'tab'`).
	 * @param string                           $tab_type  'horizontal'|'vertical'.
	 * @param string                           $unique_id DOM-safe ID prefix for THIS strip.
	 * @param int                              $user_id   Target user ID.
	 * @return void
	 */
	private function render_user_tabs_block( array $sections, string $tab_type, string $unique_id, int $user_id ): void {
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
				$this->render_user_field_div( $field, $user_id );
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
	 * @param array<int, array<string, mixed>> $sections  Section subset (all `type === 'accordion'`).
	 * @param string                           $unique_id DOM-safe ID prefix for THIS list.
	 * @param int                              $user_id   Target user ID.
	 * @return void
	 */
	private function render_user_accordions_block( array $sections, string $unique_id, int $user_id ): void {
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
				$this->render_user_field_div( $field, $user_id );
			}
			echo '</div>';
			echo '</div>';

			echo '</div>';
		}

		echo '</div>';
	}

	/**
	 * Render a single user field in div mode (used inside tab panels and
	 * accordion content where the form-table two-column row layout
	 * doesn't apply). Defers all label / input / description markup to
	 * the field type's own `render()`, which already handles the standard
	 * `.rdcfe-field` structure consistently with every other surface.
	 *
	 * @param array<string, mixed> $field Field configuration.
	 * @param int                  $user_id Target user ID.
	 * @return void
	 */
	private function render_user_field_div( array $field, int $user_id ): void {
		$object_type = $field['object_type'] ?? 'field';
		if ( 'field' !== $object_type ) {
			return;
		}

		$type     = $field['type'] ?? 'text';
		$registry = FieldTypeRegistry::get_instance();

		$field_type = $registry->get( $type ) ?? $registry->get( 'text' );
		if ( null === $field_type ) {
			return;
		}

		$meta_key = $field['name'] ?? '';
		if ( '' === $meta_key ) {
			return;
		}

		$value = get_user_meta( $user_id, $meta_key, true );
		if ( '' === $value || null === $value ) {
			$value = $field_type->get_default_value( $field );
		}

		$field_type->render( $field, $value, $user_id );
	}

	/**
	 * Render a single field as a `<tr><th><label></th><td>input</td></tr>` row
	 * inside the profile form-table.
	 *
	 * @param array<string, mixed> $field Field configuration.
	 * @param int                  $user_id Target user ID.
	 * @return void
	 */
	private function render_user_field_row( array $field, int $user_id ): void {
		$object_type = $field['object_type'] ?? 'field';
		if ( 'field' !== $object_type ) {
			return;
		}

		$field_name  = $field['name'] ?? '';
		$field_label = $field['label'] ?? '';
		$description = $field['description'] ?? '';
		$required    = ! empty( $field['required'] );
		$type        = $field['type'] ?? 'text';

		if ( '' === $field_name ) {
			return;
		}

		$registry   = FieldTypeRegistry::get_instance();
		$field_type = $registry->get( $type ) ?? $registry->get( 'text' );
		if ( null === $field_type ) {
			return;
		}

		$value = get_user_meta( $user_id, $field_name, true );
		if ( '' === $value || null === $value ) {
			$value = $field_type->get_default_value( $field );
		}

		?>
		<tr class="form-field rdcfe-user-field<?php echo $required ? ' form-required' : ''; ?>" data-field-name="<?php echo esc_attr( $field_name ); ?>">
			<th scope="row">
				<label for="<?php echo esc_attr( $field_name ); ?>">
					<?php echo esc_html( $field_label ); ?>
					<?php if ( $required ) : ?>
						<span class="rdcfe-required">*</span>
					<?php endif; ?>
				</label>
			</th>
			<td>
				<?php $field_type->render( $field, $value, $user_id ); ?>
				<?php if ( '' !== $description ) : ?>
					<p class="description"><?php echo esc_html( $description ); ?></p>
				<?php endif; ?>
			</td>
		</tr>
		<?php
	}

	/**
	 * Save user meta for every field group that matches the user's context.
	 * Fires from `personal_options_update` (own profile) and
	 * `edit_user_profile_update` (other users' profile).
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public function save_user_profile_fields( int $user_id ): void {
		// Whether the current request is the user editing themselves vs an
		// admin editing another user. Mirrors which hook fired so the
		// matched groups stay consistent with what was rendered.
		$form_type = ( get_current_user_id() === $user_id ) ? 'profile' : 'edit';
		$this->persist_user_fields( $user_id, $form_type );
	}

	/**
	 * Save user meta for field groups that matched on the Add New User
	 * screen. Hook callback for `user_register`, which fires immediately
	 * after the user row is created and before redirect.
	 *
	 * @param int $user_id Newly created user ID.
	 * @return void
	 */
	public function save_new_user_fields( int $user_id ): void {
		$this->persist_user_fields( $user_id, 'add' );
	}

	/**
	 * Shared persistence path for all user-form save hooks.
	 *
	 * @param int    $user_id   The user whose meta is being written.
	 * @param string $form_type The form that produced the submit:
	 *                          `add`, `edit` or `profile`.
	 * @return void
	 */
	private function persist_user_fields( int $user_id, string $form_type ): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified below.
		if ( ! isset( $_POST['rdcfe_user_fields_nonce'] ) ) {
			return;
		}

		if ( ! wp_verify_nonce(
			sanitize_text_field( wp_unslash( $_POST['rdcfe_user_fields_nonce'] ) ),
			'rdcfe_save_user_fields'
		) ) {
			return;
		}

		// `create_users` covers the Add New User flow; `edit_user` covers
		// the profile + edit-user flows. Pick the right cap for the form.
		$required_cap = ( 'add' === $form_type ) ? 'create_users' : 'edit_user';
		if ( 'add' === $form_type ) {
			if ( ! current_user_can( $required_cap ) ) {
				return;
			}
		} elseif ( ! current_user_can( $required_cap, $user_id ) ) {
			return;
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return;
		}

		$context  = $this->location_matcher->build_user_context( $user, $form_type );
		$matched  = $this->get_matched_field_groups( $context );
		$registry = FieldTypeRegistry::get_instance();

		foreach ( $matched as $group ) {
			$fields = $group['data']['fields'] ?? array();
			foreach ( $fields as $field ) {
				$this->save_user_field( $user_id, $field, $registry );
			}
		}

		/**
		 * Fires after user meta is saved for all matching field groups.
		 *
		 * @since 1.0.0
		 *
		 * @param int      $user_id   User ID.
		 * @param \WP_User $user      User object.
		 * @param string   $form_type Which user form fired the save.
		 */
		do_action( 'rdcfe_after_save_user_fields', $user_id, $user, $form_type );
	}

	/**
	 * Sanitize, validate and persist a single field's value to user meta.
	 *
	 * @param int                  $user_id User ID.
	 * @param array<string, mixed> $field Field configuration.
	 * @param FieldTypeRegistry    $registry Shared field type registry.
	 * @return void
	 */
	private function save_user_field( int $user_id, array $field, FieldTypeRegistry $registry ): void {
		$object_type = $field['object_type'] ?? 'field';
		if ( 'field' !== $object_type ) {
			return;
		}

		$meta_key = $field['name'] ?? '';
		if ( '' === $meta_key ) {
			return;
		}

		$type       = $field['type'] ?? 'text';
		$field_type = $registry->get( $type ) ?? $registry->get( 'text' );
		if ( null === $field_type ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce verified by caller; sanitization happens via field type.
		$raw_value = isset( $_POST[ $meta_key ] ) ? wp_unslash( $_POST[ $meta_key ] ) : null;
		$value     = $field_type->sanitize( $raw_value, $field );

		$validation = $field_type->validate( $value, $field );
		if ( is_wp_error( $validation ) ) {
			set_transient(
				'rdcfe_user_field_error_' . $user_id . '_' . $meta_key,
				$validation->get_error_message(),
				60
			);
			return;
		}

		if ( '' === $value || null === $value || ( is_array( $value ) && empty( $value ) ) ) {
			delete_user_meta( $user_id, $meta_key );
		} else {
			update_user_meta( $user_id, $meta_key, $value );
		}

		/**
		 * Fires after a user meta field is saved.
		 *
		 * @since 1.0.0
		 *
		 * @param string $meta_key The meta key.
		 * @param mixed  $value The saved value.
		 * @param int    $user_id The user ID.
		 * @param array  $field The field configuration.
		 */
		do_action( 'rdcfe_user_field_saved', $meta_key, $value, $user_id, $field );
	}

	/**
	 * Save term meta for every field group that matches the term's context.
	 *
	 * @param int $term_id Term ID.
	 * @param int $tt_id Term taxonomy ID (unused).
	 * @return void
	 */
	public function save_term_metaboxes( int $term_id, int $tt_id ): void {
		unset( $tt_id );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified below.
		if ( ! isset( $_POST['rdcfe_term_fields_nonce'] ) ) {
			return;
		}

		if ( ! wp_verify_nonce(
			sanitize_text_field( wp_unslash( $_POST['rdcfe_term_fields_nonce'] ) ),
			'rdcfe_save_term_fields'
		) ) {
			return;
		}

		$term = get_term( $term_id );
		if ( ! $term || is_wp_error( $term ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_term', $term_id ) ) {
			return;
		}

		$context = $this->location_matcher->build_term_context( $term );
		$matched = $this->get_matched_field_groups( $context );

		$taxonomy_renderer = $this->get_taxonomy_meta_fields_manager();
		if ( null === $taxonomy_renderer ) {
			return;
		}

		foreach ( $matched as $group ) {
			$fields = $group['data']['fields'] ?? array();
			if ( empty( $fields ) ) {
				continue;
			}
			$taxonomy_renderer->save_meta_fields( $term_id, $fields );
		}

		/**
		 * Fires after term meta is saved for all matching field groups.
		 *
		 * @since 1.0.0
		 *
		 * @param int      $term_id Term ID.
		 * @param \WP_Term $term Term object.
		 */
		do_action( 'rdcfe_after_save_term_fields', $term_id, $term );
	}

	/**
	 * Filter all field groups down to those whose location rules match the
	 * supplied context, sorted by menu order/priority.
	 *
	 * @param array<string, mixed> $context Location matcher context.
	 * @return array<array<string, mixed>>
	 */
	private function get_matched_field_groups( array $context ): array {
		$field_groups = $this->get_all_field_groups();

		$matched = array_filter(
			$field_groups,
			fn( $group ) => $this->location_matcher->matches( $group['data'] ?? array(), $context )
		);

		usort( $matched, array( $this, 'compare_match_priority' ) );

		return $matched;
	}

	/**
	 * usort callback that orders matched field groups by
	 * `match_priority` (descending — higher priority loads first), and
	 * falls back to legacy `menu_order` (ascending) when priorities tie.
	 *
	 * `match_priority` is a numeric 0-100 metabox priority introduced in
	 * and is intentionally distinct from WP's `add_meta_box`
	 * `$priority` argument (`'high' | 'core' | 'default' | 'low'`), which
	 * controls *intra-context* WP ordering only.
	 *
	 * @param array<string, mixed> $a Field group A (config repository row).
	 * @param array<string, mixed> $b Field group B (config repository row).
	 * @return int <=> result for usort.
	 */
	private function compare_match_priority( array $a, array $b ): int {
		$mp_a = (int) ( $a['data']['match_priority'] ?? 10 );
		$mp_b = (int) ( $b['data']['match_priority'] ?? 10 );

		if ( $mp_a !== $mp_b ) {
			return $mp_b <=> $mp_a; // Higher first.
		}

		$mo_a = (int) ( $a['data']['menu_order'] ?? 0 );
		$mo_b = (int) ( $b['data']['menu_order'] ?? 0 );

		return $mo_a <=> $mo_b; // Lower first.
	}

	/**
	 * Get field value for a post.
	 *
	 * @param int    $post_id The post ID.
	 * @param string $field_name The field name.
	 * @param bool   $format Whether to format the value.
	 * @return mixed
	 */
	public function get_field_value( int $post_id, string $field_name, bool $format = true ): mixed {
		$value = get_post_meta( $post_id, $field_name, true );

		if ( ! $format ) {
			return $value;
		}

		// Find field configuration to format value.
		$field_config = $this->find_field_config( $field_name );

		if ( ! $field_config ) {
			return $value;
		}

		$field_type = FieldTypeRegistry::get_instance()->get( $field_config['type'] ?? 'text' );

		if ( $field_type ) {
			return $field_type->format( $value, $field_config );
		}

		return $value;
	}

	/**
	 * Find field configuration by name.
	 *
	 * @param string $field_name The field name.
	 * @return array<string, mixed>|null
	 */
	private function find_field_config( string $field_name ): ?array {
		$field_groups = $this->get_all_field_groups();

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
	 * Register a local field group from PHP API.
	 *
	 * @param array<string, mixed> $config The field group configuration.
	 * @return bool True on success.
	 */
	public function register_local_field_group( array $config ): bool {
		$key = $config['key'] ?? $config['slug'] ?? '';

		if ( empty( $key ) ) {
			return false;
		}

		// Normalize the config to match database format.
		$this->local_field_groups[ $key ] = array(
			'id'    => 0,
			'title' => $config['title'] ?? '',
			'data'  => $config,
		);

		return true;
	}

	/**
	 * Get all field groups (database + local).
	 *
	 * @return array<array<string, mixed>>
	 */
	public function get_all_field_groups(): array {
		$db_groups = $this->config_repository->get_all( 'field_group', 'publish' );
		return array_merge( $db_groups, array_values( $this->local_field_groups ) );
	}
}

