<?php
/**
 * Abstract Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class AbstractFieldType
 *
 * Base class for field types with common functionality.
 */
abstract class AbstractFieldType implements FieldTypeInterface {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = '';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = '';

	/**
	 * Field category.
	 *
	 * @var string
	 */
	protected string $category = 'basic';

	/**
	 * Get the field type identifier.
	 *
	 * @return string
	 */
	public function get_type(): string {
		return $this->type;
	}

	/**
	 * Get the field type label.
	 *
	 * @return string
	 */
	public function get_label(): string {
		return $this->label;
	}

	/**
	 * Get the field category.
	 *
	 * @return string
	 */
	public function get_category(): string {
		return $this->category;
	}

	/**
	 * Whether the field stores data in postmeta / termmeta / usermeta /
	 * options.
	 *
	 * Display-only fields (HTML content blocks) and layout markers
	 * (tab/accordion/endpoint) override this to return `false` so the
	 * meta-saving and REST-registration loops know to skip them. Default
	 * is `true` for every storable input field.
	 *
	 * @return bool
	 */
	public function is_storable(): bool {
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
		return $value;
	}

	/**
	 * Validate the field value.
	 *
	 * @param mixed                $value The value to validate.
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool|\WP_Error True if valid, WP_Error if not.
	 */
	public function validate( mixed $value, array $field ): bool|\WP_Error {
		// Check required.
		if ( ! empty( $field['required'] ) && $this->is_empty( $value ) ) {
			return new \WP_Error(
				'required',
				sprintf(
					/* translators: %s: field label */
					__( '%s is required.', 'rox-dynamic-cpt-fields-engine' ),
					$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' )
				)
			);
		}

		return true;
	}

	/**
	 * Check if a value is empty.
	 *
	 * @param mixed $value The value to check.
	 * @return bool
	 */
	protected function is_empty( mixed $value ): bool {
		if ( null === $value ) {
			return true;
		}

		if ( is_string( $value ) && '' === trim( $value ) ) {
			return true;
		}

		if ( is_array( $value ) && empty( $value ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Max length from the metabox / CPT builder (`character_limit`) or legacy
	 * `maxlength`. Returns null when unset, empty, or non-positive (no limit).
	 *
	 * @param array<string, mixed> $field Field configuration.
	 * @return int|null
	 */
	protected function resolve_max_length( array $field ): ?int {
		$raw = $field['character_limit'] ?? $field['maxlength'] ?? null;
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		$n = (int) $raw;
		return $n > 0 ? $n : null;
	}

	/**
	 * Normalize choices array to associative array format.
	 *
	 * Handles both formats:
	 * - New format (array of objects): [['value' => 'x', 'label' => 'Y'], ...]
	 * - Old format (associative): ['x' => 'Y', ...]
	 *
	 * @param mixed $choices The choices to normalize.
	 * @return array<string, string> Normalized associative array.
	 */
	protected function normalize_choices( mixed $choices ): array {
		if ( ! is_array( $choices ) ) {
			return array();
		}

		// Check if it's already in the correct format (associative with string values).
		$first_key   = array_key_first( $choices );
		$first_value = $choices[ $first_key ] ?? null;

		// If first value is a string and first key is a string, it's already correct.
		if ( is_string( $first_key ) && is_string( $first_value ) ) {
			return $choices;
		}

		// Convert from array of objects format to associative.
		$normalized = array();
		foreach ( $choices as $item ) {
			if ( is_array( $item ) && isset( $item['value'] ) ) {
				$normalized[ (string) $item['value'] ] = (string) ( $item['label'] ?? $item['value'] );
			} elseif ( is_string( $item ) ) {
				// Handle simple string array.
				$normalized[ $item ] = $item;
			}
		}

		return $normalized;
	}

	/**
	 * Resolve and normalize the choices/options for a choice-style field
	 * (select, radio, checkbox, etc.).
	 *
	 * The React editor stores the dropdown items under `options`, while older
	 * configs and PHP-API integrations may use `choices`. We accept both so
	 * field types render consistently regardless of how the config was created.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return array<string, string> Normalized associative array of value => label.
	 */
	protected function get_field_choices( array $field ): array {
		$source = $field['options'] ?? $field['choices'] ?? array();
		return $this->normalize_choices( $source );
	}

	/**
	 * Resolve the field width inline style.
	 *
	 * Accepts both the new `field_width` key (string like '50%', '66.6%') used by
	 * the React editor and the legacy `width` key (numeric like 50). Falls back to
	 * 100% when missing or invalid. Mirrors the mapping used by CPTMetaFieldsManager
	 * so widths render consistently across Metaboxes and CPT meta fields.
	 *
	 * Each non-100% width is emitted as a `flex` shorthand with `calc(N% - Xpx)`
	 * (and matching `width` / `max-width`). The shave value `X` is sized for
	 * "max packing" — i.e. how many siblings would naturally fit on one row at
	 * that width — and absorbs:
	 *
	 *   1. The cumulative padding the wp-admin reset adds to each `.rdcfe-field`
	 *      child (the gutter pattern's `margin: -6px` only compensates for 6px
	 *      of child padding; the wp-admin reset and CPT layout CSS push it to
	 *      12px each side, leaving 6px+ of overflow per child even with
	 *      box-sizing: border-box because of how flex resolves percentage
	 *      widths against the container's content box).
	 *   2. Sub-pixel rounding (floats summing to 100.0001px wrap the last
	 *      sibling onto a new row).
	 *
	 * Empirically `33.33% - 16px` is the smallest shave that fits three siblings
	 * in a Group/Repeater row inside a real CPT metabox; we use the same scale
	 * for `25%` and slightly smaller shaves for wider widths since fewer
	 * neighbours share the row. Including `flex: 0 0 calc(...)` is what
	 * actually fixes the wrap on flex children — a bare `width` is sometimes
	 * treated as a suggestion when the parent is a `flex-wrap: wrap` container,
	 * whereas an explicit `flex-basis` is honoured.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return string Inline style declaration.
	 */
	protected function resolve_field_width_style( array $field ): string {
		$raw_width = $field['field_width'] ?? $field['width'] ?? '100%';

		// Normalize legacy numeric widths (25, 50, 75, 100) to the editor's string format.
		if ( is_numeric( $raw_width ) ) {
			$raw_width = $raw_width . '%';
		}

		// [percentage, shave-in-px]. Shave matches the maximum siblings-per-row
		// for that width: 4 columns at 25% and 3 columns at 33.33% need the
		// most overhead, so they get the largest shave.
		$config = match ( (string) $raw_width ) {
			'75%'   => array( '75%', 8 ),
			'66.6%' => array( '66.66%', 12 ),
			'50%'   => array( '50%', 12 ),
			'33.3%' => array( '33.33%', 16 ),
			'25%'   => array( '25%', 16 ),
			default => null,
		};

		if ( null === $config ) {
			return 'width: 100%;';
		}

		[ $pct, $shave ] = $config;

		return sprintf(
			'flex: 0 0 calc(%1$s - %2$dpx); width: calc(%1$s - %2$dpx); max-width: calc(%1$s - %2$dpx);',
			$pct,
			$shave
		);
	}

	/**
	 * Render field wrapper.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param callable             $render_input The input render callback.
	 * @return void
	 */
	protected function render_wrapper( array $field, callable $render_input ): void {
		$width_style = $this->resolve_field_width_style( $field );
		$classes     = array( 'rdcfe-field', 'rdcfe-field--' . $this->type );
		$is_required = ! empty( $field['required'] );

		if ( ! empty( $field['wrapper_class'] ) ) {
			$classes[] = $field['wrapper_class'];
		}

		if ( $is_required ) {
			$classes[] = 'rdcfe-field--required';
		}

		/**
		 * Filters the CSS classes on the field wrapper.
		 *
		 * Pro plugins use this to add `rdcfe-field--has-conditional-logic`
		 * and other conditional CSS hooks.
		 *
		 * @since 1.0.0
		 *
		 * @param array<int, string>   $classes Wrapper CSS classes.
		 * @param array<string, mixed> $field   The field configuration.
		 * @param string               $type    The field type identifier.
		 */
		$classes = apply_filters( 'rdcfe_field_wrapper_classes', $classes, $field, $this->type );

		// Base validation data attributes shipped by the free plugin.
		$attrs = array(
			'data-field-type'  => $this->type,
			'data-field-name'  => (string) ( $field['name'] ?? '' ),
			'data-field-label' => (string) ( $field['label'] ?? $field['name'] ?? '' ),
		);

		if ( $is_required ) {
			$attrs['data-required'] = 'true';
		}

		/**
		 * Filters the data-* attribute map on the field wrapper.
		 *
		 * Pro plugins use this to inject `data-rdcfe-conditional-logic`
		 * and `data-rdcfe-validation-pattern` so client-side scripts can
		 * evaluate visibility / regex rules without round-tripping back
		 * to the registry.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, string> $attrs The data attribute map.
		 * @param array<string, mixed>  $field The field configuration.
		 * @param string                $type  The field type identifier.
		 */
		$attrs = apply_filters( 'rdcfe_field_wrapper_attrs', $attrs, $field, $this->type );

		$data_attrs = $this->render_attrs( $attrs );

		// Field-level helper text. The metabox UI saves it as `description`,
		// but legacy/imported configs may use `instructions` instead of `description`.
		// Accept either so a config that originated from any builder still
		// renders the helper line below the label/input.
		$field_help = $field['description'] ?? $field['instructions'] ?? '';
		?>
		<div class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>" style="<?php echo esc_attr( $width_style ); ?>" <?php echo $data_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_attrs() escapes all values. ?>>
			<div class="rdcfe-field__label">
				<label for="<?php echo esc_attr( $field['name'] ); ?>">
					<?php echo esc_html( $field['label'] ?? $field['name'] ); ?>
					<?php if ( $is_required ) : ?>
						<span class="rdcfe-required">*</span>
					<?php endif; ?>
				</label>
			</div>
			<div class="rdcfe-field__input">
				<?php $render_input(); ?>
			</div>
			<?php if ( ! empty( $field_help ) ) : ?>
				<div class="rdcfe-field__instructions">
					<?php echo esc_html( $field_help ); ?>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Get common input attributes.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return array<string, string>
	 */
	protected function get_input_attrs( array $field ): array {
		$attrs = array(
			'id'   => $field['name'],
			'name' => $field['name'],
		);

		if ( ! empty( $field['required'] ) ) {
			$attrs['required'] = 'required';
		}

		if ( ! empty( $field['placeholder'] ) ) {
			$attrs['placeholder'] = $field['placeholder'];
		}

		if ( ! empty( $field['disabled'] ) ) {
			$attrs['disabled'] = 'disabled';
		}

		if ( ! empty( $field['readonly'] ) ) {
			$attrs['readonly'] = 'readonly';
		}

		return $attrs;
	}

	/**
	 * Render attributes as HTML string.
	 *
	 * All values are escaped with esc_attr() for security.
	 *
	 * @param array<string, string> $attrs The attributes.
	 * @return string Already-escaped HTML attribute string.
	 */
	protected function render_attrs( array $attrs ): string {
		$html = array();

		foreach ( $attrs as $key => $value ) {
			if ( is_bool( $value ) ) {
				if ( $value ) {
					$html[] = esc_attr( $key );
				}
			} else {
				$html[] = esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
			}
		}

		return implode( ' ', $html );
	}
}

