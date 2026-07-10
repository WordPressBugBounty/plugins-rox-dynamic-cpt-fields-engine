<?php
/**
 * Field Groups Endpoint
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST\Endpoints;

use RDCFE\REST\RestController;
use RDCFE\Config\ConfigRepository;
use RDCFE\Schema\Validator;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;

/**
 * Class FieldGroupsEndpoint
 *
 * CRUD endpoints for field group configurations.
 */
class FieldGroupsEndpoint extends RestController {

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected string $rest_base = 'field-groups';

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
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'check_permissions' ),
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

		// Field types list.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/field-types',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_field_types' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);
	}

	/**
	 * Get all field groups.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_items( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$status = $request->get_param( 'status' ) ?? 'all';
		$items  = $this->repository->get_all( 'field_group', $status );

		return $this->success( $items );
	}

	/**
	 * Get single field group.
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

		if ( ! $item || 'field_group' !== $item['config_type'] ) {
			return $this->error( 'not_found', __( 'Field group not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		return $this->success( $item );
	}

	/**
	 * Create a new field group.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$title  = $body['title'] ?? '';
		$data   = $body['data'] ?? $body;
		$status = $body['status'] ?? 'publish';

		// Add title to data if not present.
		if ( ! empty( $title ) && empty( $data['title'] ) ) {
			$data['title'] = $title;
		}

		// Validate.
		$validation = $this->validator->validate_field_group( $data );

		if ( ! $validation->is_valid() ) {
			return $this->error( 'validation_failed', __( 'Validation failed.', 'rox-dynamic-cpt-fields-engine' ), 400, $validation->to_array() );
		}

		$result = $this->repository->create( 'field_group', $title, $data, $status );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_code(), $result->get_error_message(), $result->get_error_data()['status'] ?? 400 );
		}

		return $this->success( $this->repository->get( $result ), 201 );
	}

	/**
	 * Update a field group.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$existing = $this->repository->get( $id );

		if ( ! $existing || 'field_group' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Field group not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$body   = $this->get_json_body( $request );
		$data   = $body['data'] ?? $body;
		$title  = $body['title'] ?? null;
		$status = $body['status'] ?? null;

		$validation = $this->validator->validate_field_group( $data );

		if ( ! $validation->is_valid() ) {
			return $this->error( 'validation_failed', __( 'Validation failed.', 'rox-dynamic-cpt-fields-engine' ), 400, $validation->to_array() );
		}

		$result = $this->repository->update( $id, $data, $title, $status );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_code(), $result->get_error_message(), $result->get_error_data()['status'] ?? 400 );
		}

		return $this->success( $this->repository->get( $id ) );
	}

	/**
	 * Delete a field group.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$existing = $this->repository->get( $id );

		if ( ! $existing || 'field_group' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Field group not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$result = $this->repository->delete( $id );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_code(), $result->get_error_message(), $result->get_error_data()['status'] ?? 400 );
		}

		return $this->success( array( 'deleted' => true, 'id' => $id ) );
	}

	/**
	 * Duplicate a field group.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function duplicate_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$body      = $this->get_json_body( $request );
		$new_title = $body['title'] ?? '';

		$result = $this->repository->duplicate( $id, $new_title );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_code(), $result->get_error_message(), $result->get_error_data()['status'] ?? 400 );
		}

		return $this->success( $this->repository->get( $result ), 201 );
	}

	/**
	 * Get available field types.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response
	 */
	public function get_field_types( WP_REST_Request $request ): WP_REST_Response {
		$registry = \DCFE\Fields\FieldTypeRegistry::get_instance();
		$types    = $registry->get_all();

		$formatted = array();
		foreach ( $types as $type => $instance ) {
			$formatted[ $type ] = array(
				'type'     => $instance->get_type(),
				'label'    => $instance->get_label(),
				'category' => $instance->get_category(),
			);
		}

		return $this->success( $formatted );
	}

	/**
	 * Toggle field group status (enable/disable).
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

		if ( ! $existing || 'field_group' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Field group not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
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

		return $this->success( array( 'id' => $id, 'status' => $status ) );
	}
}

