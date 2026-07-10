<?php
/**
 * URL Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class UrlField
 *
 * URL input field with validation.
 */
class UrlField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'url';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'URL';

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
				$attrs['type']  = 'url';
				$attrs['value'] = (string) $value;
				$attrs['class'] = 'rdcfe-input rdcfe-input--url regular-text';

				if ( ! empty( $field['prepend'] ) || ! empty( $field['append'] ) ) {
					echo '<div class="rdcfe-input-group">';

					if ( ! empty( $field['prepend'] ) ) {
						echo '<span class="rdcfe-input-group__prepend">' . esc_html( $field['prepend'] ) . '</span>';
					}

					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values.
					echo '<input ' . $this->render_attrs( $attrs ) . ' />';

					if ( ! empty( $field['append'] ) ) {
						echo '<span class="rdcfe-input-group__append">' . esc_html( $field['append'] ) . '</span>';
					}

					echo '</div>';
				} else {
					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values.
					echo '<input ' . $this->render_attrs( $attrs ) . ' />';
				}
			}
		);
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return string The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): string {
		$url = (string) $value;

		// If empty, return empty string.
		if ( empty( $url ) ) {
			return '';
		}

		// Use esc_url_raw for database storage (preserves protocol).
		return esc_url_raw( $url );
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

		// Check URL format.
		if ( ! empty( $value ) ) {
			$url = (string) $value;

			// Allow URLs with or without protocol.
			// Add http:// if no protocol specified for validation.
			if ( ! preg_match( '~^(?:f|ht)tps?://~i', $url ) ) {
				$url = 'http://' . $url;
			}

			// Validate URL format.
			if ( ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
				return new \WP_Error(
					'invalid_url',
					sprintf(
						/* translators: %s: field label */
						__( '%s must be a valid URL.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
					)
				);
			}
		}

		return true;
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

		// Return escaped URL for display.
		return esc_url( (string) $value );
	}
}
