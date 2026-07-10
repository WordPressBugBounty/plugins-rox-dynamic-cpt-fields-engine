<?php
/**
 * Import Validator Class
 *
 * Validates import data before applying.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\ImportExport;

use RDCFE\Config\ConfigPostType;
use RDCFE\Config\ConfigRepository;
use RDCFE\Schema\Validator as SchemaValidator;

/**
 * Class ImportValidator
 *
 * Validates import data structure and content.
 */
class ImportValidator {

	/**
	 * Schema validator.
	 *
	 * @var SchemaValidator
	 */
	private SchemaValidator $schema_validator;

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $repository;

	/**
	 * Validation errors.
	 *
	 * @var array<array<string, mixed>>
	 */
	private array $errors = array();

	/**
	 * Validation warnings.
	 *
	 * @var array<array<string, mixed>>
	 */
	private array $warnings = array();

	/**
	 * Valid items.
	 *
	 * @var array<string, array<mixed>>
	 */
	private array $valid_items = array();

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->schema_validator = new SchemaValidator();
		$this->repository       = new ConfigRepository();
	}

	/**
	 * Validate import data.
	 *
	 * @param array<string, mixed> $data The import data.
	 * @return bool True if valid, false if errors.
	 */
	public function validate( array $data ): bool {
		$this->reset();

		// Validate structure.
		if ( ! $this->validate_structure( $data ) ) {
			return false;
		}

		// Validate version compatibility.
		$this->validate_version( $data['version'] ?? '' );

		// Validate each config type.
		$configs = $data['configs'] ?? array();

		foreach ( $configs as $type => $items ) {
			$this->validate_config_type( $type, $items );
		}

		return empty( $this->errors );
	}

	/**
	 * Reset validation state.
	 *
	 * @return void
	 */
	private function reset(): void {
		$this->errors      = array();
		$this->warnings    = array();
		$this->valid_items = array();
	}

	/**
	 * Validate the basic structure of import data.
	 *
	 * @param array<string, mixed> $data The import data.
	 * @return bool True if structure is valid.
	 */
	private function validate_structure( array $data ): bool {
		// Check required fields.
		if ( empty( $data['plugin'] ) || 'rox-dynamic-cpt-fields-engine' !== $data['plugin'] ) {
			$this->add_error( 'invalid_plugin', __( 'This file was not exported from Dynamic CPT Fields Engine.', 'rox-dynamic-cpt-fields-engine' ) );
			return false;
		}

		if ( ! isset( $data['configs'] ) || ! is_array( $data['configs'] ) ) {
			$this->add_error( 'missing_configs', __( 'Import file is missing configuration data.', 'rox-dynamic-cpt-fields-engine' ) );
			return false;
		}

		if ( empty( $data['configs'] ) ) {
			$this->add_error( 'empty_configs', __( 'Import file contains no configurations to import.', 'rox-dynamic-cpt-fields-engine' ) );
			return false;
		}

		return true;
	}

	/**
	 * Validate version compatibility.
	 *
	 * @param string $version The export version.
	 * @return void
	 */
	private function validate_version( string $version ): void {
		if ( empty( $version ) ) {
			$this->add_warning( 'missing_version', __( 'Export version not specified. Some features may not import correctly.', 'rox-dynamic-cpt-fields-engine' ) );
			return;
		}

		// For now, we support version 1.0.0.
		// Future versions can add migration logic here.
		if ( version_compare( $version, '1.0.0', '<' ) ) {
			$this->add_warning(
				'old_version',
				sprintf(
					/* translators: %s: version number */
					__( 'This export is from an older version (%s). Some data may need manual verification.', 'rox-dynamic-cpt-fields-engine' ),
					$version
				)
			);
		}
	}

	/**
	 * Validate a config type and its items.
	 *
	 * @param string              $type  The config type.
	 * @param array<array<mixed>> $items The config items.
	 * @return void
	 */
	private function validate_config_type( string $type, array $items ): void {
		$exportable_types = array( 'post_type', 'taxonomy', 'field_group', 'options_page' );

		if ( ! in_array( $type, $exportable_types, true ) ) {
			$this->add_warning(
				'unknown_type',
				sprintf(
					/* translators: %s: config type */
					__( 'Unknown configuration type "%s" will be skipped.', 'rox-dynamic-cpt-fields-engine' ),
					$type
				)
			);
			return;
		}

		foreach ( $items as $index => $item ) {
			$this->validate_config_item( $type, $item, $index );
		}
	}

	/**
	 * Validate a single config item.
	 *
	 * @param string             $type  The config type.
	 * @param array<string, mixed> $item  The config item.
	 * @param int                $index The item index.
	 * @return void
	 */
	private function validate_config_item( string $type, array $item, int $index ): void {
		$item_label = sprintf( '%s #%d', $type, $index + 1 );

		// Check required fields.
		if ( empty( $item['title'] ) && empty( $item['slug'] ) ) {
			$this->add_error(
				'missing_identifier',
				sprintf(
					/* translators: %s: item label */
					__( '%s is missing both title and slug.', 'rox-dynamic-cpt-fields-engine' ),
					$item_label
				),
				$type,
				$index
			);
			return;
		}

		// Validate slug format.
		$slug = $item['slug'] ?? sanitize_title( $item['title'] ?? '' );
		if ( ! preg_match( '/^[a-z0-9_-]+$/', $slug ) ) {
			$this->add_error(
				'invalid_slug',
				sprintf(
					/* translators: 1: item label, 2: slug */
					__( '%1$s has an invalid slug: "%2$s". Slugs must contain only lowercase letters, numbers, hyphens, and underscores.', 'rox-dynamic-cpt-fields-engine' ),
					$item_label,
					$slug
				),
				$type,
				$index
			);
			return;
		}

		// Check for duplicate slug in database.
		if ( $this->repository->slug_exists( $type, $slug ) ) {
			$this->add_warning(
				'duplicate_slug',
				sprintf(
					/* translators: 1: item label, 2: slug */
					__( '%1$s with slug "%2$s" already exists. It will be updated on import.', 'rox-dynamic-cpt-fields-engine' ),
					$item_label,
					$slug
				),
				$type,
				$index
			);
		}

		// Validate config data based on type.
		$data = $item['data'] ?? array();
		$validation_result = $this->validate_config_data( $type, $data );

		if ( ! $validation_result['valid'] ) {
			foreach ( $validation_result['errors'] as $error ) {
				$this->add_error(
					'validation_error',
					sprintf(
						/* translators: 1: item label, 2: error message */
						__( '%1$s: %2$s', 'rox-dynamic-cpt-fields-engine' ),
						$item_label,
						$error
					),
					$type,
					$index
				);
			}
			return;
		}

		// Add warnings from validation.
		foreach ( $validation_result['warnings'] as $warning ) {
			$this->add_warning(
				'validation_warning',
				sprintf(
					/* translators: 1: item label, 2: warning message */
					__( '%1$s: %2$s', 'rox-dynamic-cpt-fields-engine' ),
					$item_label,
					$warning
				),
				$type,
				$index
			);
		}

		// Mark as valid for import.
		if ( ! isset( $this->valid_items[ $type ] ) ) {
			$this->valid_items[ $type ] = array();
		}
		$this->valid_items[ $type ][] = $item;
	}

	/**
	 * Validate config data using schema validator.
	 *
	 * @param string             $type The config type.
	 * @param array<string, mixed> $data The config data.
	 * @return array{valid: bool, errors: array<string>, warnings: array<string>}
	 */
	private function validate_config_data( string $type, array $data ): array {
		$result = array(
			'valid'    => true,
			'errors'   => array(),
			'warnings' => array(),
		);

		// Use schema validator based on type.
		switch ( $type ) {
			case 'post_type':
				$validation = $this->schema_validator->validate_post_type( $data );
				break;

			case 'taxonomy':
				$validation = $this->schema_validator->validate_taxonomy( $data );
				break;

			case 'field_group':
				$validation = $this->schema_validator->validate_field_group( $data );
				break;

			case 'options_page':
				$validation = $this->schema_validator->validate_options_page( $data );
				break;

			default:
				// Unknown type, skip validation.
				return $result;
		}

		if ( ! $validation->is_valid() ) {
			$result['valid'] = false;
			// Extract message from error arrays.
			$result['errors'] = array_map(
				fn( array $error ) => $error['message'],
				$validation->get_errors()
			);
		}

		// Add any warnings (extract message from warning arrays).
		$result['warnings'] = array_map(
			fn( array $warning ) => $warning['message'],
			$validation->get_warnings()
		);

		return $result;
	}

	/**
	 * Add an error.
	 *
	 * @param string      $code    Error code.
	 * @param string      $message Error message.
	 * @param string|null $type    Config type.
	 * @param int|null    $index   Item index.
	 * @return void
	 */
	private function add_error( string $code, string $message, ?string $type = null, ?int $index = null ): void {
		$error = array(
			'code'    => $code,
			'message' => $message,
		);

		if ( null !== $type ) {
			$error['type'] = $type;
		}

		if ( null !== $index ) {
			$error['index'] = $index;
		}

		$this->errors[] = $error;
	}

	/**
	 * Add a warning.
	 *
	 * @param string      $code    Warning code.
	 * @param string      $message Warning message.
	 * @param string|null $type    Config type.
	 * @param int|null    $index   Item index.
	 * @return void
	 */
	private function add_warning( string $code, string $message, ?string $type = null, ?int $index = null ): void {
		$warning = array(
			'code'    => $code,
			'message' => $message,
		);

		if ( null !== $type ) {
			$warning['type'] = $type;
		}

		if ( null !== $index ) {
			$warning['index'] = $index;
		}

		$this->warnings[] = $warning;
	}

	/**
	 * Get validation errors.
	 *
	 * @return array<array<string, mixed>>
	 */
	public function get_errors(): array {
		return $this->errors;
	}

	/**
	 * Get validation warnings.
	 *
	 * @return array<array<string, mixed>>
	 */
	public function get_warnings(): array {
		return $this->warnings;
	}

	/**
	 * Get valid items ready for import.
	 *
	 * @return array<string, array<mixed>>
	 */
	public function get_valid_items(): array {
		return $this->valid_items;
	}

	/**
	 * Get validation result as array.
	 *
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return array(
			'valid'       => empty( $this->errors ),
			'errors'      => $this->errors,
			'warnings'    => $this->warnings,
			'valid_items' => $this->get_summary(),
		);
	}

	/**
	 * Get summary of valid items.
	 *
	 * @return array<string, int>
	 */
	private function get_summary(): array {
		$summary = array();

		foreach ( $this->valid_items as $type => $items ) {
			$summary[ $type ] = count( $items );
		}

		return $summary;
	}
}
