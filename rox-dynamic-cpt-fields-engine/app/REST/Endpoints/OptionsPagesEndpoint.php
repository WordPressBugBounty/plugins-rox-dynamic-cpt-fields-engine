<?php
/**
 * Options Pages Endpoint
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
 * Class OptionsPagesEndpoint
 *
 * CRUD endpoints for options page configurations.
 */
class OptionsPagesEndpoint extends RestController {

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected string $rest_base = 'options-pages';

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
	}

	/**
	 * Get all options pages.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_items( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$status = $request->get_param( 'status' ) ?? 'all';
		$items  = $this->repository->get_all( 'options_page', $status );

		return $this->success( $items );
	}

	/**
	 * Get single options page.
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

		if ( ! $item || 'options_page' !== $item['config_type'] ) {
			return $this->error( 'not_found', __( 'Options page not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		return $this->success( $item );
	}

	/**
	 * Free tier limit for options pages.
	 *
	 * @var int
	 */
	private const FREE_LIMIT = 1;

	/**
	 * Create a new options page.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		// Check free limit (unless Pro is active).
		if ( ! $this->is_pro_active() ) {
			$current_count = $this->repository->count( 'options_page' );
			if ( $current_count >= self::FREE_LIMIT ) {
				return $this->error(
					'free_limit_reached',
					sprintf(
						/* translators: %d: free limit number */
						__( 'Free version is limited to %d options page. Upgrade to Pro for unlimited options pages.', 'rox-dynamic-cpt-fields-engine' ),
						self::FREE_LIMIT
					),
					403
				);
			}
		}

		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$title  = $body['title'] ?? $body['page_title'] ?? '';
		$data   = $body['data'] ?? $body;
		$status = $body['status'] ?? 'publish';

		// Validate.
		$validation = $this->validator->validate_options_page( $data );

		if ( ! $validation->is_valid() ) {
			return $this->error( 'validation_failed', __( 'Validation failed.', 'rox-dynamic-cpt-fields-engine' ), 400, $validation->to_array() );
		}

		$result = $this->repository->create( 'options_page', $title, $data, $status );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_code(), $result->get_error_message(), $result->get_error_data()['status'] ?? 400 );
		}

		return $this->success( $this->repository->get( $result ), 201 );
	}

	/**
	 * Check if Pro version is active.
	 *
	 * @return bool
	 */
	private function is_pro_active(): bool {
		/**
		 * Filter to check if Pro version is active.
		 *
		 * @since 1.0.0
		 *
		 * @param bool $is_pro Whether Pro is active.
		 */
		return (bool) apply_filters( 'rdcfe_is_pro_active', false );
	}

	/**
	 * Update an options page.
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

		if ( ! $existing || 'options_page' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Options page not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$body   = $this->get_json_body( $request );
		$data   = $body['data'] ?? $body;
		$title  = $body['title'] ?? null;
		$status = $body['status'] ?? null;

		$validation = $this->validator->validate_options_page( $data );

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
	 * Delete an options page.
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

		if ( ! $existing || 'options_page' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Options page not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$result = $this->repository->delete( $id );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_code(), $result->get_error_message(), $result->get_error_data()['status'] ?? 400 );
		}

		return $this->success( array( 'deleted' => true, 'id' => $id ) );
	}

	/**
	 * Duplicate an options page.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function duplicate_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		// Ensure the source is actually an options page.
		$existing = $this->repository->get( $id );

		if ( ! $existing || 'options_page' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Options page not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		// Enforce free-tier limit (consistent with create_item).
		if ( ! $this->is_pro_active() ) {
			$current_count = $this->repository->count( 'options_page' );
			if ( $current_count >= self::FREE_LIMIT ) {
				return $this->error(
					'free_limit_reached',
					sprintf(
						/* translators: %d: free limit number */
						__( 'Free version is limited to %d options page. Upgrade to Pro for unlimited options pages.', 'rox-dynamic-cpt-fields-engine' ),
						self::FREE_LIMIT
					),
					403
				);
			}
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
	 * Toggle options page status (enable/disable).
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function toggle_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->validate_id( $request->get_param( 'id' ) );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$existing = $this->repository->get( $id );

		if ( ! $existing || 'options_page' !== $existing['config_type'] ) {
			return $this->error( 'not_found', __( 'Options page not found.', 'rox-dynamic-cpt-fields-engine' ), 404 );
		}

		$body   = $this->get_json_body( $request );
		$status = $body['status'] ?? 'publish';

		// Only allow valid status values.
		if ( ! in_array( $status, array( 'publish', 'draft' ), true ) ) {
			return $this->error(
				'invalid_status',
				__( 'Invalid status value. Must be publish or draft.', 'rox-dynamic-cpt-fields-engine' ),
				400
			);
		}

		$result = $this->repository->update_status( $id, $status );

		if ( is_wp_error( $result ) ) {
			return $this->error(
				$result->get_error_code(),
				$result->get_error_message(),
				$result->get_error_data()['status'] ?? 400
			);
		}

		return $this->success(
			array(
				'id'     => $id,
				'status' => $status,
			)
		);
	}
}

