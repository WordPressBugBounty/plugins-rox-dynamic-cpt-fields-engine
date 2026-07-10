<?php
/**
 * Toggle Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class ToggleField
 *
 * Boolean toggle switch field.
 */
class ToggleField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'toggle';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Toggle';

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
				$checked    = (bool) $value;
				$on_label   = $field['on_label'] ?? __( 'On', 'rox-dynamic-cpt-fields-engine' );
				$off_label  = $field['off_label'] ?? __( 'Off', 'rox-dynamic-cpt-fields-engine' );

				echo '<label class="rdcfe-toggle">';
				echo '<input type="hidden" name="' . esc_attr( $field['name'] ) . '" value="0" />';
				echo '<input type="checkbox" ';
				echo 'id="' . esc_attr( $field['name'] ) . '" ';
				echo 'name="' . esc_attr( $field['name'] ) . '" ';
				echo 'value="1" ';
				checked( $checked );
				echo 'class="rdcfe-toggle__input" />';
				echo '<span class="rdcfe-toggle__slider"></span>';
				echo '<span class="rdcfe-toggle__labels">';
				echo '<span class="rdcfe-toggle__on">' . esc_html( $on_label ) . '</span>';
				echo '<span class="rdcfe-toggle__off">' . esc_html( $off_label ) . '</span>';
				echo '</span>';
				echo '</label>';
			}
		);
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): bool {
		return (bool) $value;
	}

	/**
	 * Get the default value.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool
	 */
	public function get_default_value( array $field ): bool {
		return (bool) ( $field['default_value'] ?? false );
	}

	/**
	 * Format the field value.
	 *
	 * @param mixed                $value The raw value.
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool
	 */
	public function format( mixed $value, array $field ): bool {
		return (bool) $value;
	}
}

