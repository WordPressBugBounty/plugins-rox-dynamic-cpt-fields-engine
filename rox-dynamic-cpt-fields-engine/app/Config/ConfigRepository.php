<?php
/**
 * Config Repository
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Config;

/**
 * Class ConfigRepository
 *
 * Handles CRUD operations for configurations stored in the rdcfe_config post type.
 */
class ConfigRepository {

	/**
	 * Create a new configuration.
	 *
	 * @param string       $config_type The config type (post_type, taxonomy, etc.).
	 * @param string       $title The configuration title/name.
	 * @param array<mixed> $data The configuration data.
	 * @param string       $status Post status (publish, draft).
	 * @return int|\WP_Error Post ID on success, WP_Error on failure.
	 */
	public function create( string $config_type, string $title, array $data, string $status = 'publish' ): int|\WP_Error {
		// Validate config type.
		if ( ! in_array( $config_type, ConfigPostType::CONFIG_TYPES, true ) ) {
			return new \WP_Error(
				'invalid_config_type',
				__( 'Invalid configuration type.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 400 )
			);
		}

		// Generate slug from title if not provided in data.
		$slug = $data['slug'] ?? sanitize_title( $title );

		// Check for duplicate slug.
		if ( $this->slug_exists( $config_type, $slug ) ) {
			return new \WP_Error(
				'duplicate_slug',
				__( 'A configuration with this slug already exists.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 409 )
			);
		}

		// Create the post.
		$post_data = array(
			'post_type'   => ConfigPostType::POST_TYPE,
			'post_title'  => sanitize_text_field( $title ),
			'post_name'   => $slug,
			'post_status' => in_array( $status, array( 'publish', 'draft' ), true ) ? $status : 'publish',
		);

		$post_id = wp_insert_post( $post_data, true );

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		// Add slug to data if not present.
		$data['slug'] = $slug;

		// Save meta.
		update_post_meta( $post_id, ConfigPostType::META_CONFIG_TYPE, $config_type );
		update_post_meta( $post_id, ConfigPostType::META_CONFIG_DATA, wp_json_encode( $data, JSON_UNESCAPED_UNICODE ) );
		update_post_meta( $post_id, ConfigPostType::META_SCHEMA_VERSION, '1.0.0' );

		/**
		 * Fires after a config is created.
		 *
		 * @since 1.0.0
		 *
		 * @param int    $post_id The config post ID.
		 * @param string $config_type The config type.
		 * @param array  $data The config data.
		 */
		do_action( 'rdcfe_config_created', $post_id, $config_type, $data );

		return $post_id;
	}

	/**
	 * Get a configuration by ID.
	 *
	 * @param int $id The configuration post ID.
	 * @return array<string, mixed>|null The configuration data or null if not found.
	 */
	public function get( int $id ): ?array {
		$post = get_post( $id );

		if ( ! $post || $post->post_type !== ConfigPostType::POST_TYPE ) {
			return null;
		}

		return $this->format_config( $post );
	}

	/**
	 * Get a configuration by slug and type.
	 *
	 * @param string $config_type The config type.
	 * @param string $slug The configuration slug.
	 * @return array<string, mixed>|null The configuration data or null if not found.
	 */
	public function get_by_slug( string $config_type, string $slug ): ?array {
		$posts = get_posts(
			array(
				'post_type'   => ConfigPostType::POST_TYPE,
				'name'        => $slug,
				'meta_key'    => ConfigPostType::META_CONFIG_TYPE,
				'meta_value'  => $config_type,
				'numberposts' => 1,
				'post_status' => array( 'publish', 'draft' ),
			)
		);

		if ( empty( $posts ) ) {
			return null;
		}

		return $this->format_config( $posts[0] );
	}

	/**
	 * Get all configurations of a specific type.
	 *
	 * @param string $config_type The config type.
	 * @param string $status Post status filter (all, publish, draft).
	 * @return array<array<string, mixed>> Array of configuration data.
	 */
	public function get_all( string $config_type, string $status = 'all' ): array {
		$args = array(
			'post_type'   => ConfigPostType::POST_TYPE,
			'meta_key'    => ConfigPostType::META_CONFIG_TYPE,
			'meta_value'  => $config_type,
			'numberposts' => -1,
			'orderby'     => 'date',
			'order'       => 'DESC',
		);

		if ( 'all' === $status ) {
			$args['post_status'] = array( 'publish', 'draft' );
		} else {
			$args['post_status'] = $status;
		}

		$posts = get_posts( $args );

		return array_map( array( $this, 'format_config' ), $posts );
	}

	/**
	 * Get all configurations regardless of type.
	 *
	 * @return array<array<string, mixed>> Array of configuration data.
	 */
	public function get_all_configs(): array {
		$posts = get_posts(
			array(
				'post_type'   => ConfigPostType::POST_TYPE,
				'numberposts' => -1,
				'post_status' => array( 'publish', 'draft' ),
				'orderby'     => 'date',
				'order'       => 'DESC',
			)
		);

		return array_map( array( $this, 'format_config' ), $posts );
	}

	/**
	 * Update a configuration.
	 *
	 * @param int          $id The configuration post ID.
	 * @param array<mixed> $data The configuration data to update.
	 * @param string|null  $title Optional new title.
	 * @param string|null  $status Optional new status.
	 * @return bool|\WP_Error True on success, WP_Error on failure.
	 */
	public function update( int $id, array $data, ?string $title = null, ?string $status = null ): bool|\WP_Error {
		$post = get_post( $id );

		if ( ! $post || $post->post_type !== ConfigPostType::POST_TYPE ) {
			return new \WP_Error(
				'not_found',
				__( 'Configuration not found.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 404 )
			);
		}

		$config_type = get_post_meta( $id, ConfigPostType::META_CONFIG_TYPE, true );

		// Check slug uniqueness if slug is being changed.
		if ( isset( $data['slug'] ) && $data['slug'] !== $post->post_name ) {
			if ( $this->slug_exists( $config_type, $data['slug'], $id ) ) {
				return new \WP_Error(
					'duplicate_slug',
					__( 'A configuration with this slug already exists.', 'rox-dynamic-cpt-fields-engine' ),
					array( 'status' => 409 )
				);
			}
		}

		// Save current state as last valid snapshot.
		$current_data = get_post_meta( $id, ConfigPostType::META_CONFIG_DATA, true );
		if ( $current_data ) {
			update_post_meta( $id, ConfigPostType::META_LAST_VALID, $current_data );
		}

		$existing_data = $this->get_config_data( $id );

		if (
			! empty( $existing_data['meta_fields'] )
			&& is_array( $existing_data['meta_fields'] )
			&& (
				! array_key_exists( 'meta_fields', $data )
				|| ( is_array( $data['meta_fields'] ?? null ) && empty( $data['meta_fields'] ) )
			)
		) {
			$data['meta_fields'] = $existing_data['meta_fields'];
		}

		// Update post if title or status changed.
		$post_data = array( 'ID' => $id );
		$update_post = false;

		if ( null !== $title ) {
			$post_data['post_title'] = sanitize_text_field( $title );
			$update_post = true;
		}

		if ( isset( $data['slug'] ) ) {
			$post_data['post_name'] = sanitize_title( $data['slug'] );
			$update_post = true;
		}

		if ( null !== $status && in_array( $status, array( 'publish', 'draft' ), true ) ) {
			$post_data['post_status'] = $status;
			$update_post = true;
		}

		if ( $update_post ) {
			$result = wp_update_post( $post_data, true );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}

		// Update config data (preserve Unicode characters like Bengali, Arabic, etc.).
		update_post_meta( $id, ConfigPostType::META_CONFIG_DATA, wp_json_encode( $data, JSON_UNESCAPED_UNICODE ) );

		/**
		 * Fires after a config is updated.
		 *
		 * @since 1.0.0
		 *
		 * @param int    $id The config post ID.
		 * @param string $config_type The config type.
		 * @param array  $data The new config data.
		 */
		do_action( 'rdcfe_config_updated', $id, $config_type, $data );

		return true;
	}

	/**
	 * Delete a configuration.
	 *
	 * @param int  $id The configuration post ID.
	 * @param bool $force Whether to force delete (bypass trash).
	 * @return bool|\WP_Error True on success, WP_Error on failure.
	 */
	public function delete( int $id, bool $force = true ): bool|\WP_Error {
		$post = get_post( $id );

		if ( ! $post || $post->post_type !== ConfigPostType::POST_TYPE ) {
			return new \WP_Error(
				'not_found',
				__( 'Configuration not found.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 404 )
			);
		}

		$config_type = get_post_meta( $id, ConfigPostType::META_CONFIG_TYPE, true );
		$config_data = $this->get_config_data( $id );

		$result = wp_delete_post( $id, $force );

		if ( ! $result ) {
			return new \WP_Error(
				'delete_failed',
				__( 'Failed to delete configuration.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 500 )
			);
		}

		/**
		 * Fires after a config is deleted.
		 *
		 * @since 1.0.0
		 *
		 * @param int    $id The deleted config post ID.
		 * @param string $config_type The config type.
		 * @param array  $config_data The deleted config data.
		 */
		do_action( 'rdcfe_config_deleted', $id, $config_type, $config_data );

		return true;
	}

	/**
	 * Update only the status of a configuration.
	 *
	 * @param int    $id The configuration post ID.
	 * @param string $status The new status (publish or draft).
	 * @return bool|\WP_Error True on success, WP_Error on failure.
	 */
	public function update_status( int $id, string $status ): bool|\WP_Error {
		$post = get_post( $id );

		if ( ! $post || $post->post_type !== ConfigPostType::POST_TYPE ) {
			return new \WP_Error(
				'not_found',
				__( 'Configuration not found.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 404 )
			);
		}

		if ( ! in_array( $status, array( 'publish', 'draft' ), true ) ) {
			return new \WP_Error(
				'invalid_status',
				__( 'Invalid status. Must be "publish" or "draft".', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 400 )
			);
		}

		$result = wp_update_post(
			array(
				'ID'          => $id,
				'post_status' => $status,
			),
			true
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$config_type = get_post_meta( $id, ConfigPostType::META_CONFIG_TYPE, true );

		/**
		 * Fires after a config status is updated.
		 *
		 * @since 1.0.0
		 *
		 * @param int    $id The config post ID.
		 * @param string $config_type The config type.
		 * @param string $status The new status.
		 */
		do_action( 'rdcfe_config_status_updated', $id, $config_type, $status );

		return true;
	}

	/**
	 * Duplicate a configuration.
	 *
	 * @param int    $id The configuration post ID to duplicate.
	 * @param string $new_title Optional new title for the duplicate.
	 * @return int|\WP_Error New post ID on success, WP_Error on failure.
	 */
	public function duplicate( int $id, string $new_title = '' ): int|\WP_Error {
		$config = $this->get( $id );

		if ( ! $config ) {
			return new \WP_Error(
				'not_found',
				__( 'Configuration not found.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 404 )
			);
		}

		// Generate new title and slug.
		$title = $new_title ?: $config['title'] . ' (Copy)';
		$data  = $config['data'];
		$data['slug'] = sanitize_title( $title );

		return $this->create( $config['config_type'], $title, $data, 'draft' );
	}

	/**
	 * Check if a slug exists for a config type.
	 *
	 * @param string   $config_type The config type.
	 * @param string   $slug The slug to check.
	 * @param int|null $exclude_id Optional ID to exclude from check.
	 * @return bool True if slug exists.
	 */
	public function slug_exists( string $config_type, string $slug, ?int $exclude_id = null ): bool {
		$args = array(
			'post_type'   => ConfigPostType::POST_TYPE,
			'name'        => $slug,
			'meta_key'    => ConfigPostType::META_CONFIG_TYPE,
			'meta_value'  => $config_type,
			'numberposts' => 1,
			'post_status' => array( 'publish', 'draft' ),
			'fields'      => 'ids',
		);

		if ( $exclude_id ) {
			$args['post__not_in'] = array( $exclude_id );
		}

		$posts = get_posts( $args );

		return ! empty( $posts );
	}

	/**
	 * Get only the config data (decoded JSON).
	 *
	 * @param int $id The configuration post ID.
	 * @return array<mixed> The configuration data.
	 */
	public function get_config_data( int $id ): array {
		$json = get_post_meta( $id, ConfigPostType::META_CONFIG_DATA, true );

		if ( ! $json ) {
			return array();
		}

		$raw  = is_string( $json ) ? wp_unslash( $json ) : $json;
		$data = is_string( $raw ) ? json_decode( $raw, true ) : $raw;

		return is_array( $data ) ? $data : array();
	}

	/**
	 * Format a config post into a standardized array.
	 *
	 * @param \WP_Post $post The config post object.
	 * @return array<string, mixed> Formatted config data.
	 */
	private function format_config( \WP_Post $post ): array {
		$data = $this->get_config_data( $post->ID );

		return array(
			'id'             => $post->ID,
			'title'          => $post->post_title,
			'slug'           => $post->post_name,
			'status'         => $post->post_status,
			'config_type'    => get_post_meta( $post->ID, ConfigPostType::META_CONFIG_TYPE, true ),
			'data'           => is_array( $data ) ? $data : array(),
			'schema_version' => get_post_meta( $post->ID, ConfigPostType::META_SCHEMA_VERSION, true ) ?: '1.0.0',
			'created_at'     => $post->post_date,
			'updated_at'     => $post->post_modified,
		);
	}

	/**
	 * Count configurations by type.
	 *
	 * @param string $config_type The config type.
	 * @param string $status Post status filter.
	 * @return int The count.
	 */
	public function count( string $config_type, string $status = 'publish' ): int {
		global $wpdb;

		$status_sql = '';
		if ( 'all' !== $status ) {
			$status_sql = $wpdb->prepare( 'AND p.post_status = %s', $status );
		} else {
			$status_sql = "AND p.post_status IN ('publish', 'draft')";
		}

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Counting configurations with complex join, $status_sql is internally prepared or hardcoded.
		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->posts} p
				INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
				WHERE p.post_type = %s
				AND pm.meta_key = %s
				AND pm.meta_value = %s
				{$status_sql}",
				ConfigPostType::POST_TYPE,
				ConfigPostType::META_CONFIG_TYPE,
				$config_type
			)
		);
		// phpcs:enable

		return (int) $count;
	}
}
