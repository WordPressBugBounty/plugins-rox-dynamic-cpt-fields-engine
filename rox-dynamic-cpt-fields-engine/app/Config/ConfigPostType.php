<?php
/**
 * Config Post Type Registration
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Config;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ConfigPostType
 *
 * Registers the rdcfe_config post type for storing plugin configurations.
 */
class ConfigPostType {

	/**
	 * Post type slug.
	 */
	public const POST_TYPE = 'rdcfe_config';

	/**
	 * Config type meta key.
	 */
	public const META_CONFIG_TYPE = '_rdcfe_config_type';

	/**
	 * Config data meta key.
	 */
	public const META_CONFIG_DATA = '_rdcfe_config_data';

	/**
	 * Schema version meta key.
	 */
	public const META_SCHEMA_VERSION = '_rdcfe_schema_version';

	/**
	 * Last valid snapshot meta key.
	 */
	public const META_LAST_VALID = '_rdcfe_last_valid_snapshot';

	/**
	 * Valid config types.
	 */
	public const CONFIG_TYPES = array(
		'post_type',
		'taxonomy',
		'field_group',
		'query',
		'listing',
		'relation',
		'options_page',
	);

	/**
	 * Initialize the post type.
	 *
	 * @return void
	 */
	public function init(): void {
		add_action( 'init', array( $this, 'register_post_type' ), 5 );
		add_action( 'init', array( $this, 'register_meta' ), 5 );
	}

	/**
	 * Register the config post type.
	 *
	 * @return void
	 */
	public function register_post_type(): void {
		$labels = array(
			'name'                  => _x( 'RDCFE Configs', 'Post type general name', 'rox-dynamic-cpt-fields-engine' ),
			'singular_name'         => _x( 'RDCFE Config', 'Post type singular name', 'rox-dynamic-cpt-fields-engine' ),
			'menu_name'             => _x( 'RDCFE Configs', 'Admin Menu text', 'rox-dynamic-cpt-fields-engine' ),
			'add_new'               => __( 'Add New', 'rox-dynamic-cpt-fields-engine' ),
			'add_new_item'          => __( 'Add New Config', 'rox-dynamic-cpt-fields-engine' ),
			'edit_item'             => __( 'Edit Config', 'rox-dynamic-cpt-fields-engine' ),
			'new_item'              => __( 'New Config', 'rox-dynamic-cpt-fields-engine' ),
			'view_item'             => __( 'View Config', 'rox-dynamic-cpt-fields-engine' ),
			'search_items'          => __( 'Search Configs', 'rox-dynamic-cpt-fields-engine' ),
			'not_found'             => __( 'No configs found', 'rox-dynamic-cpt-fields-engine' ),
			'not_found_in_trash'    => __( 'No configs found in Trash', 'rox-dynamic-cpt-fields-engine' ),
			'all_items'             => __( 'All Configs', 'rox-dynamic-cpt-fields-engine' ),
		);

		$args = array(
			'labels'              => $labels,
			'description'         => __( 'Stores RDCFE plugin configurations.', 'rox-dynamic-cpt-fields-engine' ),
			'public'              => false,
			'publicly_queryable'  => false,
			'show_ui'             => false, // Hidden from admin.
			'show_in_menu'        => false,
			'show_in_nav_menus'   => false,
			'show_in_admin_bar'   => false,
			'show_in_rest'        => true, // Enable REST API for our use.
			'rest_base'           => 'rdcfe-configs',
			'query_var'           => false,
			'rewrite'             => false,
			'capability_type'     => 'rdcfe_config',
			'map_meta_cap'        => false, // Don't map meta caps, we handle permissions manually.
			'has_archive'         => false,
			'hierarchical'        => false,
			'supports'            => array( 'title', 'revisions' ),
			'can_export'          => true,
		);

		register_post_type( self::POST_TYPE, $args );
	}

	/**
	 * Register meta fields for the post type.
	 *
	 * @return void
	 */
	public function register_meta(): void {
		// Config type meta.
		register_post_meta(
			self::POST_TYPE,
			self::META_CONFIG_TYPE,
			array(
				'type'              => 'string',
				'description'       => __( 'The type of configuration (post_type, taxonomy, field_group, etc.)', 'rox-dynamic-cpt-fields-engine' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => array( $this, 'sanitize_config_type' ),
				'auth_callback'     => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		// Config data meta (JSON).
		register_post_meta(
			self::POST_TYPE,
			self::META_CONFIG_DATA,
			array(
				'type'              => 'string',
				'description'       => __( 'The configuration data as JSON.', 'rox-dynamic-cpt-fields-engine' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => array( $this, 'sanitize_config_data' ),
				'auth_callback'     => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		// Schema version meta.
		register_post_meta(
			self::POST_TYPE,
			self::META_SCHEMA_VERSION,
			array(
				'type'              => 'string',
				'description'       => __( 'The schema version of this configuration.', 'rox-dynamic-cpt-fields-engine' ),
				'single'            => true,
				'default'           => '1.0.0',
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		// Last valid snapshot meta.
		register_post_meta(
			self::POST_TYPE,
			self::META_LAST_VALID,
			array(
				'type'              => 'string',
				'description'       => __( 'The last known valid configuration snapshot.', 'rox-dynamic-cpt-fields-engine' ),
				'single'            => true,
				'show_in_rest'      => false, // Not exposed in REST.
				'sanitize_callback' => array( $this, 'sanitize_config_data' ),
				'auth_callback'     => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Sanitize config type.
	 *
	 * @param mixed $value The value to sanitize.
	 * @return string
	 */
	public function sanitize_config_type( mixed $value ): string {
		$value = sanitize_text_field( (string) $value );

		if ( ! in_array( $value, self::CONFIG_TYPES, true ) ) {
			return '';
		}

		return $value;
	}

	/**
	 * Sanitize config data (JSON).
	 *
	 * @param mixed $value The value to sanitize.
	 * @return string
	 */
	public function sanitize_config_data( mixed $value ): string {
		// If it's already a string, validate it's valid JSON.
		if ( is_string( $value ) ) {
			$raw     = wp_unslash( $value );
			$decoded = json_decode( $raw, true );

			if ( json_last_error() !== JSON_ERROR_NONE ) {
				return $raw;
			}

			$encoded = wp_json_encode( $decoded, JSON_UNESCAPED_UNICODE );

			return false !== $encoded ? $encoded : $raw;
		}

		if ( is_array( $value ) ) {
			$encoded = wp_json_encode( $value, JSON_UNESCAPED_UNICODE );

			return false !== $encoded ? $encoded : '{}';
		}

		return '{}';
	}

	/**
	 * Get all valid config types.
	 *
	 * @return array<string>
	 */
	public static function get_config_types(): array {
		return self::CONFIG_TYPES;
	}
}
