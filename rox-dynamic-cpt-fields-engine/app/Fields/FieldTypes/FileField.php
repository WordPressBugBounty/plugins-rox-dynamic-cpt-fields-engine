<?php
/**
 * File Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class FileField
 *
 * File upload/select field using WordPress Media Library.
 */
class FileField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'file';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'File';

	/**
	 * Field category.
	 *
	 * @var string
	 */
	protected string $category = 'media';

	/**
	 * Render the field input.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param mixed                $value The current value (attachment ID).
	 * @param int                  $object_id The object ID.
	 * @return void
	 */
	public function render( array $field, mixed $value, int $object_id ): void {
		$this->render_wrapper(
			$field,
			function () use ( $field, $value ) {
				$attachment_id = $this->resolve_attachment_id( $value );
				$file_name     = '';
				$file_url      = '';

				if ( $attachment_id ) {
					$file_name = basename( get_attached_file( $attachment_id ) ?: '' );
					$file_url  = wp_get_attachment_url( $attachment_id );
				}

				$mime_types = $field['mime_types'] ?? '';

				echo '<div class="rdcfe-file-field" data-field="' . esc_attr( $field['name'] ) . '" data-mime-types="' . esc_attr( $mime_types ) . '">';

				// Hidden input for value.
				echo '<input type="hidden" ';
				echo 'id="' . esc_attr( $field['name'] ) . '" ';
				echo 'name="' . esc_attr( $field['name'] ) . '" ';
				echo 'value="' . esc_attr( (string) $attachment_id ) . '" ';
				echo 'class="rdcfe-file-field__input" />';

				// File info.
				echo '<div class="rdcfe-file-field__info">';
				if ( $file_url ) {
					echo '<a href="' . esc_url( $file_url ) . '" target="_blank" class="rdcfe-file-field__link">';
					echo esc_html( $file_name ?: basename( $file_url ) );
					echo '</a>';
				}
				echo '</div>';

				// Buttons.
				echo '<div class="rdcfe-file-field__buttons">';
				echo '<button type="button" class="button rdcfe-file-field__select">';
				echo esc_html__( 'Select File', 'rox-dynamic-cpt-fields-engine' );
				echo '</button>';
				echo '<button type="button" class="button rdcfe-file-field__remove" style="' . ( $attachment_id ? '' : 'display:none;' ) . '">';
				echo esc_html__( 'Remove', 'rox-dynamic-cpt-fields-engine' );
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
	 * @return int The sanitized attachment ID.
	 */
	public function sanitize( mixed $value, array $field ): int {
		$attachment_id = $this->resolve_attachment_id( $value );

		// Verify it's a valid attachment.
		if ( $attachment_id && ! get_post( $attachment_id ) ) {
			return 0;
		}

		// Check mime type restrictions if set.
		if ( $attachment_id && ! empty( $field['mime_types'] ) ) {
			$allowed_mimes = array_map( 'trim', explode( ',', $field['mime_types'] ) );
			$file_mime     = get_post_mime_type( $attachment_id );

			$is_allowed = false;
			foreach ( $allowed_mimes as $mime ) {
				if ( str_contains( $file_mime, $mime ) ) {
					$is_allowed = true;
					break;
				}
			}

			if ( ! $is_allowed ) {
				return 0;
			}
		}

		return $attachment_id;
	}

	/**
	 * Resolve a stored value to an attachment ID.
	 *
	 * @param mixed $value Raw stored value.
	 * @return int
	 */
	protected function resolve_attachment_id( mixed $value ): int {
		if ( is_array( $value ) ) {
			return absint( $value['id'] ?? $value['ID'] ?? 0 );
		}

		return absint( $value );
	}

	/**
	 * Format the field value.
	 *
	 * @param mixed                $value The raw value (attachment ID).
	 * @param array<string, mixed> $field The field configuration.
	 * @return array<string, mixed>|int|string Formatted value based on return_format.
	 */
	public function format( mixed $value, array $field ): array|int|string {
		$attachment_id = $this->resolve_attachment_id( $value );

		if ( ! $attachment_id ) {
			return 0;
		}

		$return_format = $field['return_format'] ?? 'id';

		if ( 'id' === $return_format ) {
			return $attachment_id;
		}

		if ( 'url' === $return_format ) {
			return wp_get_attachment_url( $attachment_id ) ?: '';
		}

		if ( 'array' === $return_format ) {
			$file_path = get_attached_file( $attachment_id );

			return array(
				'id'       => $attachment_id,
				'url'      => wp_get_attachment_url( $attachment_id ),
				'title'    => get_the_title( $attachment_id ),
				'filename' => $file_path ? basename( $file_path ) : '',
				'filesize' => $file_path && file_exists( $file_path ) ? filesize( $file_path ) : 0,
				'mime'     => get_post_mime_type( $attachment_id ),
			);
		}

		return $attachment_id;
	}

	/**
	 * Get the default value.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return int
	 */
	public function get_default_value( array $field ): int {
		return (int) ( $field['default_value'] ?? 0 );
	}
}

