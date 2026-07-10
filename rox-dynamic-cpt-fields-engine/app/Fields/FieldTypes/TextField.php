<?php
/**
 * Text Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class TextField
 *
 * Simple text input field.
 */
class TextField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'text';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Text';

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
				$attrs['type']  = 'text';
				$attrs['value'] = (string) $value;
				$attrs['class'] = 'rdcfe-input rdcfe-input--text regular-text';

				$max_len = $this->resolve_max_length( $field );
				if ( null !== $max_len ) {
					$attrs['maxlength'] = (string) $max_len;
				} else {
					// Sensible default when the author did not set Max Characters.
					$attrs['maxlength'] = '255';
				}

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
		return sanitize_text_field( (string) $value );
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

		// Check maxlength (builder `character_limit` or legacy `maxlength`).
		$max_len = $this->resolve_max_length( $field );
		if ( null !== $max_len && strlen( (string) $value ) > $max_len ) {
			return new \WP_Error(
				'maxlength',
				sprintf(
					/* translators: 1: field label, 2: max length */
					__( '%1$s must not exceed %2$d characters.', 'rox-dynamic-cpt-fields-engine' ),
					$field['label'] ?? $field['name'],
					$max_len
				)
			);
		}

		return true;
	}
}

