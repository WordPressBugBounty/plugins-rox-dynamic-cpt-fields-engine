<?php
/**
 * Radio Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class RadioField
 *
 * Radio button input field.
 */
class RadioField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'radio';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Radio';

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
				// Check both 'options_layout' (from frontend) and 'layout' (legacy) for layout setting.
				$layout  = $field['options_layout'] ?? $field['layout'] ?? 'vertical';

				echo '<div class="rdcfe-radio-group rdcfe-radio-group--' . esc_attr( $layout ) . '">';

				foreach ( $choices as $choice_value => $choice_label ) {
					$id = $field['name'] . '_' . sanitize_key( (string) $choice_value );

					echo '<label class="rdcfe-radio-item">';
					echo '<input type="radio" ';
					echo 'id="' . esc_attr( $id ) . '" ';
					echo 'name="' . esc_attr( $field['name'] ) . '" ';
					echo 'value="' . esc_attr( (string) $choice_value ) . '" ';
					checked( $value, $choice_value );
					echo ' />';
					echo '<span class="rdcfe-radio-label">' . esc_html( $choice_label ) . '</span>';
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
	 * @return string The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): string {
		$value   = sanitize_text_field( (string) $value );
		$choices = $this->get_field_choices( $field );

		if ( '' !== $value && ! array_key_exists( $value, $choices ) ) {
			return '';
		}

		return $value;
	}
}

