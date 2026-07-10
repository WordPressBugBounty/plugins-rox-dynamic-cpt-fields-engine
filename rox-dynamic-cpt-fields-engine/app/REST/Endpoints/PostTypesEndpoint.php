<?php
/**
 * Post Types Endpoint
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST\Endpoints;

use RDCFE\REST\RestController;
use RDCFE\Config\ConfigRepository;
use RDCFE\Schema\Validator;
use RDCFE\Registration\RegistrationManager;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;

/**
 * Class PostTypesEndpoint
 *
 * CRUD endpoints for post type configurations.
 */
class PostTypesEndpoint extends RestController {

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected string $rest_base = 'post-types';

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $repository;

	/**
	 * Schema validator.
	 *
	 * @var Validator
	 */
	private Validator $validator;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->repository = new ConfigRepository();
		$this->validator  = new Validator();
	}

	/**
	 * Register routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		// List all.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => $this->get_pagination_params(),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => $this->get_create_params(),
				),
			)
		);

		// Single item.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => $this->get_update_params(),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		// Duplicate.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)/duplicate',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'duplicate_item' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		// Validate.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/validate',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'validate_config' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		// Toggle status (enable/disable).
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)/status',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'toggle_status' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => array(
						'status' => array(
							'description' => __( 'New status (publish or draft).', 'rox-dynamic-cpt-fields-engine' ),
							'type'        => 'string',
							'required'    => true,
							'enum'        => array( 'publish', 'draft' ),
						),
					),
				),
			)
		);
	}

	/**
	 * Get all post types.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_items( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$status = $request->get_param( 'status' ) ?? 'all';
		$items  = $this->repository->get_all( 'post_type', $status );

		$response = $this->success( $items );
		return $this->set_pagination_headers( $response, count( $items ), 100 );
	}

	/**
	 * Get single post type.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$item = $this->repository->get( $id );

		if ( ! $item ) {
			return $this->error( 'not_found', __( 'Post type not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		if ( 'post_type' !== $item['config_type'] ) {
			return $this->error( 'not_found', __( 'Post type not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		return $this->success( $item );
	}

	/**
	 * Create a new post type.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$title = $body['title'] ?? $body['label'] ?? '';
		$data  = $body['data'] ?? $body;
		$status = $body['status'] ?? 'publish';

		// Validate configuration.
		$validation = $this->validator->validate_post_type( $data );

		if ( ! $validation->is_valid() ) {
			return $this->error(
				'validation_failed',
				__( 'Validation failed.', 'rox-dynamic-cpt-fields-engine' ),
				400,
				$validation->to_array()
			);
		}

		// Create the config.
		$result = $this->repository->create( 'post_type', $title, $data, $status );

		if ( is_wp_error( $result ) ) {
			return $this->error(
				$result->get_error_code(),
				$result->get_error_message(),
				$result->get_error_data()['status'] ?? 400
			);
		}

		// Schedule rewrite rules flush.
		RegistrationManager::schedule_flush();

		$item = $this->repository->get( $result );

		return $this->success( $item, 201 );
	}

	/**
	 * Update a post type.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		// Check if exists.
		$existing = $this->repository->get( $id );

		if ( ! $existing || 'post_type' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Post type not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$data   = $body['data'] ?? $body;
		$title  = $body['title'] ?? null;
		$status = $body['status'] ?? null;

		// Validate configuration.
		$validation = $this->validator->validate_post_type( $data );

		if ( ! $validation->is_valid() ) {
			return $this->error(
				'validation_failed',
				__( 'Validation failed.', 'rox-dynamic-cpt-fields-engine' ),
				400,
				$validation->to_array()
			);
		}

		// Update.
		$result = $this->repository->update( $id, $data, $title, $status );

		if ( is_wp_error( $result ) ) {
			return $this->error(
				$result->get_error_code(),
				$result->get_error_message(),
				$result->get_error_data()['status'] ?? 400
			);
		}

		// Schedule rewrite rules flush.
		RegistrationManager::schedule_flush();

		$item = $this->repository->get( $id );

		return $this->success( $item );
	}

	/**
	 * Delete a post type.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		// Check if exists.
		$existing = $this->repository->get( $id );

		if ( ! $existing || 'post_type' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Post type not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$result = $this->repository->delete( $id );

		if ( is_wp_error( $result ) ) {
			return $this->error(
				$result->get_error_code(),
				$result->get_error_message(),
				$result->get_error_data()['status'] ?? 400
			);
		}

		// Schedule rewrite rules flush.
		RegistrationManager::schedule_flush();

		return $this->success( array( 'deleted' => true, 'id' => $id ) );
	}

	/**
	 * Duplicate a post type.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function duplicate_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$body     = $this->get_json_body( $request );
		$new_title = $body['title'] ?? '';

		$result = $this->repository->duplicate( $id, $new_title );

		if ( is_wp_error( $result ) ) {
			return $this->error(
				$result->get_error_code(),
				$result->get_error_message(),
				$result->get_error_data()['status'] ?? 400
			);
		}

		$item = $this->repository->get( $result );

		return $this->success( $item, 201 );
	}

	/**
	 * Validate a post type configuration.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function validate_config( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$data = $body['data'] ?? $body;

		$validation = $this->validator->validate_post_type( $data );

		return $this->success( $validation->to_array() );
	}

	/**
	 * Toggle post type status (enable/disable).
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function toggle_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		// Check if exists.
		$existing = $this->repository->get( $id );

		if ( ! $existing || 'post_type' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Post type not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$body   = $this->get_json_body( $request );
		$status = $body['status'] ?? 'publish';

		// Update only the status.
		$result = $this->repository->update_status( $id, $status );

		if ( is_wp_error( $result ) ) {
			return $this->error(
				$result->get_error_code(),
				$result->get_error_message(),
				$result->get_error_data()['status'] ?? 400
			);
		}

		// Schedule rewrite rules flush.
		RegistrationManager::schedule_flush();

		return $this->success( array( 'id' => $id, 'status' => $status ) );
	}

	/**
	 * Get create parameters.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_create_params(): array {
		return array(
			'title' => array(
				'description' => __( 'Post type title/label.', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'string',
				'required'    => true,
			),
			'data'  => array(
				'description' => __( 'Post type configuration data.', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'object',
				'required'    => true,
			),
			'status' => array(
				'description' => __( 'Status (publish or draft).', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'string',
				'default'     => 'publish',
				'enum'        => array( 'publish', 'draft' ),
			),
		);
	}

	/**
	 * Get update parameters.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_update_params(): array {
		return array(
			'title' => array(
				'description' => __( 'Post type title/label.', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'string',
			),
			'data'  => array(
				'description' => __( 'Post type configuration data.', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'object',
			),
			'status' => array(
				'description' => __( 'Status (publish or draft).', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'string',
				'enum'        => array( 'publish', 'draft' ),
			),
		);
	}
}

