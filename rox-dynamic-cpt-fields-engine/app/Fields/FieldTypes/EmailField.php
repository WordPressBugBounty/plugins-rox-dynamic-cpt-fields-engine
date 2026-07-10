<?php
/**
 * Email Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class EmailField
 *
 * Email input field with validation.
 */
class EmailField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'email';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Email';

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
				$attrs['type']  = 'email';
				$attrs['value'] = (string) $value;
				$attrs['class'] = 'rdcfe-input rdcfe-input--email regular-text';

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
		return sanitize_email( (string) $value );
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

		// Check email format.
		if ( ! empty( $value ) && ! is_email( (string) $value ) ) {
			return new \WP_Error(
				'invalid_email',
				sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid email address.', 'rox-dynamic-cpt-fields-engine' ),
					$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
				)
			);
		}

		return true;
	}
}
