<?php
/**
 * WYSIWYG Field Type
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields\FieldTypes;

/**
 * Class WysiwygField
 *
 * Rich text editor field using WordPress wp_editor().
 */
class WysiwygField extends AbstractFieldType {

	/**
	 * Field type identifier.
	 *
	 * @var string
	 */
	protected string $type = 'wysiwyg';

	/**
	 * Field type label.
	 *
	 * @var string
	 */
	protected string $label = 'WYSIWYG Editor';

	/**
	 * Field category.
	 *
	 * @var string
	 */
	protected string $category = 'content';

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
				$field_name = $field['name'] ?? '';
				// Use unique editor ID - must be lowercase and no special chars.
				$editor_id  = 'rdcfe_' . preg_replace( '/[^a-z0-9_]/', '', strtolower( $field_name ) );
				$rows       = $field['rows'] ?? 10;

				// Editor settings - use teeny mode for better compatibility.
				$settings = array(
					'textarea_name' => $field_name,
					'textarea_rows' => $rows,
					'media_buttons' => $field['media_upload'] ?? true,
					'teeny'         => ( $field['toolbar'] ?? 'full' ) === 'basic',
					'quicktags'     => $field['quicktags'] ?? true,
					'editor_class'  => 'rdcfe-wysiwyg',
					'tinymce'       => true,
					'wpautop'       => true,
				);

				// Render the editor.
				wp_editor( (string) $value, $editor_id, $settings );
				
			}
		);
	}

	/**
	 * Get toolbar buttons for TinyMCE.
	 *
	 * @param string $toolbar The toolbar type.
	 * @return string
	 */
	private function get_toolbar( string $toolbar ): string {
		return match ( $toolbar ) {
			'basic' => 'bold,italic,underline,bullist,numlist,link,unlink',
			'full'  => 'formatselect,bold,italic,underline,strikethrough,bullist,numlist,blockquote,alignleft,aligncenter,alignright,link,unlink,wp_more,spellchecker,fullscreen,wp_adv',
			default => 'bold,italic,underline,bullist,numlist,link,unlink',
		};
	}

	/**
	 * Get second row toolbar buttons for TinyMCE.
	 *
	 * @param string $toolbar The toolbar type.
	 * @return string
	 */
	private function get_toolbar2( string $toolbar ): string {
		if ( 'full' === $toolbar ) {
			return 'formatselect,underline,alignjustify,forecolor,pastetext,removeformat,charmap,outdent,indent,undo,redo,wp_help';
		}
		return '';
	}

	/**
	 * Sanitize the field value.
	 *
	 * @param mixed                $value The value to sanitize.
	 * @param array<string, mixed> $field The field configuration.
	 * @return string The sanitized value.
	 */
	public function sanitize( mixed $value, array $field ): string {
		if ( empty( $value ) ) {
			return '';
		}

		// Use wp_kses_post to allow safe HTML.
		return wp_kses_post( (string) $value );
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

		// Check max length if specified.
		if ( ! empty( $field['maxlength'] ) && ! empty( $value ) ) {
			$plain_text = wp_strip_all_tags( (string) $value );
			if ( mb_strlen( $plain_text ) > (int) $field['maxlength'] ) {
				return new \WP_Error(
					'max_length_exceeded',
					sprintf(
						/* translators: 1: field label, 2: max length */
						__( '%1$s must not exceed %2$d characters.', 'rox-dynamic-cpt-fields-engine' ),
						$field['label'] ?? $field['name'] ?? __( 'This field', 'rox-dynamic-cpt-fields-engine' ),
						(int) $field['maxlength']
					)
				);
			}
		}

		return true;
	}

	/**
	 * Format the field value for display.
	 *
	 * @param mixed                $value The raw value.
	 * @param array<string, mixed> $field The field configuration.
	 * @return mixed The formatted value.
	 */
	public function format( mixed $value, array $field ): mixed {
		if ( empty( $value ) ) {
			return '';
		}

		// Apply the_content filters for proper formatting.
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Using WordPress core filter intentionally.
		return apply_filters( 'the_content', (string) $value );
	}
}
