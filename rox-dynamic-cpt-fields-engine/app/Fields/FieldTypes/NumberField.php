<?php
/**
 * Number Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class NumberField
 *
 * Numeric input field.
 */
class NumberField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'number';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Number';

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
				$attrs['type']  = 'number';
				$attrs['value'] = (string) $value;
				$attrs['class'] = 'rdcfe-input rdcfe-input--number regular-text';

				if ( isset( $field['min'] ) ) {
					$attrs['min'] = (string) $field['min'];
				}

				if ( isset( $field['max'] ) ) {
					$attrs['max'] = (string) $field['max'];
				}

				if ( isset( $field['step'] ) ) {
					$attrs['step'] = (string) $field['step'];
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
	 * @return int|float|string The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): int|float|string {
		if ( '' === $value || null === $value ) {
			return '';
		}

		// Determine if we should return int or float.
		$step = $field['step'] ?? 1;

		if ( is_float( $step ) || str_contains( (string) $step, '.' ) ) {
			return (float) $value;
		}

		return (int) $value;
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
		if ( '' === $value && empty( $field['required'] ) ) {
			return true;
		}

		// Check if numeric.
		if ( ! is_numeric( $value ) ) {
			return new \WP_Error(
				'not_numeric',
				sprintf(
					/* translators: %s: field label */
					__( '%s must be a number.', 'rox-dynamic-cpt-fields-engine' ),
					$field['label'] ?? $field['name']
				)
			);
		}

		$num_value = (float) $value;

		// Check min.
		if ( isset( $field['min'] ) && $num_value < (float) $field['min'] ) {
			return new \WP_Error(
				'min_value',
				sprintf(
					/* translators: 1: field label, 2: min value */
					__( '%1$s must be at least %2$s.', 'rox-dynamic-cpt-fields-engine' ),
					$field['label'] ?? $field['name'],
					$field['min']
				)
			);
		}

		// Check max.
		if ( isset( $field['max'] ) && $num_value > (float) $field['max'] ) {
			return new \WP_Error(
				'max_value',
				sprintf(
					/* translators: 1: field label, 2: max value */
					__( '%1$s must not exceed %2$s.', 'rox-dynamic-cpt-fields-engine' ),
					$field['label'] ?? $field['name'],
					$field['max']
				)
			);
		}

		return true;
	}
}

