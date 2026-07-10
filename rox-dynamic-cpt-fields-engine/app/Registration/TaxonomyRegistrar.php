<?php
/**
 * Taxonomy Registrar
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Registration;

/**
 * Class TaxonomyRegistrar
 *
 * Handles registration of custom taxonomies from saved configurations.
 */
class TaxonomyRegistrar {

	/**
	 * Register a taxonomy from configuration.
	 *
	 * @param array<string, mixed> $config The taxonomy configuration.
	 * @return \WP_Taxonomy|\WP_Error The registered taxonomy or WP_Error on failure.
	 */
	public function register( array $config ): \WP_Taxonomy|\WP_Error {
		// Normalize config - map frontend field names to backend field names.
		$config = $this->normalize_config( $config );

		$slug = $config['slug'] ?? '';

		if ( empty( $slug ) ) {
			return new \WP_Error(
				'missing_slug',
				__( 'Taxonomy slug is required.', 'rox-dynamic-cpt-fields-engine' )
			);
		}

		// Check if taxonomy already exists (not ours).
		if ( taxonomy_exists( $slug ) && ! $this->is_rdcfe_taxonomy( $slug ) ) {
			return new \WP_Error(
				'already_exists',
				sprintf(
					/* translators: %s: taxonomy slug */
					__( 'Taxonomy "%s" is already registered by another plugin or theme.', 'rox-dynamic-cpt-fields-engine' ),
					$slug
				)
			);
		}

		// Get post types to attach to.
		$post_types = $config['post_types'] ?? array();

		if ( empty( $post_types ) ) {
			return new \WP_Error(
				'missing_post_types',
				__( 'At least one post type must be specified.', 'rox-dynamic-cpt-fields-engine' )
			);
		}

		// Build labels.
		$labels = $this->build_labels( $config );

		// Build args.
		$args = $this->build_args( $config, $labels );

		/**
		 * Filter the taxonomy args before registration.
		 *
		 * @since 1.0.0
		 *
		 * @param array $args   The taxonomy arguments.
		 * @param array $config The original configuration.
		 */
		$args = apply_filters( 'rdcfe_register_taxonomy_args', $args, $config );

		// Register the taxonomy.
		$result = register_taxonomy( $slug, $post_types, $args );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Mark as DCFE taxonomy.
		$this->mark_as_rdcfe_taxonomy( $slug );

		/**
		 * Fires after a taxonomy is registered.
		 *
		 * @since 1.0.0
		 *
		 * @param string        $slug   The taxonomy slug.
		 * @param \WP_Taxonomy  $result The registered taxonomy object.
		 * @param array         $config The configuration used.
		 */
		do_action( 'rdcfe_taxonomy_registered', $slug, $result, $config );

		return $result;
	}

	/**
	 * Build labels array from configuration.
	 *
	 * @param array<string, mixed> $config The configuration.
	 * @return array<string, string> The labels array.
	 */
	private function build_labels( array $config ): array {
		$label          = $config['label'] ?? $config['slug'] ?? 'Terms';
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
			'name'                       => $plural,
			'singular_name'              => $singular,
			/* translators: %s: plural label */
			'search_items'               => sprintf( __( 'Search %s', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: plural label */
			'popular_items'              => sprintf( __( 'Popular %s', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: plural label */
			'all_items'                  => sprintf( __( 'All %s', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: singular label */
			'parent_item'                => sprintf( __( 'Parent %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'parent_item_colon'          => sprintf( __( 'Parent %s:', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'edit_item'                  => sprintf( __( 'Edit %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'view_item'                  => sprintf( __( 'View %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'update_item'                => sprintf( __( 'Update %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'add_new_item'               => sprintf( __( 'Add New %s', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: singular label */
			'new_item_name'              => sprintf( __( 'New %s Name', 'rox-dynamic-cpt-fields-engine' ), $singular ),
			/* translators: %s: plural label */
			'separate_items_with_commas' => sprintf( __( 'Separate %s with commas', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: plural label */
			'add_or_remove_items'        => sprintf( __( 'Add or remove %s', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: plural label */
			'choose_from_most_used'      => sprintf( __( 'Choose from the most used %s', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: plural label */
			'not_found'                  => sprintf( __( 'No %s found.', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: plural label */
			'no_terms'                   => sprintf( __( 'No %s', 'rox-dynamic-cpt-fields-engine' ), strtolower( $plural ) ),
			/* translators: %s: plural label */
			'filter_by_item'             => sprintf( __( 'Filter by %s', 'rox-dynamic-cpt-fields-engine' ), strtolower( $singular ) ),
			/* translators: %s: plural label */
			'items_list_navigation'      => sprintf( __( '%s list navigation', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: plural label */
			'items_list'                 => sprintf( __( '%s list', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			/* translators: %s: plural label */
			'back_to_items'              => sprintf( __( '&larr; Back to %s', 'rox-dynamic-cpt-fields-engine' ), $plural ),
			'menu_name'                  => $plural,
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
			'labels'                => $labels,
			'public'                => $config['public'] ?? true,
			'publicly_queryable'    => $config['publicly_queryable'] ?? ( $config['public'] ?? true ),
			'show_ui'               => $config['show_ui'] ?? true,
			'show_in_menu'          => $config['show_in_menu'] ?? ( $config['show_ui'] ?? true ),
			'show_in_nav_menus'     => $config['show_in_nav_menus'] ?? true,
			'show_in_rest'          => $config['show_in_rest'] ?? true,
			'show_tagcloud'         => $config['show_tagcloud'] ?? true,
			'show_in_quick_edit'    => $config['show_in_quick_edit'] ?? true,
			'show_admin_column'     => $config['show_admin_column'] ?? true,
			'hierarchical'          => $config['hierarchical'] ?? true,
			'rewrite'               => $this->build_rewrite_args( $config ),
			'query_var'             => $config['query_var'] ?? true,
		);

		// Add REST base if provided.
		if ( ! empty( $config['rest_base'] ) ) {
			$args['rest_base'] = $config['rest_base'];
		}

		// Add description if provided.
		if ( ! empty( $config['description'] ) ) {
			$args['description'] = $config['description'];
		}

		// Add default term if provided.
		if ( ! empty( $config['default_term'] ) ) {
			$args['default_term'] = $config['default_term'];
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
		// use taxonomy slug" behaviour.
		$rewrite_slug = ! empty( $config['rewrite_slug'] )
			? $config['rewrite_slug']
			: ( $config['slug'] ?? '' );

		$rewrite = array(
			'slug'         => $rewrite_slug,
			'with_front'   => $config['rewrite_with_front'] ?? true,
			'hierarchical' => $config['hierarchical'] ?? true,
		);

		return $rewrite;
	}

	/**
	 * Check if a taxonomy is registered by DCFE.
	 *
	 * @param string $slug The taxonomy slug.
	 * @return bool
	 */
	public function is_rdcfe_taxonomy( string $slug ): bool {
		$rdcfe_taxonomies = get_option( 'rdcfe_registered_taxonomies', array() );
		return in_array( $slug, $rdcfe_taxonomies, true );
	}

	/**
	 * Mark a taxonomy as registered by DCFE.
	 *
	 * @param string $slug The taxonomy slug.
	 * @return void
	 */
	private function mark_as_rdcfe_taxonomy( string $slug ): void {
		$rdcfe_taxonomies = get_option( 'rdcfe_registered_taxonomies', array() );

		if ( ! in_array( $slug, $rdcfe_taxonomies, true ) ) {
			$rdcfe_taxonomies[] = $slug;
			update_option( 'rdcfe_registered_taxonomies', $rdcfe_taxonomies );
		}
	}

	/**
	 * Unregister a taxonomy.
	 *
	 * @param string $slug The taxonomy slug.
	 * @return bool True on success.
	 */
	public function unregister( string $slug ): bool {
		// Remove from DCFE tracking.
		$rdcfe_taxonomies = get_option( 'rdcfe_registered_taxonomies', array() );
		$rdcfe_taxonomies = array_diff( $rdcfe_taxonomies, array( $slug ) );
		update_option( 'rdcfe_registered_taxonomies', $rdcfe_taxonomies );

		// Note: WordPress doesn't support unregistering taxonomies at runtime.
		// The taxonomy will stop being registered on next request.
		return true;
	}

	/**
	 * Normalize config by mapping frontend field names to backend field names.
	 *
	 * @param array<string, mixed> $config The raw configuration.
	 * @return array<string, mixed> Normalized configuration.
	 */
	private function normalize_config( array $config ): array {
		// Map object_type to post_types (frontend sends object_type).
		if ( ! empty( $config['object_type'] ) && empty( $config['post_types'] ) ) {
			$config['post_types'] = $config['object_type'];
		}

		// Map plural_label to label (frontend sends plural_label).
		if ( ! empty( $config['plural_label'] ) && empty( $config['label'] ) ) {
			$config['label'] = $config['plural_label'];
		}

		// Map title to label as fallback.
		if ( ! empty( $config['title'] ) && empty( $config['label'] ) ) {
			$config['label'] = $config['title'];
		}

		return $config;
	}
}

