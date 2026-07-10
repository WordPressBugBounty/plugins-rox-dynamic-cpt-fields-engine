<?php
/**
 * Import/Export Endpoint
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\REST\Endpoints;

use RDCFE\REST\RestController;
use RDCFE\ImportExport\ConflictResolver;
use RDCFE\ImportExport\DiffGenerator;
use RDCFE\ImportExport\Exporter;
use RDCFE\ImportExport\Importer;
use RDCFE\ImportExport\RollbackManager;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;

/**
 * Class ImportExportEndpoint
 *
 * REST endpoints for importing and exporting configurations.
 */
class ImportExportEndpoint extends RestController {

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected string $rest_base = 'tools';

	/**
	 * Exporter instance.
	 *
	 * @var Exporter
	 */
	private Exporter $exporter;

	/**
	 * Importer instance.
	 *
	 * @var Importer
	 */
	private Importer $importer;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->exporter = new Exporter();
		$this->importer = new Importer();
	}

	/**
	 * Register routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		// Export endpoint.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/export',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'export' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => $this->get_export_params(),
				),
			)
		);

		// Import endpoint (validate and apply).
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/import',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'import' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => $this->get_import_params(),
				),
			)
		);

		// Validate import endpoint (dry run).
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/validate-import',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'validate_import' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => $this->get_import_params(),
				),
			)
		);

		// Flush rewrite rules endpoint.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/flush-rewrite',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'flush_rewrite' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		// Pro: structured diff for import preview.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/import-diff',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'import_diff' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		// Pro: apply import with optional snapshot + conflict resolutions.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/import-apply',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'import_apply' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/snapshots',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'list_snapshots' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_snapshot' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/snapshots/retention',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'set_snapshot_retention' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/snapshots/(?P<id>[a-zA-Z0-9_.-]+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_snapshot' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/snapshots/(?P<id>[a-zA-Z0-9_.-]+)/restore',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'restore_snapshot' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);
	}

	/**
	 * Export configurations.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function export( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$types = $body['types'] ?? array();
		$ids   = $body['ids'] ?? array();

		// Validate types.
		$valid_types = array( 'post_type', 'taxonomy', 'field_group', 'options_page' );
		if ( ! empty( $types ) ) {
			$types = array_intersect( $types, $valid_types );
		}

		// Export data.
		$export_data = $this->exporter->export( $types, $ids );

		// Return with filename suggestion.
		$response_data = array(
			'success'  => true,
			'filename' => $this->exporter->generate_filename(),
			'data'     => $export_data,
		);

		return $this->success( $response_data );
	}

	/**
	 * Import configurations.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		// Get import data - it could be in 'data' key or directly in body.
		$import_data = $body['data'] ?? $body;

		// Check if it's a valid import structure.
		if ( ! isset( $import_data['configs'] ) && ! isset( $import_data['plugin'] ) ) {
			return $this->error(
				'invalid_import_data',
				__( 'Invalid import data structure. Please provide a valid export file.', 'rox-dynamic-cpt-fields-engine' ),
				400
			);
		}

		// Perform import.
		$result = $this->importer->import( $import_data, false );

		if ( ! $result['success'] ) {
			return $this->success( $result );
		}

		return $this->success( $result );
	}

	/**
	 * Validate import without applying (dry run).
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function validate_import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		// Get import data - it could be in 'data' key or directly in body.
		$import_data = $body['data'] ?? $body;

		// Check if it's a valid import structure.
		if ( ! isset( $import_data['configs'] ) && ! isset( $import_data['plugin'] ) ) {
			return $this->error(
				'invalid_import_data',
				__( 'Invalid import data structure. Please provide a valid export file.', 'rox-dynamic-cpt-fields-engine' ),
				400
			);
		}

		// Perform validation only (dry run).
		$result = $this->importer->import( $import_data, true );

		return $this->success( $result );
	}

	/**
	 * Flush rewrite rules.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function flush_rewrite( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		// Flush rewrite rules.
		flush_rewrite_rules( false );

		return $this->success(
			array(
				'success' => true,
				'message' => __( 'Rewrite rules have been flushed successfully.', 'rox-dynamic-cpt-fields-engine' ),
			)
		);
	}

	/**
	 * Pro: build import vs current DB diff.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function import_diff( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$pro_gate = $this->require_pro();
		if ( is_wp_error( $pro_gate ) ) {
			return $pro_gate;
		}

		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$import_data = $body['data'] ?? $body;

		if ( ! isset( $import_data['configs'] ) && ! isset( $import_data['plugin'] ) ) {
			return $this->error(
				'invalid_import_data',
				__( 'Invalid import data structure. Please provide a valid export file.', 'rox-dynamic-cpt-fields-engine' ),
				400
			);
		}

		$generator = new DiffGenerator();

		return $this->success( $generator->analyze( $import_data ) );
	}

	/**
	 * Pro: optional snapshot, resolutions, then import.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function import_apply( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$pro_gate = $this->require_pro();
		if ( is_wp_error( $pro_gate ) ) {
			return $pro_gate;
		}

		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$import_data = $body['data'] ?? $body;

		if ( ! isset( $import_data['configs'] ) && ! isset( $import_data['plugin'] ) ) {
			return $this->error(
				'invalid_import_data',
				__( 'Invalid import data structure. Please provide a valid export file.', 'rox-dynamic-cpt-fields-engine' ),
				400
			);
		}

		$resolutions = ( isset( $body['resolutions'] ) && is_array( $body['resolutions'] ) )
			? $body['resolutions']
			: array();

		$rollback = new RollbackManager();

		if ( ! empty( $body['create_snapshot_before'] ) ) {
			$label  = isset( $body['snapshot_label'] ) && is_string( $body['snapshot_label'] ) && $body['snapshot_label'] !== ''
				? sanitize_text_field( $body['snapshot_label'] )
				: __( 'Before import', 'rox-dynamic-cpt-fields-engine' );
			$source = isset( $body['snapshot_source'] ) && is_string( $body['snapshot_source'] ) && $body['snapshot_source'] !== ''
				? sanitize_text_field( $body['snapshot_source'] )
				: null;

			$rollback->push_snapshot( $label, $source );
		}

		if ( ! empty( $resolutions ) ) {
			$resolved = ConflictResolver::apply( $import_data, $resolutions );
			if ( is_wp_error( $resolved ) ) {
				return $resolved;
			}
			$import_data = $resolved;
		}

		$result = $this->importer->import( $import_data, false );

		if ( ! $result['success'] ) {
			return $this->success( $result );
		}

		return $this->success( $result );
	}

	/**
	 * Pro: list rollback snapshots.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function list_snapshots( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		unset( $request );

		$pro_gate = $this->require_pro();
		if ( is_wp_error( $pro_gate ) ) {
			return $pro_gate;
		}

		$rollback = new RollbackManager();

		return $this->success(
			array(
				'retention' => $rollback->get_retention(),
				'snapshots' => $rollback->list_snapshots_meta(),
			)
		);
	}

	/**
	 * Pro: store current export as snapshot.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_snapshot( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$pro_gate = $this->require_pro();
		if ( is_wp_error( $pro_gate ) ) {
			return $pro_gate;
		}

		$body  = $this->get_json_body( $request );
		$label = __( 'Manual snapshot', 'rox-dynamic-cpt-fields-engine' );
		$src   = null;

		if ( ! is_wp_error( $body ) ) {
			if ( isset( $body['label'] ) && is_string( $body['label'] ) && $body['label'] !== '' ) {
				$label = sanitize_text_field( $body['label'] );
			}
			if ( isset( $body['source'] ) && is_string( $body['source'] ) && $body['source'] !== '' ) {
				$src = sanitize_text_field( $body['source'] );
			}
		}

		$rollback = new RollbackManager();
		$id       = $rollback->push_snapshot( $label, $src );

		return $this->success(
			array(
				'id'      => $id,
				'message' => __( 'Snapshot created.', 'rox-dynamic-cpt-fields-engine' ),
			),
			201
		);
	}

	/**
	 * Pro: update snapshot retention limit.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function set_snapshot_retention( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$pro_gate = $this->require_pro();
		if ( is_wp_error( $pro_gate ) ) {
			return $pro_gate;
		}

		$body = $this->get_json_body( $request );

		if ( is_wp_error( $body ) ) {
			return $body;
		}

		$retention = isset( $body['retention'] ) ? absint( $body['retention'] ) : 5;
		$rollback  = new RollbackManager();
		$rollback->set_retention( $retention );

		return $this->success(
			array(
				'retention' => $rollback->get_retention(),
				'snapshots' => $rollback->list_snapshots_meta(),
			)
		);
	}

	/**
	 * Pro: full snapshot payload (large).
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_snapshot( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$pro_gate = $this->require_pro();
		if ( is_wp_error( $pro_gate ) ) {
			return $pro_gate;
		}

		$id = (string) $request['id'];

		$rollback = new RollbackManager();
		$snap     = $rollback->get_snapshot( $id );

		if ( null === $snap ) {
			return $this->error(
				'snapshot_not_found',
				__( 'Snapshot not found.', 'rox-dynamic-cpt-fields-engine' ),
				404
			);
		}

		return $this->success( $snap );
	}

	/**
	 * Pro: restore configuration state from snapshot.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function restore_snapshot( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$pro_gate = $this->require_pro();
		if ( is_wp_error( $pro_gate ) ) {
			return $pro_gate;
		}

		$id       = (string) $request['id'];
		$rollback = new RollbackManager();
		$result   = $rollback->restore( $id );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->success( $result );
	}

	/**
	 * Ensure Pro is active for advanced import tooling.
	 *
	 * @return bool|WP_Error
	 */
	private function require_pro(): bool|WP_Error {
		if ( ! (bool) apply_filters( 'rdcfe_is_pro_active', false ) ) {
			return new WP_Error(
				'pro_required',
				__( 'This action requires an active Pro license.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Get export endpoint parameters.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_export_params(): array {
		return array(
			'types' => array(
				'description' => __( 'Config types to export.', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'array',
				'items'       => array(
					'type' => 'string',
					'enum' => array( 'post_type', 'taxonomy', 'field_group', 'options_page' ),
				),
				'default'     => array(),
			),
			'ids'   => array(
				'description' => __( 'Specific config IDs to export.', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'array',
				'items'       => array(
					'type' => 'integer',
				),
				'default'     => array(),
			),
		);
	}

	/**
	 * Get import endpoint parameters.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_import_params(): array {
		return array(
			'data' => array(
				'description' => __( 'The import data (from export).', 'rox-dynamic-cpt-fields-engine' ),
				'type'        => 'object',
				'required'    => true,
			),
		);
	}
}
