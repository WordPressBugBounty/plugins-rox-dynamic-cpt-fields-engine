<?php
/**
 * Date Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class DateField
 *
 * Date input field with date picker.
 */
class DateField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'date';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Date';

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
		// Enqueue jQuery UI Datepicker 
		wp_enqueue_script( 'jquery-ui-datepicker' );

		$this->render_wrapper(
			$field,
			function () use ( $field, $value ) {
				$attrs          = $this->get_input_attrs( $field );
				$attrs['type']  = 'text';
				$attrs['value'] = $this->format_for_display( $value );
				$attrs['class'] = 'rdcfe-input rdcfe-input--date rdcfe-datepicker';

				// Add data attributes for datepicker options.
				$attrs['data-date-format'] = 'yy-mm-dd';
				$attrs['autocomplete']     = 'off';

				if ( ! empty( $field['min_date'] ) ) {
					$attrs['data-min-date'] = $this->format_for_input( $field['min_date'] );
				}

				if ( ! empty( $field['max_date'] ) ) {
					$attrs['data-max-date'] = $this->format_for_input( $field['max_date'] );
				}

				echo '<div class="rdcfe-date-wrapper">';
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values.
				echo '<input ' . $this->render_attrs( $attrs ) . ' />';
				echo '<span class="rdcfe-date-icon dashicons dashicons-calendar-alt"></span>';
				echo '</div>';
				// Note: Datepicker initialization is handled by rdcfe-fields.js using data attributes.
			}
		);
	}

	/**
	 * Format value for display in input.
	 *
	 * @param mixed $value The value to format.
	 * @return string
	 */
	private function format_for_display( mixed $value ): string {
		return $this->format_for_input( $value );
	}

	/**
	 * Format value for HTML date input (Y-m-d).
	 *
	 * @param mixed $value The value to format.
	 * @return string
	 */
	private function format_for_input( mixed $value ): string {
		if ( empty( $value ) ) {
			return '';
		}

		$value = (string) $value;

		// Already in Y-m-d format.
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return $value;
		}

		// Try to parse as timestamp.
		if ( is_numeric( $value ) ) {
			return gmdate( 'Y-m-d', (int) $value );
		}

		// Try to parse as date string.
		$timestamp = strtotime( $value );
		if ( false !== $timestamp ) {
			return gmdate( 'Y-m-d', $timestamp );
		}

		return '';
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return string The sanitized value in Y-m-d format.
	 */
	public function sanitize( mixed $value, array $field ): string {
		if ( empty( $value ) ) {
			return '';
		}

		$value = sanitize_text_field( (string) $value );

		// Already in Y-m-d format.
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return $value;
		}

		// Try to parse as timestamp.
		if ( is_numeric( $value ) ) {
			return gmdate( 'Y-m-d', (int) $value );
		}

		// Try to parse as date string.
		$timestamp = strtotime( $value );
		if ( false !== $timestamp ) {
			return gmdate( 'Y-m-d', $timestamp );
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

		// Check date format (Y-m-d).
		if ( ! empty( $value ) ) {
			$date = (string) $value;

			// Validate Y-m-d format.
			if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
				return new \WP_Error(
					'invalid_date_format',
					sprintf(
						/* translators: %s: field label */
						__( '%s must be a valid date in YYYY-MM-DD format.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
			}

			// Validate actual date.
			$parts = explode( '-', $date );
			if ( ! checkdate( (int) $parts[1], (int) $parts[2], (int) $parts[0] ) ) {
				return new \WP_Error(
					'invalid_date',
					sprintf(
						/* translators: %s: field label */
						__( '%s must be a valid date.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
			}

			// Check min date.
			if ( ! empty( $field['min_date'] ) ) {
				$min_date = $this->format_for_input( $field['min_date'] );
				if ( $date < $min_date ) {
					return new \WP_Error(
						'date_too_early',
						sprintf(
							/* translators: 1: field label, 2: min date */
							__( '%1$s must be on or after %2$s.', 'rox-dynamic-cpt-fields-engine' ),
							$field['label'] ?? $field['name'],
							$min_date
						)
					);
				}
			}

			// Check max date.
			if ( ! empty( $field['max_date'] ) ) {
				$max_date = $this->format_for_input( $field['max_date'] );
				if ( $date > $max_date ) {
					return new \WP_Error(
						'date_too_late',
						sprintf(
							/* translators: 1: field label, 2: max date */
							__( '%1$s must be on or before %2$s.', 'rox-dynamic-cpt-fields-engine' ),
							$field['label'] ?? $field['name'],
							$max_date
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
		if ( 'today' === $default || 'now' === $default ) {
			return current_time( 'Y-m-d' );
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

		// Get display format from field config or use WordPress date format.
		$display_format = $field['display_format'] ?? get_option( 'date_format', 'F j, Y' );

		$timestamp = strtotime( (string) $value );
		if ( false !== $timestamp ) {
			return wp_date( $display_format, $timestamp );
		}

		return $value;
	}
}
