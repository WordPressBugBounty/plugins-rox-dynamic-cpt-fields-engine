<?php
/**
 * Importer Class
 *
 * Handles importing configurations from JSON format.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\ImportExport;

use RDCFE\Config\ConfigRepository;
use RDCFE\Registration\RegistrationManager;

/**
 * Class Importer
 *
 * Imports plugin configurations from JSON format.
 */
class Importer {

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $repository;

	/**
	 * Import validator.
	 *
	 * @var ImportValidator
	 */
	private ImportValidator $validator;

	/**
	 * Import results.
	 *
	 * @var array<string, array<mixed>>
	 */
	private array $results = array();

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->repository = new ConfigRepository();
		$this->validator  = new ImportValidator();
	}

	/**
	 * Import configurations from JSON data.
	 *
	 * @param array<string, mixed> $data    The import data.
	 * @param bool                 $dry_run If true, only validate without applying.
	 * @return array<string, mixed> Import results.
	 */
	public function import( array $data, bool $dry_run = false ): array {
		$this->reset();

		// Validate the import data.
		$is_valid = $this->validator->validate( $data );

		// Build initial result.
		$result = array(
			'success'     => false,
			'dry_run'     => $dry_run,
			'validation'  => $this->validator->to_array(),
			'imported'    => array(),
			'updated'     => array(),
			'skipped'     => array(),
			'failed'      => array(),
		);

		// If not valid, return early with validation errors.
		if ( ! $is_valid ) {
			$result['message'] = __( 'Validation failed. Please check the errors below.', 'rox-dynamic-cpt-fields-engine' );
			return $result;
		}

		// If dry run, return validation results only.
		if ( $dry_run ) {
			$result['success'] = true;
			$result['message'] = __( 'Validation successful. Data is ready for import.', 'rox-dynamic-cpt-fields-engine' );
			return $result;
		}

		// Process valid items.
		$valid_items = $this->validator->get_valid_items();

		foreach ( $valid_items as $type => $items ) {
			foreach ( $items as $item ) {
				$this->import_config( $type, $item );
			}
		}

		// Schedule rewrite rules flush.
		RegistrationManager::schedule_flush();

		// Build final result.
		$result['success']  = empty( $this->results['failed'] );
		$result['imported'] = $this->results['imported'] ?? array();
		$result['updated']  = $this->results['updated'] ?? array();
		$result['skipped']  = $this->results['skipped'] ?? array();
		$result['failed']   = $this->results['failed'] ?? array();
		$result['summary']  = $this->get_summary();

		if ( $result['success'] ) {
			$result['message'] = sprintf(
				/* translators: %d: number of items */
				__( 'Successfully imported %d configuration(s).', 'rox-dynamic-cpt-fields-engine' ),
				count( $result['imported'] ) + count( $result['updated'] )
			);
		} else {
			$result['message'] = __( 'Some items could not be imported. Please check the details below.', 'rox-dynamic-cpt-fields-engine' );
		}

		/**
		 * Fires after import is complete.
		 *
		 * @since 1.0.0
		 *
		 * @param array $result The import result.
		 * @param array $data   The original import data.
		 */
		do_action( 'rdcfe_import_complete', $result, $data );

		return $result;
	}

	/**
	 * Reset import state.
	 *
	 * @return void
	 */
	private function reset(): void {
		$this->results = array(
			'imported' => array(),
			'updated'  => array(),
			'skipped'  => array(),
			'failed'   => array(),
		);
	}

	/**
	 * Import a single config item.
	 *
	 * @param string               $type The config type.
	 * @param array<string, mixed> $item The config item data.
	 * @return void
	 */
	private function import_config( string $type, array $item ): void {
		$title  = $item['title'] ?? '';
		$slug   = $item['slug'] ?? sanitize_title( $title );
		$status = $item['status'] ?? 'publish';
		$data   = $item['data'] ?? array();

		// Ensure slug is in data.
		$data['slug'] = $slug;

		// Check if config with this slug exists.
		$existing = $this->repository->get_by_slug( $type, $slug );

		if ( $existing ) {
			// Update existing config.
			$result = $this->repository->update(
				$existing['id'],
				$data,
				$title,
				$status
			);

			if ( is_wp_error( $result ) ) {
				$this->results['failed'][] = array(
					'type'    => $type,
					'slug'    => $slug,
					'title'   => $title,
					'action'  => 'update',
					'error'   => $result->get_error_message(),
				);
			} else {
				$this->results['updated'][] = array(
					'type'   => $type,
					'slug'   => $slug,
					'title'  => $title,
					'id'     => $existing['id'],
					'action' => 'updated',
				);
			}
		} else {
			// Create new config.
			$result = $this->repository->create( $type, $title, $data, $status );

			if ( is_wp_error( $result ) ) {
				$this->results['failed'][] = array(
					'type'   => $type,
					'slug'   => $slug,
					'title'  => $title,
					'action' => 'create',
					'error'  => $result->get_error_message(),
				);
			} else {
				$this->results['imported'][] = array(
					'type'   => $type,
					'slug'   => $slug,
					'title'  => $title,
					'id'     => $result,
					'action' => 'created',
				);
			}
		}
	}

	/**
	 * Import from JSON string.
	 *
	 * @param string $json    The JSON string.
	 * @param bool   $dry_run If true, only validate.
	 * @return array<string, mixed> Import results.
	 */
	public function import_from_json( string $json, bool $dry_run = false ): array {
		$data = json_decode( $json, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return array(
				'success' => false,
				'message' => __( 'Invalid JSON format. Please check your file and try again.', 'rox-dynamic-cpt-fields-engine' ),
				'validation' => array(
					'valid'  => false,
					'errors' => array(
						array(
							'code'    => 'invalid_json',
							'message' => json_last_error_msg(),
						),
					),
				),
			);
		}

		return $this->import( $data, $dry_run );
	}

	/**
	 * Get import summary.
	 *
	 * @return array<string, int>
	 */
	private function get_summary(): array {
		return array(
			'imported' => count( $this->results['imported'] ?? array() ),
			'updated'  => count( $this->results['updated'] ?? array() ),
			'skipped'  => count( $this->results['skipped'] ?? array() ),
			'failed'   => count( $this->results['failed'] ?? array() ),
			'total'    => count( $this->results['imported'] ?? array() )
					   + count( $this->results['updated'] ?? array() )
					   + count( $this->results['skipped'] ?? array() )
					   + count( $this->results['failed'] ?? array() ),
		);
	}

	/**
	 * Get the validator instance.
	 *
	 * @return ImportValidator
	 */
	public function get_validator(): ImportValidator {
		return $this->validator;
	}
}
