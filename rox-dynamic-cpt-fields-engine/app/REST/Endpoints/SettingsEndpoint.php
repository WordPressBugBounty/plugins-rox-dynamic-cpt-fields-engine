<?php
/**
 * Settings Endpoint
 *
 * Persists plugin-level toggles (auto-flush rewrite rules, clean uninstall, etc.)
 * to the `rdcfe_settings` option so they can drive runtime behavior and the
 * uninstall routine.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST\Endpoints;

use RDCFE\REST\RestController;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class SettingsEndpoint
 */
class SettingsEndpoint extends RestController {

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected string $rest_base = 'settings';

	/**
	 * Option key used for plugin settings.
	 */
	private const OPTION_KEY = 'rdcfe_settings';

	/**
	 * Whitelisted boolean settings that the UI can persist.
	 *
	 * Map: external key (used by API/UI) => internal storage key.
	 *
	 * @var array<string, string>
	 */
	private const BOOL_SETTINGS = array(
		'auto_flush_rewrite' => 'auto_flush_rewrite',
		'clean_uninstall'    => 'clean_uninstall',
		'debug_mode'         => 'debug_mode',
	);

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
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => $this->get_update_args(),
				),
			)
		);
	}

	/**
	 * GET /settings handler.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response
	 */
	public function get_settings( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		return $this->success(
			array(
				'success' => true,
				'data'    => $this->normalize_settings( $this->get_raw_settings() ),
			)
		);
	}

	/**
	 * POST /settings handler.
	 *
	 * Accepts a partial payload — only whitelisted keys are written, everything
	 * else is silently ignored to keep the option payload clean.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function update_settings( WP_REST_Request $request ) {
		$body = $this->get_json_body( $request );

		if ( $body instanceof \WP_Error ) {
			return $body;
		}

		$current = $this->get_raw_settings();
		$updated = $current;

		foreach ( self::BOOL_SETTINGS as $external => $internal ) {
			if ( ! array_key_exists( $external, $body ) ) {
				continue;
			}

			$updated[ $internal ] = rest_sanitize_boolean( $body[ $external ] );
		}

		// Only write when something actually changed; `update_option` already
		// short-circuits on identical payloads but this avoids the autoload
		// flush on every save click.
		if ( $updated !== $current ) {
			update_option( self::OPTION_KEY, $updated );

			/**
			 * Fires after RDCFE plugin settings are updated via REST.
			 *
			 * @since 1.0.0
			 *
			 * @param array<string, mixed> $updated The updated settings.
			 * @param array<string, mixed> $current The previous settings.
			 */
			do_action( 'rdcfe_settings_updated', $updated, $current );
		}

		return $this->success(
			array(
				'success' => true,
				'data'    => $this->normalize_settings( $updated ),
			)
		);
	}

	/**
	 * Read raw option (always returns an array).
	 *
	 * @return array<string, mixed>
	 */
	private function get_raw_settings(): array {
		$settings = get_option( self::OPTION_KEY, array() );

		return is_array( $settings ) ? $settings : array();
	}

	/**
	 * Coerce stored settings into the boolean-typed shape the UI expects.
	 *
	 * @param array<string, mixed> $settings Raw settings.
	 * @return array<string, bool>
	 */
	private function normalize_settings( array $settings ): array {
		$normalized = array(
			'auto_flush_rewrite' => true,
			'clean_uninstall'    => false,
			'debug_mode'         => false,
		);

		foreach ( $normalized as $key => $default ) {
			$internal = self::BOOL_SETTINGS[ $key ] ?? $key;

			if ( array_key_exists( $internal, $settings ) ) {
				$normalized[ $key ] = rest_sanitize_boolean( $settings[ $internal ] );
			}
		}

		return $normalized;
	}

	/**
	 * Argument schema for the update endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_update_args(): array {
		$args = array();

		foreach ( array_keys( self::BOOL_SETTINGS ) as $key ) {
			$args[ $key ] = array(
				'type'              => 'boolean',
				'required'          => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
			);
		}

		return $args;
	}
}
