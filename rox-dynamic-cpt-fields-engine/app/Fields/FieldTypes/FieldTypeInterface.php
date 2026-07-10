<?php
/**
 * Field Type Interface
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Interface FieldTypeInterface
 *
 * Interface for all field types.
 */
interface FieldTypeInterface {

	/**
	 * Get the field type identifier.
	 *
	 * @return string
	 */
	public function get_type(): string;

	/**
	 * Get the field type label.
	 *
	 * @return string
	 */
	public function get_label(): string;

	/**
	 * Get the field category (basic, choice, media, etc.).
	 *
	 * @return string
	 */
	public function get_category(): string;

	/**
	 * Render the field input.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param mixed                $value The current value.
	 * @param int                  $object_id The object ID (post, term, user).
	 * @return void
	 */
	public function render( array $field, mixed $value, int $object_id ): void;

	/**
	 * Sanitize the field value before saving.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return mixed The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): mixed;

	/**
	 * Format the field value for display.
	 *
	 * @param mixed                $value The raw value.
	 * @param array<string, mixed> $field The field configuration.
	 * @return mixed The formatted value.
	 */
	public function format( mixed $value, array $field ): mixed;

	/**
	 * Get the default value for this field type.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return mixed
	 */
	public function get_default_value( array $field ): mixed;

	/**
	 * Validate the field value.
	 *
	 * @param mixed                $value The value to validate.
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool|\WP_Error True if valid, WP_Error if not.
	 */
	public function validate( mixed $value, array $field ): bool|\WP_Error;
}

