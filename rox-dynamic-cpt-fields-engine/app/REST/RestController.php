<?php
/**
 * Base REST Controller
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Class RestController
 *
 * Base REST controller for RDCFE endpoints.
 * Note: We don't extend WP_REST_Controller to avoid method signature conflicts with PHP 8 type hints.
 */
abstract class RestController {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	protected string $namespace = 'rdcfe/v1';

	/**
	 * REST base.
	 *
	 * @var string
	 */
	protected string $rest_base = '';

	/**
	 * Required capability for all endpoints.
	 *
	 * @var string
	 */
	protected string $capability = 'manage_options';

	/**
	 * Register routes.
	 *
	 * @return void
	 */
	abstract public function register_routes(): void;

	/**
	 * Check if the current user has permission.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return bool|WP_Error
	 */
	public function check_permissions( WP_REST_Request $request ): bool|WP_Error {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_not_logged_in',
				__( 'You must be logged in to access this endpoint.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 401 )
			);
		}

		if ( ! current_user_can( $this->capability ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to access this endpoint.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Create a success response.
	 *
	 * @param mixed $data The response data.
	 * @param int   $status The HTTP status code.
	 * @return WP_REST_Response
	 */
	protected function success( mixed $data, int $status = 200 ): WP_REST_Response {
		return new WP_REST_Response( $data, $status );
	}

	/**
	 * Create an error response.
	 *
	 * @param string $code Error code.
	 * @param string $message Error message.
	 * @param int    $status HTTP status code.
	 * @param mixed  $data Additional error data.
	 * @return WP_Error
	 */
	protected function error( string $code, string $message, int $status = 400, mixed $data = null ): WP_Error {
		return new WP_Error(
			$code,
			$message,
			array_merge( array( 'status' => $status ), $data ? array( 'details' => $data ) : array() )
		);
	}

	/**
	 * Get pagination parameters.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	protected function get_pagination_params(): array {
		return array(
			'page'     => array(
				'description'       => __( 'Current page of the collection.', 'rox-dynamic-cpt-fields-engine' ),
				'type'              => 'integer',
				'default'           => 1,
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
			),
			'per_page' => array(
				'description'       => __( 'Maximum number of items per page.', 'rox-dynamic-cpt-fields-engine' ),
				'type'              => 'integer',
				'default'           => 10,
				'minimum'           => 1,
				'maximum'           => 100,
				'sanitize_callback' => 'absint',
			),
			'search'   => array(
				'description'       => __( 'Search term.', 'rox-dynamic-cpt-fields-engine' ),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'orderby'  => array(
				'description'       => __( 'Sort by field.', 'rox-dynamic-cpt-fields-engine' ),
				'type'              => 'string',
				'default'           => 'title',
				'enum'              => array( 'title', 'date', 'id' ),
				'sanitize_callback' => 'sanitize_text_field',
			),
			'order'    => array(
				'description'       => __( 'Sort order.', 'rox-dynamic-cpt-fields-engine' ),
				'type'              => 'string',
				'default'           => 'asc',
				'enum'              => array( 'asc', 'desc' ),
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}

	/**
	 * Set pagination headers on response.
	 *
	 * @param WP_REST_Response $response The response object.
	 * @param int              $total Total number of items.
	 * @param int              $per_page Items per page.
	 * @return WP_REST_Response
	 */
	protected function set_pagination_headers( WP_REST_Response $response, int $total, int $per_page ): WP_REST_Response {
		$max_pages = (int) ceil( $total / $per_page );

		$response->header( 'X-WP-Total', (string) $total );
		$response->header( 'X-WP-TotalPages', (string) $max_pages );

		return $response;
	}

	/**
	 * Validate and sanitize ID parameter.
	 *
	 * @param mixed $id The ID to validate.
	 * @return int|WP_Error
	 */
	protected function validate_id( mixed $id ): int|WP_Error {
		$id = absint( $id );

		if ( $id < 1 ) {
			return $this->error(
				'invalid_id',
				__( 'Invalid ID provided.', 'rox-dynamic-cpt-fields-engine' ),
				400
			);
		}

		return $id;
	}

	/**
	 * Get JSON from request body.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return array<string, mixed>|WP_Error
	 */
	protected function get_json_body( WP_REST_Request $request ): array|WP_Error {
		$body = $request->get_json_params();

		if ( empty( $body ) ) {
			// Try to get from body.
			$raw_body = $request->get_body();

			if ( ! empty( $raw_body ) ) {
				$body = json_decode( $raw_body, true );

				if ( json_last_error() !== JSON_ERROR_NONE ) {
					return $this->error(
						'invalid_json',
						__( 'Invalid JSON in request body.', 'rox-dynamic-cpt-fields-engine' ),
						400
					);
				}
			}
		}

		return is_array( $body ) ? $body : array();
	}
}
