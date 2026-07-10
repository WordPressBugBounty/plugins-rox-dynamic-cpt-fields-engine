<?php
/**
 * Registration Manager
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Registration;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RDCFE\Config\ConfigRepository;
use RDCFE\Schema\Validator;

/**
 * Class RegistrationManager
 *
 * Orchestrates the registration of CPTs and taxonomies from saved configurations.
 */
class RegistrationManager {

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $config_repository;

	/**
	 * Post type registrar.
	 *
	 * @var PostTypeRegistrar
	 */
	private PostTypeRegistrar $post_type_registrar;

	/**
	 * Taxonomy registrar.
	 *
	 * @var TaxonomyRegistrar
	 */
	private TaxonomyRegistrar $taxonomy_registrar;

	/**
	 * Schema validator.
	 *
	 * @var Validator
	 */
	private Validator $validator;

	/**
	 * Registration errors.
	 *
	 * @var array<string, \WP_Error>
	 */
	private array $errors = array();

	/**
	 * Whether rewrite rules need flushing.
	 *
	 * @var bool
	 */
	private bool $needs_flush = false;

	/**
	 * Constructor.
	 *
	 * @param ConfigRepository|null  $config_repository Config repository instance.
	 * @param PostTypeRegistrar|null $post_type_registrar Post type registrar instance.
	 * @param TaxonomyRegistrar|null $taxonomy_registrar Taxonomy registrar instance.
	 */
	public function __construct(
		?ConfigRepository $config_repository = null,
		?PostTypeRegistrar $post_type_registrar = null,
		?TaxonomyRegistrar $taxonomy_registrar = null
	) {
		$this->config_repository   = $config_repository ?? new ConfigRepository();
		$this->post_type_registrar = $post_type_registrar ?? new PostTypeRegistrar();
		$this->taxonomy_registrar  = $taxonomy_registrar ?? new TaxonomyRegistrar();
		$this->validator           = new Validator();
	}

	/**
	 * Initialize registration.
	 *
	 * @return void
	 */
	public function init(): void {
		// Register on init hook with priority 5 (early, after default WordPress).
		add_action( 'init', array( $this, 'register_all' ), 5 );

		// Handle rewrite rules flushing.
		add_action( 'admin_init', array( $this, 'maybe_flush_rewrite_rules' ) );
	}

	/**
	 * Register all CPTs and taxonomies from saved configurations.
	 *
	 * @return void
	 */
	public function register_all(): void {
		// Register post types first.
		$this->register_post_types();

		// Then register taxonomies (they may depend on post types).
		$this->register_taxonomies();

		// Clean up orphaned tracking entries.
		$this->cleanup_orphaned_tracking();

		/**
		 * Fires after all DCFE CPTs and taxonomies are registered.
		 *
		 * @since 1.0.0
		 *
		 * @param array $errors Any errors that occurred during registration.
		 */
		do_action( 'rdcfe_after_registration', $this->errors );
	}

	/**
	 * Clean up orphaned entries from the registered post types/taxonomies tracking.
	 *
	 * This removes entries from the tracking options that no longer have
	 * corresponding configurations, preventing capability check errors.
	 *
	 * @return void
	 */
	private function cleanup_orphaned_tracking(): void {
		// Get all published post type configs.
		$post_type_configs = $this->config_repository->get_all( 'post_type', 'publish' );
		$valid_post_types = array_map( function ( $config ) {
			return $config['data']['slug'] ?? '';
		}, $post_type_configs );
		$valid_post_types = array_filter( $valid_post_types );

		// Clean up orphaned post types.
		$tracked_post_types = get_option( 'rdcfe_registered_post_types', array() );
		if ( is_array( $tracked_post_types ) ) {
			$cleaned_post_types = array_values( array_intersect( $tracked_post_types, $valid_post_types ) );
			if ( $cleaned_post_types !== $tracked_post_types ) {
				update_option( 'rdcfe_registered_post_types', $cleaned_post_types );
			}
		}

		// Get all published taxonomy configs.
		$taxonomy_configs = $this->config_repository->get_all( 'taxonomy', 'publish' );
		$valid_taxonomies = array_map( function ( $config ) {
			return $config['data']['slug'] ?? '';
		}, $taxonomy_configs );
		$valid_taxonomies = array_filter( $valid_taxonomies );

		// Clean up orphaned taxonomies.
		$tracked_taxonomies = get_option( 'rdcfe_registered_taxonomies', array() );
		if ( is_array( $tracked_taxonomies ) ) {
			$cleaned_taxonomies = array_values( array_intersect( $tracked_taxonomies, $valid_taxonomies ) );
			if ( $cleaned_taxonomies !== $tracked_taxonomies ) {
				update_option( 'rdcfe_registered_taxonomies', $cleaned_taxonomies );
			}
		}
	}

	/**
	 * Register all post types from saved configurations.
	 *
	 * @return void
	 */
	private function register_post_types(): void {
		$configs = $this->config_repository->get_all( 'post_type', 'publish' );

		foreach ( $configs as $config ) {
			$this->register_post_type( $config );
		}
	}

	/**
	 * Register a single post type.
	 *
	 * @param array<string, mixed> $config The config array from repository.
	 * @return bool True on success.
	 */
	private function register_post_type( array $config ): bool {
		$data = $config['data'] ?? array();
		$slug = $data['slug'] ?? '';

		if ( empty( $slug ) ) {
			return false;
		}

		// Validate configuration.
		$validation = $this->validator->validate_post_type( $data );

		if ( ! $validation->is_valid() ) {
			// Try to use last valid snapshot.
			if ( $this->use_last_valid_snapshot( $config['id'], 'post_type' ) ) {
				return true;
			}

			$this->errors[ $slug ] = new \WP_Error(
				'validation_failed',
				sprintf(
					/* translators: %s: post type slug */
					__( 'Post type "%s" failed validation and could not be registered.', 'rox-dynamic-cpt-fields-engine' ),
					$slug
				),
				$validation->get_errors()
			);
			return false;
		}

		// Register the post type.
		$result = $this->post_type_registrar->register( $data );

		if ( is_wp_error( $result ) ) {
			$this->errors[ $slug ] = $result;
			return false;
		}

		$this->needs_flush = true;
		return true;
	}

	/**
	 * Register all taxonomies from saved configurations.
	 *
	 * @return void
	 */
	private function register_taxonomies(): void {
		$configs = $this->config_repository->get_all( 'taxonomy', 'publish' );

		foreach ( $configs as $config ) {
			$this->register_taxonomy( $config );
		}
	}

	/**
	 * Register a single taxonomy.
	 *
	 * @param array<string, mixed> $config The config array from repository.
	 * @return bool True on success.
	 */
	private function register_taxonomy( array $config ): bool {
		$data = $config['data'] ?? array();
		$slug = $data['slug'] ?? '';

		if ( empty( $slug ) ) {
			return false;
		}

		// Validate configuration.
		$validation = $this->validator->validate_taxonomy( $data );

		if ( ! $validation->is_valid() ) {
			// Try to use last valid snapshot.
			if ( $this->use_last_valid_snapshot( $config['id'], 'taxonomy' ) ) {
				return true;
			}

			$this->errors[ $slug ] = new \WP_Error(
				'validation_failed',
				sprintf(
					/* translators: %s: taxonomy slug */
					__( 'Taxonomy "%s" failed validation and could not be registered.', 'rox-dynamic-cpt-fields-engine' ),
					$slug
				),
				$validation->get_errors()
			);
			return false;
		}

		// Register the taxonomy.
		$result = $this->taxonomy_registrar->register( $data );

		if ( is_wp_error( $result ) ) {
			$this->errors[ $slug ] = $result;
			return false;
		}

		$this->needs_flush = true;
		return true;
	}

	/**
	 * Try to use last valid snapshot for a config.
	 *
	 * @param int    $config_id The config post ID.
	 * @param string $type The config type (post_type or taxonomy).
	 * @return bool True if snapshot was used successfully.
	 */
	private function use_last_valid_snapshot( int $config_id, string $type ): bool {
		$snapshot = get_post_meta( $config_id, '_rdcfe_last_valid_snapshot', true );

		if ( empty( $snapshot ) ) {
			return false;
		}

		$data = json_decode( $snapshot, true );

		if ( empty( $data ) || ! is_array( $data ) ) {
			return false;
		}

		// Try to register with last valid data.
		$result = match ( $type ) {
			'post_type' => $this->post_type_registrar->register( $data ),
			'taxonomy'  => $this->taxonomy_registrar->register( $data ),
			default     => null,
		};

		if ( is_wp_error( $result ) || null === $result ) {
			return false;
		}

		// Log that we used fallback.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log(
				sprintf(
					'DCFE: Used last valid snapshot for %s config ID %d',
					$type,
					$config_id
				)
			);
		}

		return true;
	}

	/**
	 * Flush rewrite rules if needed.
	 *
	 * @return void
	 */
	public function maybe_flush_rewrite_rules(): void {
		$flush_needed = get_option( 'rdcfe_flush_rewrite_rules', false );

		if ( ! $flush_needed && ! $this->needs_flush ) {
			return;
		}

		// Honor the "Auto-flush Rewrite Rules" setting; if disabled, leave the
		// pending flag in place so the user can flush manually from the UI.
		$settings   = get_option( 'rdcfe_settings', array() );
		$auto_flush = ! is_array( $settings ) || ! array_key_exists( 'auto_flush_rewrite', $settings )
			? true
			: (bool) $settings['auto_flush_rewrite'];

		if ( ! $auto_flush ) {
			return;
		}

		flush_rewrite_rules();
		delete_option( 'rdcfe_flush_rewrite_rules' );
		$this->needs_flush = false;
	}

	/**
	 * Schedule rewrite rules flush.
	 *
	 * @return void
	 */
	public static function schedule_flush(): void {
		update_option( 'rdcfe_flush_rewrite_rules', true );
	}

	/**
	 * Get registration errors.
	 *
	 * @return array<string, \WP_Error>
	 */
	public function get_errors(): array {
		return $this->errors;
	}

	/**
	 * Check if there are any registration errors.
	 *
	 * @return bool
	 */
	public function has_errors(): bool {
		return ! empty( $this->errors );
	}

	/**
	 * Get post type registrar.
	 *
	 * @return PostTypeRegistrar
	 */
	public function get_post_type_registrar(): PostTypeRegistrar {
		return $this->post_type_registrar;
	}

	/**
	 * Get taxonomy registrar.
	 *
	 * @return TaxonomyRegistrar
	 */
	public function get_taxonomy_registrar(): TaxonomyRegistrar {
		return $this->taxonomy_registrar;
	}

	/**
	 * Register a local post type from PHP API.
	 *
	 * @param array<string, mixed> $config The post type configuration.
	 * @return bool True on success.
	 */
	public function register_local_post_type( array $config ): bool {
		$slug = $config['slug'] ?? '';

		if ( empty( $slug ) ) {
			return false;
		}

		// Skip if already registered by WordPress core or another plugin.
		if ( post_type_exists( $slug ) ) {
			return false;
		}

		// Register the post type.
		$result = $this->post_type_registrar->register( $config );

		if ( is_wp_error( $result ) ) {
			$this->errors[ $slug ] = $result;
			return false;
		}

		$this->needs_flush = true;
		return true;
	}

	/**
	 * Register a local taxonomy from PHP API.
	 *
	 * @param array<string, mixed> $config The taxonomy configuration.
	 * @return bool True on success.
	 */
	public function register_local_taxonomy( array $config ): bool {
		$slug = $config['slug'] ?? '';

		if ( empty( $slug ) ) {
			return false;
		}

		// Skip if already registered by WordPress core or another plugin.
		if ( taxonomy_exists( $slug ) ) {
			return false;
		}

		// Register the taxonomy.
		$result = $this->taxonomy_registrar->register( $config );

		if ( is_wp_error( $result ) ) {
			$this->errors[ $slug ] = $result;
			return false;
		}

		$this->needs_flush = true;
		return true;
	}
}

