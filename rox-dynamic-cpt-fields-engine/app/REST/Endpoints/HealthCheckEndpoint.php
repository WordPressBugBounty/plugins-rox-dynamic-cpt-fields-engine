<?php
/**
 * Health Check Endpoint
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST\Endpoints;

use RDCFE\REST\RestController;
use RDCFE\Config\ConfigRepository;
use RDCFE\Database\Migrator;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Class HealthCheckEndpoint
 *
 * Provides plugin health status endpoint.
 */
class HealthCheckEndpoint extends RestController {

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected string $rest_base = 'health-check';

	/**
	 * Register routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_health_status' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);
	}

	/**
	 * Get plugin health status.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response
	 */
	public function get_health_status( WP_REST_Request $request ): WP_REST_Response {
		$config_repository = new ConfigRepository();
		$migrator          = new Migrator();

		// Get config counts.
		$counts = array(
			'post_types'    => $config_repository->count( 'post_type' ),
			'taxonomies'    => $config_repository->count( 'taxonomy' ),
			'field_groups'  => $config_repository->count( 'field_group' ),
			'options_pages' => $config_repository->count( 'options_page' ),
		);

		// Check database status.
		$db_needs_update = $migrator->needs_migration();

		// Get registered post types and taxonomies.
		$registered_cpts  = get_option( 'rdcfe_registered_post_types', array() );
		$registered_taxes = get_option( 'rdcfe_registered_taxonomies', array() );

		$response = array(
			'status'    => $db_needs_update ? 'needs_update' : 'healthy',
			'version'   => RDCFE_VERSION,
			'db_version' => array(
				'current'  => $migrator->get_db_version(),
				'required' => $migrator->get_required_version(),
			),
			'configs'   => $counts,
			'registered' => array(
				'post_types'  => count( $registered_cpts ),
				'taxonomies'  => count( $registered_taxes ),
			),
			'environment' => array(
				'php_version' => PHP_VERSION,
				'wp_version'  => get_bloginfo( 'version' ),
				'is_multisite' => is_multisite(),
				'debug_mode'  => defined( 'WP_DEBUG' ) && WP_DEBUG,
			),
			'timestamp' => current_time( 'c' ),
		);

		/**
		 * Filter health check response.
		 *
		 * @since 1.0.0
		 *
		 * @param array $response The health check response.
		 */
		$response = apply_filters( 'rdcfe_health_check_response', $response );

		return $this->success( $response );
	}
}

