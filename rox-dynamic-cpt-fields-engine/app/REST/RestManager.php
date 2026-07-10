<?php
/**
 * REST Manager
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RDCFE\REST\Endpoints\HealthCheckEndpoint;
use RDCFE\REST\Endpoints\PostTypesEndpoint;
use RDCFE\REST\Endpoints\TaxonomiesEndpoint;
use RDCFE\REST\Endpoints\FieldGroupsEndpoint;
use RDCFE\REST\Endpoints\OptionsPagesEndpoint;
use RDCFE\REST\Endpoints\ImportExportEndpoint;
use RDCFE\REST\Endpoints\SettingsEndpoint;

/**
 * Class RestManager
 *
 * Manages REST API endpoint registration.
 */
class RestManager {

	/**
	 * REST namespace.
	 */
	public const NAMESPACE = 'rdcfe/v1';

	/**
	 * Registered endpoints.
	 *
	 * @var array<RestController>
	 */
	private array $endpoints = array();

	/**
	 * Initialize REST API.
	 *
	 * @return void
	 */
	public function init(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register all REST routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		// Register core endpoints.
		$this->register_endpoint( new HealthCheckEndpoint() );

		// CRUD endpoints.
		$this->register_endpoint( new PostTypesEndpoint() );
		$this->register_endpoint( new TaxonomiesEndpoint() );
		$this->register_endpoint( new FieldGroupsEndpoint() );
		$this->register_endpoint( new OptionsPagesEndpoint() );

		// Tools endpoints (import/export).
		$this->register_endpoint( new ImportExportEndpoint() );

		// Plugin settings endpoint.
		$this->register_endpoint( new SettingsEndpoint() );

		/**
		 * Fires after RDCFE REST routes are registered.
		 *
		 * @since 1.0.0
		 *
		 * @param RestManager $manager The REST manager instance.
		 */
		do_action( 'rdcfe_rest_routes_registered', $this );
	}

	/**
	 * Register a single endpoint.
	 *
	 * @param RestController $endpoint The endpoint controller.
	 * @return void
	 */
	public function register_endpoint( RestController $endpoint ): void {
		$endpoint->register_routes();
		$this->endpoints[] = $endpoint;
	}

	/**
	 * Get REST namespace.
	 *
	 * @return string
	 */
	public static function get_namespace(): string {
		return self::NAMESPACE;
	}

	/**
	 * Get REST URL.
	 *
	 * @param string $path Optional path to append.
	 * @return string
	 */
	public static function get_rest_url( string $path = '' ): string {
		return rest_url( self::NAMESPACE . '/' . ltrim( $path, '/' ) );
	}
}
