<?php
/**
 * Checkbox Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class CheckboxField
 *
 * Checkbox input field (single or multiple).
 */
class CheckboxField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'checkbox';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Checkbox';

	/**
	 * Field category.
	 *
	 * @var string
	 */
	protected string $category = 'choice';

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
				$choices = $this->get_field_choices( $field );
				$value   = is_array( $value ) ? $value : ( $value ? array( $value ) : array() );
				// Check both 'options_layout' (from frontend) and 'layout' (legacy) for layout setting.
				$layout  = $field['options_layout'] ?? $field['layout'] ?? 'vertical';

				echo '<div class="rdcfe-checkbox-group rdcfe-checkbox-group--' . esc_attr( $layout ) . '">';

				foreach ( $choices as $choice_value => $choice_label ) {
					$checked = in_array( (string) $choice_value, array_map( 'strval', $value ), true );
					$id      = $field['name'] . '_' . sanitize_key( (string) $choice_value );

					echo '<label class="rdcfe-checkbox-item">';
					echo '<input type="checkbox" ';
					echo 'id="' . esc_attr( $id ) . '" ';
					echo 'name="' . esc_attr( $field['name'] ) . '[]" ';
					echo 'value="' . esc_attr( (string) $choice_value ) . '" ';
					checked( $checked );
					echo ' />';
					echo '<span class="rdcfe-checkbox-label">' . esc_html( $choice_label ) . '</span>';
					echo '</label>';
				}

				echo '</div>';
			}
		);
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return array<string> The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): array {
		if ( ! is_array( $value ) ) {
			$value = $value ? array( $value ) : array();
		}

		$choices = $this->get_field_choices( $field );

		return array_values(
			array_filter(
				array_map( 'sanitize_text_field', $value ),
				function ( $v ) use ( $choices ) {
					return array_key_exists( $v, $choices );
				}
			)
		);
	}

	/**
	 * Get the default value.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return array<string>
	 */
	public function get_default_value( array $field ): array {
		$default = $field['default_value'] ?? array();
		return is_array( $default ) ? $default : array();
	}
}

