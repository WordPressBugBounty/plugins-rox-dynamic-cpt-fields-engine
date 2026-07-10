<?php
/**
 * Select Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class SelectField
 *
 * Dropdown select field.
 */
class SelectField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'select';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Select';

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
				$attrs          = $this->get_input_attrs( $field );
				$attrs['class'] = 'rdcfe-select';
				$choices        = $this->get_field_choices( $field );
				$multiple       = ! empty( $field['multiple'] );

				if ( $multiple ) {
					$attrs['multiple'] = 'multiple';
					$attrs['name']    .= '[]';
					$value             = is_array( $value ) ? $value : array( $value );
				}

				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values.
				echo '<select ' . $this->render_attrs( $attrs ) . '>';

				// Add empty option if allow_null.
				if ( ! empty( $field['allow_null'] ) ) {
					echo '<option value="">' . esc_html( $field['null_label'] ?? '— Select —' ) . '</option>';
				}

				foreach ( $choices as $choice_value => $choice_label ) {
					$selected = $multiple
						? ( in_array( (string) $choice_value, array_map( 'strval', (array) $value ), true ) ? 'selected' : '' )
						: selected( $value, $choice_value, false );

					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $selected is either empty or 'selected'.
					echo '<option value="' . esc_attr( (string) $choice_value ) . '" ' . $selected . '>';
					echo esc_html( $choice_label );
					echo '</option>';
				}

				echo '</select>';
			}
		);
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return string|array<string> The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): string|array {
		$choices = $this->get_field_choices( $field );

		if ( is_array( $value ) ) {
			// Multiple select.
			return array_filter(
				array_map( 'sanitize_text_field', $value ),
				function ( $v ) use ( $choices ) {
					return array_key_exists( $v, $choices );
				}
			);
		}

		// Single select - validate against choices.
		$value = sanitize_text_field( (string) $value );

		if ( '' !== $value && ! array_key_exists( $value, $choices ) ) {
			return '';
		}

		return $value;
	}
}

