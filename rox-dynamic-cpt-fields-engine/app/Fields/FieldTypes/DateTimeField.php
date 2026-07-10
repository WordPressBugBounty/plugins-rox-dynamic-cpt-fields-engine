<?php
/**
 * DateTime Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class DateTimeField
 *
 * Combined date and time input field.
 */
class DateTimeField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'datetime';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Date & Time';

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
				$attrs['type']  = 'datetime-local';
				$attrs['value'] = $this->format_for_input( $value );
				$attrs['class'] = 'rdcfe-input rdcfe-input--datetime';
				$attrs['step']  = $field['time_step'] ?? '60';

				echo '<div class="rdcfe-datetime-wrapper">';
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values.
				echo '<input ' . $this->render_attrs( $attrs ) . ' />';
				echo '</div>';

				
			}
		);
	}

	/**
	 * Format value for datetime-local input (Y-m-d\TH:i).
	 *
	 * @param mixed $value The value to format.
	 * @return string
	 */
	private function format_for_input( mixed $value ): string {
		if ( empty( $value ) ) {
			return '';
		}

		$value = (string) $value;

		// Already in datetime-local format (Y-m-d\TH:i).
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value ) ) {
			return $value;
		}

		// Convert from Y-m-d H:i format to datetime-local format.
		if ( preg_match( '/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/', $value, $matches ) ) {
			return $matches[1] . 'T' . $matches[2];
		}

		// Try to parse as timestamp or date string.
		$timestamp = strtotime( $value );
		if ( false !== $timestamp ) {
			return gmdate( 'Y-m-d\TH:i', $timestamp );
		}

		return '';
	}

	/**
	 * Parse datetime value into date and time parts.
	 *
	 * @param mixed $value The value to parse.
	 * @return array{date: string, time: string}
	 */
	private function parse_datetime( mixed $value ): array {
		if ( empty( $value ) ) {
			return array(
				'date' => '',
				'time' => '',
			);
		}

		$value = (string) $value;

		// Try Y-m-d H:i:s or Y-m-d H:i format.
		if ( preg_match( '/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(:\d{2})?$/', $value, $matches ) ) {
			return array(
				'date' => $matches[1],
				'time' => $matches[2],
			);
		}

		// Try parsing as timestamp.
		$timestamp = strtotime( $value );
		if ( false !== $timestamp ) {
			return array(
				'date' => gmdate( 'Y-m-d', $timestamp ),
				'time' => gmdate( 'H:i', $timestamp ),
			);
		}

		return array(
			'date' => '',
			'time' => '',
		);
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return string The sanitized value in Y-m-d H:i format.
	 */
	public function sanitize( mixed $value, array $field ): string {
		if ( empty( $value ) ) {
			return '';
		}

		$value = sanitize_text_field( (string) $value );

		// Handle datetime-local format (Y-m-dTH:i) - convert T to space.
		if ( preg_match( '/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/', $value, $matches ) ) {
			return $matches[1] . ' ' . $matches[2];
		}

		// Already in Y-m-d H:i format.
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/', $value ) ) {
			return $value;
		}

		// Try to parse as timestamp or date string.
		$timestamp = strtotime( $value );
		if ( false !== $timestamp ) {
			return gmdate( 'Y-m-d H:i', $timestamp );
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

		// Check datetime format (Y-m-d H:i).
		if ( ! empty( $value ) ) {
			$datetime = (string) $value;

			// Validate Y-m-d H:i format.
			if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/', $datetime ) ) {
				return new \WP_Error(
					'invalid_datetime_format',
					sprintf(
						/* translators: %s: field label */
						__( '%s must be a valid date and time.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
			}

			// Parse and validate.
			$parts = $this->parse_datetime( $datetime );

			// Validate date.
			$date_parts = explode( '-', $parts['date'] );
			if ( ! checkdate( (int) $date_parts[1], (int) $date_parts[2], (int) $date_parts[0] ) ) {
				return new \WP_Error(
					'invalid_date',
					sprintf(
						/* translators: %s: field label */
						__( '%s contains an invalid date.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
			}

			// Validate time.
			$time_parts = explode( ':', $parts['time'] );
			$hours      = (int) $time_parts[0];
			$mins       = (int) $time_parts[1];

			if ( $hours < 0 || $hours > 23 || $mins < 0 || $mins > 59 ) {
				return new \WP_Error(
					'invalid_time',
					sprintf(
						/* translators: %s: field label */
						__( '%s contains an invalid time.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
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
			return current_time( 'Y-m-d H:i' );
		}

		$parts = $this->parse_datetime( $default );
		if ( ! empty( $parts['date'] ) ) {
			return $parts['date'] . ' ' . ( $parts['time'] ?: '00:00' );
		}

		return '';
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

		// Get display format from field config or use WordPress date + time format.
		$date_format = $field['display_date_format'] ?? get_option( 'date_format', 'F j, Y' );
		$time_format = $field['display_time_format'] ?? get_option( 'time_format', 'g:i a' );
		$display_format = $date_format . ' ' . $time_format;

		$timestamp = strtotime( (string) $value );
		if ( false !== $timestamp ) {
			return wp_date( $display_format, $timestamp );
		}

		return $value;
	}
}
