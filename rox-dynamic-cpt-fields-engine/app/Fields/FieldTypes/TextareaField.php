<?php
/**
 * Textarea Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class TextareaField
 *
 * Multi-line text input field.
 */
class TextareaField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'textarea';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Textarea';

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
				$attrs['class'] = 'rdcfe-textarea large-text';
				$attrs['rows'] = (string) ( $field['rows'] ?? 4 );

				$max_len = $this->resolve_max_length( $field );
				if ( null !== $max_len ) {
					$attrs['maxlength'] = (string) $max_len;
				}

				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values.
				echo '<textarea ' . $this->render_attrs( $attrs ) . '>' . esc_textarea( (string) $value ) . '</textarea>';
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
		// Allow newlines but sanitize HTML.
		if ( ! empty( $field['new_lines'] ) && 'br' === $field['new_lines'] ) {
			return nl2br( sanitize_textarea_field( (string) $value ) );
		}

		return sanitize_textarea_field( (string) $value );
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

