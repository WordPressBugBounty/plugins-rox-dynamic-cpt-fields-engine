<?php
/**
 * Validation Result
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Schema;

/**
 * Class ValidationResult
 *
 * Represents the result of a schema validation.
 */
class ValidationResult {

	/**
	 * Whether the validation passed.
	 *
	 * @var bool
	 */
	private bool $valid;

	/**
	 * Validation errors.
	 *
	 * @var array<array{path: string, message: string, code: string}>
	 */
	private array $errors = array();

	/**
	 * Validation warnings.
	 *
	 * @var array<array{path: string, message: string, code: string}>
	 */
	private array $warnings = array();

	/**
	 * Constructor.
	 *
	 * @param bool $valid Whether validation passed.
	 */
	public function __construct( bool $valid = true ) {
		$this->valid = $valid;
	}

	/**
	 * Create a successful validation result.
	 *
	 * @return self
	 */
	public static function success(): self {
		return new self( true );
	}

	/**
	 * Create a failed validation result.
	 *
	 * @return self
	 */
	public static function failure(): self {
		return new self( false );
	}

	/**
	 * Add an error.
	 *
	 * @param string $path The path to the invalid field.
	 * @param string $message The error message.
	 * @param string $code The error code.
	 * @return self
	 */
	public function add_error( string $path, string $message, string $code = 'validation_error' ): self {
		$this->errors[] = array(
			'path'    => $path,
			'message' => $message,
			'code'    => $code,
		);
		$this->valid = false;

		return $this;
	}

	/**
	 * Add a warning.
	 *
	 * @param string $path The path to the field.
	 * @param string $message The warning message.
	 * @param string $code The warning code.
	 * @return self
	 */
	public function add_warning( string $path, string $message, string $code = 'validation_warning' ): self {
		$this->warnings[] = array(
			'path'    => $path,
			'message' => $message,
			'code'    => $code,
		);

		return $this;
	}

	/**
	 * Merge another validation result into this one.
	 *
	 * @param ValidationResult $other The other result to merge.
	 * @return self
	 */
	public function merge( ValidationResult $other ): self {
		$this->errors   = array_merge( $this->errors, $other->get_errors() );
		$this->warnings = array_merge( $this->warnings, $other->get_warnings() );

		if ( ! $other->is_valid() ) {
			$this->valid = false;
		}

		return $this;
	}

	/**
	 * Check if validation passed.
	 *
	 * @return bool
	 */
	public function is_valid(): bool {
		return $this->valid;
	}

	/**
	 * Get all errors.
	 *
	 * @return array<array{path: string, message: string, code: string}>
	 */
	public function get_errors(): array {
		return $this->errors;
	}

	/**
	 * Get all warnings.
	 *
	 * @return array<array{path: string, message: string, code: string}>
	 */
	public function get_warnings(): array {
		return $this->warnings;
	}

	/**
	 * Check if there are any errors.
	 *
	 * @return bool
	 */
	public function has_errors(): bool {
		return ! empty( $this->errors );
	}

	/**
	 * Check if there are any warnings.
	 *
	 * @return bool
	 */
	public function has_warnings(): bool {
		return ! empty( $this->warnings );
	}

	/**
	 * Convert to array.
	 *
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return array(
			'valid'    => $this->valid,
			'errors'   => $this->errors,
			'warnings' => $this->warnings,
		);
	}
}

