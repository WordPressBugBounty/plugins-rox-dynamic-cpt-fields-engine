<?php
/**
 * Time Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class TimeField
 *
 * Time input field with time picker.
 */
class TimeField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'time';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Time';

	/**
	 * Field category.
	 *
	 * @var string
	 */
	protected string $category = 'basic';

	/**
	 * Render the field input.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param mixed                $value The current value.
	 * @param int                  $object_id The object ID.
	 * @return void
	 */
	public function render( array $field, mixed $value, int $object_id ): void {
		$this->render_wrapper(
			$field,
			function () use ( $field, $value ) {
				$attrs          = $this->get_input_attrs( $field );
				$attrs['type']  = 'time';
				$attrs['value'] = $this->format_for_input( $value );
				$attrs['class'] = 'rdcfe-input rdcfe-input--time';
				$attrs['step']  = $field['step'] ?? '60'; // Default 1 minute steps.

				if ( ! empty( $field['min_time'] ) ) {
					$attrs['min'] = $this->format_for_input( $field['min_time'] );
				}

				if ( ! empty( $field['max_time'] ) ) {
					$attrs['max'] = $this->format_for_input( $field['max_time'] );
				}

				// Native time input - browser provides the clock icon.
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values.
				echo '<input ' . $this->render_attrs( $attrs ) . ' />';

			}
		);
	}

	/**
	 * Format value for HTML time input (H:i).
	 *
	 * @param mixed $value The value to format.
	 * @return string
	 */
	private function format_for_input( mixed $value ): string {
		if ( empty( $value ) ) {
			return '';
		}

		$value = (string) $value;

		// Already in H:i or H:i:s format.
		if ( preg_match( '/^\d{2}:\d{2}(:\d{2})?$/', $value ) ) {
			return substr( $value, 0, 5 ); // Return H:i format.
		}

		// Try to parse as time string.
		$timestamp = strtotime( $value );
		if ( false !== $timestamp ) {
			return gmdate( 'H:i', $timestamp );
		}

		return '';
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return string The sanitized value in H:i format.
	 */
	public function sanitize( mixed $value, array $field ): string {
		if ( empty( $value ) ) {
			return '';
		}

		$value = sanitize_text_field( (string) $value );

		// Already in H:i or H:i:s format.
		if ( preg_match( '/^\d{2}:\d{2}(:\d{2})?$/', $value ) ) {
			return substr( $value, 0, 5 );
		}

		// Try to parse as time string.
		$timestamp = strtotime( $value );
		if ( false !== $timestamp ) {
			return gmdate( 'H:i', $timestamp );
		}

		return '';
	}

	/**
	 * Validate the field value.
	 *
	 * @param mixed                $value The value to validate.
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool|\WP_Error
	 */
	public function validate( mixed $value, array $field ): bool|\WP_Error {
		$parent_validation = parent::validate( $value, $field );

		if ( is_wp_error( $parent_validation ) ) {
			return $parent_validation;
		}

		// Skip validation if empty and not required.
		if ( empty( $value ) && empty( $field['required'] ) ) {
			return true;
		}

		// Check time format (H:i).
		if ( ! empty( $value ) ) {
			$time = (string) $value;

			// Validate H:i format.
			if ( ! preg_match( '/^\d{2}:\d{2}$/', $time ) ) {
				return new \WP_Error(
					'invalid_time_format',
					sprintf(
						/* translators: %s: field label */
						__( '%s must be a valid time in HH:MM format.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
			}

			// Validate actual time values.
			$parts = explode( ':', $time );
			$hours = (int) $parts[0];
			$mins  = (int) $parts[1];

			if ( $hours < 0 || $hours > 23 || $mins < 0 || $mins > 59 ) {
				return new \WP_Error(
					'invalid_time',
					sprintf(
						/* translators: %s: field label */
						__( '%s must be a valid time.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
			}

			// Check min time.
			if ( ! empty( $field['min_time'] ) ) {
				$min_time = $this->format_for_input( $field['min_time'] );
				if ( $time < $min_time ) {
					return new \WP_Error(
						'time_too_early',
						sprintf(
							/* translators: 1: field label, 2: min time */
							__( '%1$s must be at or after %2$s.', 'rox-dynamic-cpt-fields-engine' ),
							$field['label'] ?? $field['name'],
							$min_time
						)
					);
				}
			}

			// Check max time.
			if ( ! empty( $field['max_time'] ) ) {
				$max_time = $this->format_for_input( $field['max_time'] );
				if ( $time > $max_time ) {
					return new \WP_Error(
						'time_too_late',
						sprintf(
							/* translators: 1: field label, 2: max time */
							__( '%1$s must be at or before %2$s.', 'rox-dynamic-cpt-fields-engine' ),
							$field['label'] ?? $field['name'],
							$max_time
						)
					);
				}
			}
		}

		return true;
	}

	/**
	 * Get the default value for this field type.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return mixed
	 */
	public function get_default_value( array $field ): mixed {
		$default = $field['default_value'] ?? '';

		// Handle special default values.
		if ( 'now' === $default || 'current' === $default ) {
			return current_time( 'H:i' );
		}

		return $this->format_for_input( $default );
	}

	/**
	 * Format the field value for display.
	 *
	 * @param mixed                $value The raw value.
	 * @param array<string, mixed> $field The field configuration.
	 * @return mixed The formatted value.
	 */
	public function format( mixed $value, array $field ): mixed {
		if ( empty( $value ) ) {
			return '';
		}

		// Get display format from field config or use WordPress time format.
		$display_format = $field['display_format'] ?? get_option( 'time_format', 'g:i a' );

		$timestamp = strtotime( '1970-01-01 ' . (string) $value );
		if ( false !== $timestamp ) {
			return gmdate( $display_format, $timestamp );
		}

		return $value;
	}
}
