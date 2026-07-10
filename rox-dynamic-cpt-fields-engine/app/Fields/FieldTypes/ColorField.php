<?php
/**
 * Color Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class ColorField
 *
 * Color picker field using WordPress Iris color picker.
 */
class ColorField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'color';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Color Picker';

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
		// Enqueue WordPress color picker with dependencies.
		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_script( 'wp-color-picker' );

		$this->render_wrapper(
			$field,
			function () use ( $field, $value ) {
				$field_name    = $field['name'] ?? '';
				$field_id      = 'rdcfe_color_' . sanitize_key( $field_name );
				$default_color = $field['default_value'] ?? '';
				$current_value = ! empty( $value ) ? (string) $value : $default_color;

				?>
				<input
					type="text"
					id="<?php echo esc_attr( $field_id ); ?>"
					name="<?php echo esc_attr( $field_name ); ?>"
					value="<?php echo esc_attr( $current_value ); ?>"
					class="rdcfe-color-field"
					data-default-color="<?php echo esc_attr( $default_color ); ?>"
				/>
				<?php
				// Note: Color picker initialization is handled by rdcfe-fields.js using data-default-color attribute.
				// Styles are in assets/css/rdcfe-fields.css
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
		if ( empty( $value ) ) {
			return '';
		}

		$value = sanitize_text_field( (string) $value );

		// Validate hex color format.
		if ( preg_match( '/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $value ) ) {
			return $value;
		}

		// Validate rgba format.
		if ( preg_match( '/^rgba?\([\d\s,\.]+\)$/i', $value ) ) {
			return $value;
		}

		// Invalid format, return empty.
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

		// Validate color format.
		if ( ! empty( $value ) ) {
			$color = (string) $value;

			// Check hex format.
			$is_hex = preg_match( '/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color );

			// Check rgba format.
			$is_rgba = preg_match( '/^rgba?\([\d\s,\.]+\)$/i', $color );

			if ( ! $is_hex && ! $is_rgba ) {
				return new \WP_Error(
					'invalid_color_format',
					sprintf(
						/* translators: %s: field label */
						__( '%s must be a valid color (hex or rgba format).', 'rox-dynamic-cpt-fields-engine' ),
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
		return $field['default_value'] ?? '';
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

		// Return color as-is or with visual swatch.
		if ( ! empty( $field['show_swatch'] ) ) {
			return sprintf(
				'<span class="rdcfe-color-swatch" style="display:inline-block;width:20px;height:20px;background:%s;border:1px solid #ccc;border-radius:3px;vertical-align:middle;margin-right:5px;"></span>%s',
				esc_attr( (string) $value ),
				esc_html( (string) $value )
			);
		}

		return $value;
	}
}
