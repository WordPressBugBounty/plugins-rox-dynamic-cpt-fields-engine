<?php
/**
 * Post Type Registrar
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Registration;

/**
 * Class PostTypeRegistrar
 *
 * Handles registration of custom post types from saved configurations.
 */
class PostTypeRegistrar {

	/**
	 * Register a post type from configuration.
	 *
	 * @param array<string, mixed> $config The post type configuration.
	 * @return \WP_Post_Type|\WP_Error The registered post type or WP_Error on failure.
	 */
	public function register( array $config ): \WP_Post_Type|\WP_Error {
		$slug = $config['slug'] ?? '';

		if ( empty( $slug ) ) {
			return new \WP_Error(
				'missing_slug',
				__( 'Post type slug is required.', 'rox-dynamic-cpt-fields-engine' )
			);
		}

		// Check if post type already exists (not ours).
		if ( post_type_exists( $slug ) && ! $this->is_rdcfe_post_type( $slug ) ) {
			return new \WP_Error(
				'already_exists',
				sprintf(
					/* translators: %s: post type slug */
					__( 'Post type "%s" is already registered by another plugin or theme.', 'rox-dynamic-cpt-fields-engine' ),
					$slug
				)
			);
		}

		// Build labels.
		$labels = $this->build_labels( $config );

		// Build args.
		$args = $this->build_args( $config, $labels );

		/**
		 * Filter the post type args before registration.
		 *
		 * @since 1.0.0
		 *
		 * @param array $args   The post type arguments.
		 * @param array $config The original configuration.
		 */
		$args = apply_filters( 'rdcfe_register_post_type_args', $args, $config );

		// Register the post type.
		$result = register_post_type( $slug, $args );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Mark as DCFE post type.
		$this->mark_as_rdcfe_post_type( $slug );

		/**
		 * Fires after a post type is registered.
		 *
		 * @since 1.0.0
		 *
		 * @param string        $slug   The post type slug.
		 * @param \WP_Post_Type $result The registered post type object.
		 * @param array         $config The configuration used.
		 */
		do_action( 'rdcfe_post_type_registered', $slug, $result, $config );

		return $result;
	}

	/**
	 * Build labels array from configuration.
	 *
	 * @param array<string, mixed> $config The configuration.
	 * @return array<string, string> The labels array.
	 */
	private function build_labels( array $config ): array {
		$label          = $config['label'] ?? $config['slug'] ?? 'Items';
		$singular_label = $config['singular_label'] ?? $label;

		// Use custom labels if provided.
		if ( ! empty( $config['labels'] ) && is_array( $config['labels'] ) ) {
			return wp_parse_args( $config['labels'], $this->get_default_labels( $label, $singular_label ) );
		}

		return $this->get_default_labels( $label, $singular_label );
	}

	/**
	 * Get default labels.
	 *
	 * @param string $plural   The plural label.
	 * @param string $singular The singular label.
	 * @return array<string, string>
	 */
	private function get_default_labels( string $plural, string $singular ): array {
		return array(
			'name'                     => $plural,
			'singular_name'            => $singular,
			'add_new'                  => __( 'Add New', 'rox-dynamic-cpt-fields-engine' ),
			/* translators: %s: singular label */
			'add_new_item'             => sprintf( __( 'Add New %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'edit_item'                => sprintf( __( 'Edit %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'new_item'                 => sprintf( __( 'New %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'view_item'                => sprintf( __( 'View %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: plural label */
			'view_items'               => sprintf( __( 'View %s', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: plural label */
			'search_items'             => sprintf( __( 'Search %s', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: plural label */
			'not_found'                => sprintf( __( 'No %s found.', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: plural label */
			'not_found_in_trash'       => sprintf( __( 'No %s found in Trash.', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: singular label */
			'parent_item_colon'        => sprintf( __( 'Parent %s:', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: plural label */
			'all_items'                => sprintf( __( 'All %s', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: singular label */
			'archives'                 => sprintf( __( '%s Archives', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'attributes'               => sprintf( __( '%s Attributes', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'insert_into_item'         => sprintf( __( 'Insert into %s', 'rox-dynamic-cpt-fields-engine' ), strtolower( $singular ) ),
			/* translators: %s: singular label */
			'uploaded_to_this_item'    => sprintf( __( 'Uploaded to this %s', 'rox-dynamic-cpt-fields-engine' ), strtolower( $singular ) ),
			/* translators: %s: plural label */
			'filter_items_list'        => sprintf( __( 'Filter %s list', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: plural label */
			'items_list_navigation'    => sprintf( __( '%s list navigation', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: plural label */
			'items_list'               => sprintf( __( '%s list', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: singular label */
			'item_published'           => sprintf( __( '%s published.', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'item_published_privately' => sprintf( __( '%s published privately.', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'item_reverted_to_draft'   => sprintf( __( '%s reverted to draft.', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'item_scheduled'           => sprintf( __( '%s scheduled.', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'item_updated'             => sprintf( __( '%s updated.', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			'menu_name'                => $plural,
			'name_admin_bar'           => $singular,
		);
	}

	/**
	 * Build registration args from configuration.
	 *
	 * @param array<string, mixed>  $config The configuration.
	 * @param array<string, string> $labels The labels array.
	 * @return array<string, mixed>
	 */
	private function build_args( array $config, array $labels ): array {
		$args = array(
			'labels'              => $labels,
			'public'              => $config['public'] ?? true,
			'publicly_queryable'  => $config['publicly_queryable'] ?? ( $config['public'] ?? true ),
			'show_ui'             => $config['show_ui'] ?? true,
			'show_in_menu'        => $config['show_in_menu'] ?? true,
			'show_in_nav_menus'   => $config['show_in_nav_menus'] ?? true,
			'show_in_admin_bar'   => $config['show_in_admin_bar'] ?? true,
			'show_in_rest'        => $config['show_in_rest'] ?? true,
			'menu_position'       => $config['menu_position'] ?? null,
			'menu_icon'           => $config['menu_icon'] ?? 'dashicons-admin-post',
			'capability_type'     => $config['capability_type'] ?? 'post',
			'map_meta_cap'        => $config['map_meta_cap'] ?? true,
			'hierarchical'        => $config['hierarchical'] ?? false,
			'supports'            => $config['supports'] ?? array( 'title', 'editor', 'thumbnail' ),
			'has_archive'         => $config['has_archive'] ?? true,
			'rewrite'             => $this->build_rewrite_args( $config ),
			'query_var'           => $config['query_var'] ?? true,
			'can_export'          => $config['can_export'] ?? true,
			'delete_with_user'    => $config['delete_with_user'] ?? false,
			'exclude_from_search' => $config['exclude_from_search'] ?? false,
		);

		// Add REST base if provided.
		if ( ! empty( $config['rest_base'] ) ) {
			$args['rest_base'] = $config['rest_base'];
		}

		// Add description if provided.
		if ( ! empty( $config['description'] ) ) {
			$args['description'] = $config['description'];
		}

		// Handle taxonomies.
		if ( ! empty( $config['taxonomies'] ) && is_array( $config['taxonomies'] ) ) {
			$args['taxonomies'] = $config['taxonomies'];
		}

		return $args;
	}

	/**
	 * Build rewrite args from configuration.
	 *
	 * @param array<string, mixed> $config The configuration.
	 * @return array<string, mixed>|bool
	 */
	private function build_rewrite_args( array $config ): array|bool {
		// If rewrite is explicitly false, return false.
		if ( isset( $config['rewrite'] ) && false === $config['rewrite'] ) {
			return false;
		}

		// If rewrite is an array, use it.
		if ( isset( $config['rewrite'] ) && is_array( $config['rewrite'] ) ) {
			return $config['rewrite'];
		}

		// Build default rewrite args.
		// Note: `??` would fall through only on `null`, but the form sends an
		// empty string when the user leaves "Custom Slug" blank — so we use
		// an explicit empty check to honour the documented "leave empty to
		// use post type slug" behaviour.
		$rewrite_slug = ! empty( $config['rewrite_slug'] )
			? $config['rewrite_slug']
			: ( $config['slug'] ?? '' );

		$rewrite = array(
			'slug'       => $rewrite_slug,
			'with_front' => $config['rewrite_with_front'] ?? true,
			'feeds'      => $config['rewrite_feeds'] ?? ( $config['has_archive'] ?? true ),
			'pages'      => $config['rewrite_pages'] ?? true,
		);

		return $rewrite;
	}

	/**
	 * Check if a post type is registered by DCFE.
	 *
	 * @param string $slug The post type slug.
	 * @return bool
	 */
	public function is_rdcfe_post_type( string $slug ): bool {
		$rdcfe_post_types = get_option( 'rdcfe_registered_post_types', array() );
		return in_array( $slug, $rdcfe_post_types, true );
	}

	/**
	 * Mark a post type as registered by DCFE.
	 *
	 * @param string $slug The post type slug.
	 * @return void
	 */
	private function mark_as_rdcfe_post_type( string $slug ): void {
		$rdcfe_post_types = get_option( 'rdcfe_registered_post_types', array() );

		if ( ! in_array( $slug, $rdcfe_post_types, true ) ) {
			$rdcfe_post_types[] = $slug;
			update_option( 'rdcfe_registered_post_types', $rdcfe_post_types );
		}
	}

	/**
	 * Unregister a post type.
	 *
	 * @param string $slug The post type slug.
	 * @return bool True on success.
	 */
	public function unregister( string $slug ): bool {
		// Remove from DCFE tracking.
		$rdcfe_post_types = get_option( 'rdcfe_registered_post_types', array() );
		$rdcfe_post_types = array_diff( $rdcfe_post_types, array( $slug ) );
		update_option( 'rdcfe_registered_post_types', $rdcfe_post_types );

		// Note: WordPress doesn't support unregistering post types at runtime.
		// The post type will stop being registered on next request.
		return true;
	}
}

