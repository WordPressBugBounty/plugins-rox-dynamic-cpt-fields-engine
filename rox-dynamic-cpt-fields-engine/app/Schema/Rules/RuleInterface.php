<?php
/**
 * Validation Rule Interface
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Schema\Rules;

use RDCFE\Schema\ValidationResult;

/**
 * Interface RuleInterface
 *
 * Interface for validation rules.
 */
interface RuleInterface {

	/**
	 * Validate a value.
	 *
	 * @param mixed              $value The value to validate.
	 * @param string             $path The path to the field being validated.
	 * @param array<string,mixed> $context Additional context for validation.
	 * @return ValidationResult
	 */
	public function validate( mixed $value, string $path, array $context = array() ): ValidationResult;

	/**
	 * Get the rule name.
	 *
	 * @return string
	 */
	public function get_name(): string;
}

