<?php
/**
 * Image Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class ImageField
 *
 * Image upload/select field using WordPress Media Library.
 *
 * Supports two modes via the `multiple` flag on the field config:
 *   - false (default): stores a single attachment ID (int).
 *   - true:            stores a comma-separated list of attachment IDs.
 *
 * Multi-mode keeps the same field-type identifier (`image`) so existing
 * field configs keep working. Storage format mirrors the Gallery field
 * (CSV of IDs) so consumers that already understand Gallery values can
 * read multi-image Image fields the same way.
 */
class ImageField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'image';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'Image';

	/**
	 * Field category.
	 *
	 * @var string
	 */
	protected string $category = 'media';

	/**
	 * Whether the field is in multi-select mode.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool
	 */
	protected function is_multiple( array $field ): bool {
		return ! empty( $field['multiple'] );
	}

	/**
	 * Parse a stored value into an array of attachment IDs. Accepts the
	 * single-int (legacy), CSV string, or pre-decoded array shapes.
	 *
	 * @param mixed $value Raw stored value.
	 * @return array<int>
	 */
	protected function parse_ids( mixed $value ): array {
		if ( empty( $value ) ) {
			return array();
		}

		if ( is_array( $value ) ) {
			return array_values( array_filter( array_map( 'absint', $value ) ) );
		}

		if ( is_numeric( $value ) ) {
			$id = absint( $value );
			return $id ? array( $id ) : array();
		}

		if ( is_string( $value ) ) {
			// Try JSON first (in case anyone saved an array).
			if ( str_starts_with( ltrim( $value ), '[' ) ) {
				$decoded = json_decode( $value, true );
				if ( is_array( $decoded ) ) {
					return array_values( array_filter( array_map( 'absint', $decoded ) ) );
				}
			}

			$parts = array_map( 'trim', explode( ',', $value ) );
			return array_values( array_filter( array_map( 'absint', $parts ) ) );
		}

		return array();
	}

	/**
	 * Render the field input.
	 *
	 * @param array<string, mixed> $field     The field configuration.
	 * @param mixed                $value     The current value (attachment ID, CSV, or array).
	 * @param int                  $object_id The object ID.
	 * @return void
	 */
	public function render( array $field, mixed $value, int $object_id ): void {
		$this->render_wrapper(
			$field,
			function () use ( $field, $value ) {
				$multiple     = $this->is_multiple( $field );
				$preview_size = $field['preview_size'] ?? 'thumbnail';
				$ids          = $this->parse_ids( $value );
				$has_value    = ! empty( $ids );
				$stored_value = $multiple ? implode( ',', $ids ) : (string) ( $ids[0] ?? '' );

				echo '<div class="rdcfe-image-field' . ( $multiple ? ' rdcfe-image-field--multiple' : '' ) . '" '
					. 'data-field="' . esc_attr( (string) ( $field['name'] ?? '' ) ) . '" '
					. 'data-multiple="' . ( $multiple ? 'true' : 'false' ) . '">';

				echo '<input type="hidden" '
					. 'id="' . esc_attr( (string) ( $field['name'] ?? '' ) ) . '" '
					. 'name="' . esc_attr( (string) ( $field['name'] ?? '' ) ) . '" '
					. 'value="' . esc_attr( $stored_value ) . '" '
					. 'class="rdcfe-image-field__input" />';

				// Preview area.
				$preview_style = $has_value ? '' : 'display:none;';
				echo '<div class="rdcfe-image-field__preview" style="' . esc_attr( $preview_style ) . '">';

				if ( $multiple ) {
					echo '<ul class="rdcfe-image-field__list">';
					foreach ( $ids as $attachment_id ) {
						$image_url = wp_get_attachment_image_url( $attachment_id, $preview_size );
						if ( ! $image_url ) {
							continue;
						}
						echo '<li class="rdcfe-image-field__item" data-id="' . esc_attr( (string) $attachment_id ) . '">';
						echo '<img src="' . esc_url( $image_url ) . '" alt="" />';
						echo '<button type="button" class="rdcfe-image-field__item-remove" title="' . esc_attr__( 'Remove', 'rox-dynamic-cpt-fields-engine' ) . '">';
						echo '<span class="dashicons dashicons-no-alt"></span>';
						echo '</button>';
						echo '</li>';
					}
					echo '</ul>';
				} elseif ( $has_value ) {
					$image_url = wp_get_attachment_image_url( $ids[0], $preview_size );
					if ( $image_url ) {
						echo '<img src="' . esc_url( $image_url ) . '" alt="" />';
					}
				}

				echo '</div>';

				// Buttons.
				echo '<div class="rdcfe-image-field__buttons">';
				$select_label = $multiple
					? __( 'Select Images', 'rox-dynamic-cpt-fields-engine' )
					: __( 'Select Image', 'rox-dynamic-cpt-fields-engine' );
				echo '<button type="button" class="button rdcfe-image-field__select">';
				echo esc_html( $select_label );
				echo '</button>';
				echo '<button type="button" class="button rdcfe-image-field__remove" style="' . esc_attr( $has_value ? '' : 'display:none;' ) . '">';
				echo esc_html( $multiple ? __( 'Clear All', 'rox-dynamic-cpt-fields-engine' ) : __( 'Remove', 'rox-dynamic-cpt-fields-engine' ) );
				echo '</button>';
				echo '</div>';

				echo '</div>';
			}
		);
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return int|string Single ID (legacy) or CSV of IDs when multiple.
	 */
	public function sanitize( mixed $value, array $field ): int|string {
		$ids   = $this->parse_ids( $value );
		$valid = array();

		foreach ( $ids as $id ) {
			if ( wp_attachment_is_image( $id ) ) {
				$valid[] = $id;
			}
		}

		if ( $this->is_multiple( $field ) ) {
			return implode( ',', $valid );
		}

		return $valid[0] ?? 0;
	}

	/**
	 * Format the field value.
	 *
	 * @param mixed                $value The raw value (attachment ID, CSV, or array).
	 * @param array<string, mixed> $field The field configuration.
	 * @return mixed Formatted value based on `multiple` and `return_format`.
	 */
	public function format( mixed $value, array $field ): mixed {
		$multiple      = $this->is_multiple( $field );
		$return_format = $field['return_format'] ?? 'id';
		$size          = $field['preview_size'] ?? 'full';
		$ids           = $this->parse_ids( $value );

		if ( ! $multiple ) {
			$id = $ids[0] ?? 0;
			return $this->format_single( $id, $return_format, $size );
		}

		if ( empty( $ids ) ) {
			return array();
		}

		$out = array();
		foreach ( $ids as $id ) {
			$formatted = $this->format_single( $id, $return_format, $size );
			if ( '' === $formatted || 0 === $formatted || null === $formatted ) {
				continue;
			}
			$out[] = $formatted;
		}

		return $out;
	}

	/**
	 * Format a single attachment ID into the requested return format.
	 *
	 * @param int    $attachment_id The attachment ID.
	 * @param string $return_format One of 'id', 'url', 'array'.
	 * @param string $size          The image size to use.
	 * @return array<string, mixed>|int|string
	 */
	protected function format_single( int $attachment_id, string $return_format, string $size ): array|int|string {
		if ( ! $attachment_id ) {
			return 'id' === $return_format ? 0 : ( 'url' === $return_format ? '' : array() );
		}

		if ( 'id' === $return_format ) {
			return $attachment_id;
		}

		if ( 'url' === $return_format ) {
			return (string) ( wp_get_attachment_image_url( $attachment_id, $size ) ?: '' );
		}

		// 'array' (default rich payload).
		$metadata = wp_get_attachment_metadata( $attachment_id );

		return array(
			'id'     => $attachment_id,
			'url'    => wp_get_attachment_image_url( $attachment_id, $size ),
			'alt'    => get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
			'title'  => get_the_title( $attachment_id ),
			'width'  => $metadata['width'] ?? 0,
			'height' => $metadata['height'] ?? 0,
		);
	}

	/**
	 * Get the default value.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return int|string
	 */
	public function get_default_value( array $field ): int|string {
		$default = $field['default_value'] ?? '';

		if ( $this->is_multiple( $field ) ) {
			$ids = $this->parse_ids( $default );
			return implode( ',', $ids );
		}

		$ids = $this->parse_ids( $default );
		return $ids[0] ?? 0;
	}
}
