<?php
/**
 * Schema Validator
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Schema;

use RDCFE\Schema\Rules\SlugRule;
use RDCFE\Schema\Rules\ReservedWordsRule;
use RDCFE\Schema\Rules\MetaKeyRule;

/**
 * Class Validator
 *
 * Validates configuration schemas for CPTs, taxonomies, and field groups.
 */
class Validator {

	/**
	 * Validate a post type configuration.
	 *
	 * @param array<string, mixed> $config The configuration to validate.
	 * @return ValidationResult
	 */
	public function validate_post_type( array $config ): ValidationResult {
		$result = new ValidationResult();

		// Required: slug.
		if ( empty( $config['slug'] ) ) {
			$result->add_error( 'slug', __( 'Post type slug is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		} else {
			// Validate slug format.
			$slug_rule = new SlugRule();
			$result->merge( $slug_rule->validate( $config['slug'], 'slug' ) );

			// Check reserved words.
			$reserved_rule = new ReservedWordsRule( 'post_type' );
			$result->merge( $reserved_rule->validate( $config['slug'], 'slug' ) );
		}

		// Required: label.
		if ( empty( $config['label'] ) ) {
			$result->add_error( 'label', __( 'Post type label is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		}

		// Validate singular_label if provided.
		if ( isset( $config['singular_label'] ) && ! is_string( $config['singular_label'] ) ) {
			$result->add_error( 'singular_label', __( 'Singular label must be a string.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		// Validate supports array.
		if ( isset( $config['supports'] ) ) {
			if ( ! is_array( $config['supports'] ) ) {
				$result->add_error( 'supports', __( 'Supports must be an array.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
			} else {
				$valid_supports = array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'trackbacks', 'custom-fields', 'comments', 'revisions', 'page-attributes', 'post-formats' );
				foreach ( $config['supports'] as $support ) {
					if ( ! in_array( $support, $valid_supports, true ) ) {
						$result->add_warning(
							'supports',
							sprintf(
								/* translators: %s: support feature */
								__( 'Unknown support feature: %s', 'rox-dynamic-cpt-fields-engine' ),
								$support
							),
							'unknown_support'
						);
					}
				}
			}
		}

		// Validate boolean fields.
		$boolean_fields = array(
			'public',
			'hierarchical',
			'has_archive',
			'show_in_rest',
			'show_ui',
			'show_in_menu',
			'show_in_nav_menus',
			'show_in_admin_bar',
			'exclude_from_search',
			'publicly_queryable',
			'can_export',
			'map_meta_cap',
			'query_var',
			'rewrite_with_front',
			'delete_with_user',
		);
		foreach ( $boolean_fields as $field ) {
			if ( isset( $config[ $field ] ) && ! is_bool( $config[ $field ] ) ) {
				$result->add_error(
					$field,
					sprintf(
						/* translators: %s: field name */
						__( '%s must be a boolean value.', 'rox-dynamic-cpt-fields-engine' ),
						$field
					),
					'invalid_type'
				);
			}
		}

		// Validate menu_position.
		if ( isset( $config['menu_position'] ) && ! is_int( $config['menu_position'] ) ) {
			$result->add_error( 'menu_position', __( 'Menu position must be an integer.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		// Validate capability_type (string or array of two strings).
		if ( isset( $config['capability_type'] ) ) {
			$cap_type = $config['capability_type'];
			$is_valid_cap_type = is_string( $cap_type )
				|| ( is_array( $cap_type ) && 2 === count( $cap_type ) && is_string( $cap_type[0] ?? null ) && is_string( $cap_type[1] ?? null ) );

			if ( ! $is_valid_cap_type ) {
				$result->add_error( 'capability_type', __( 'Capability type must be a string or an array of two strings (singular, plural).', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
			} elseif ( is_string( $cap_type ) && '' !== $cap_type && ! preg_match( '/^[a-z][a-z0-9_]*$/', $cap_type ) ) {
				$result->add_error( 'capability_type', __( 'Capability type must start with a letter and contain only lowercase letters, numbers, and underscores.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_value' );
			}
		}

		// Validate rest_base (string only, optional).
		if ( isset( $config['rest_base'] ) && '' !== $config['rest_base'] ) {
			if ( ! is_string( $config['rest_base'] ) ) {
				$result->add_error( 'rest_base', __( 'REST base must be a string.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
			} elseif ( ! preg_match( '/^[a-z0-9][a-z0-9_-]*$/i', $config['rest_base'] ) ) {
				$result->add_error( 'rest_base', __( 'REST base may only contain letters, numbers, underscores, and hyphens.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_value' );
			}
		}

		// Validate rewrite_slug (string only, optional).
		if ( isset( $config['rewrite_slug'] ) && '' !== $config['rewrite_slug'] && ! is_string( $config['rewrite_slug'] ) ) {
			$result->add_error( 'rewrite_slug', __( 'Rewrite slug must be a string.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		// Validate rewrite.
		if ( isset( $config['rewrite'] ) && ! is_array( $config['rewrite'] ) && ! is_bool( $config['rewrite'] ) ) {
			$result->add_error( 'rewrite', __( 'Rewrite must be a boolean or an array.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		/**
		 * Filter the post type validation result.
		 *
		 * @since 1.0.0
		 *
		 * @param ValidationResult $result The validation result.
		 * @param array            $config The configuration being validated.
		 */
		return apply_filters( 'rdcfe_validate_post_type', $result, $config );
	}

	/**
	 * Validate a taxonomy configuration.
	 *
	 * @param array<string, mixed> $config The configuration to validate.
	 * @return ValidationResult
	 */
	public function validate_taxonomy( array $config ): ValidationResult {
		$result = new ValidationResult();

		// Required: slug.
		if ( empty( $config['slug'] ) ) {
			$result->add_error( 'slug', __( 'Taxonomy slug is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		} else {
			// Validate slug format.
			$slug_rule = new SlugRule();
			$result->merge( $slug_rule->validate( $config['slug'], 'slug' ) );

			// Check reserved words.
			$reserved_rule = new ReservedWordsRule( 'taxonomy' );
			$result->merge( $reserved_rule->validate( $config['slug'], 'slug' ) );
		}

		// Required: label (accept plural_label or title as fallback).
		$label = $config['label'] ?? $config['plural_label'] ?? $config['title'] ?? '';
		if ( empty( $label ) ) {
			$result->add_error( 'label', __( 'Taxonomy label is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		}

		// Validate post_types (accept object_type as fallback from frontend).
		$post_types = $config['post_types'] ?? $config['object_type'] ?? array();
		if ( empty( $post_types ) ) {
			$result->add_error( 'post_types', __( 'At least one post type must be selected.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		} elseif ( ! is_array( $post_types ) ) {
			$result->add_error( 'post_types', __( 'Post types must be an array.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		// Validate boolean fields.
		$boolean_fields = array( 'public', 'hierarchical', 'show_in_rest', 'show_ui', 'show_in_menu', 'show_in_nav_menus', 'show_tagcloud', 'show_in_quick_edit', 'show_admin_column' );
		foreach ( $boolean_fields as $field ) {
			if ( isset( $config[ $field ] ) && ! is_bool( $config[ $field ] ) ) {
				$result->add_error(
					$field,
					sprintf(
						/* translators: %s: field name */
						__( '%s must be a boolean value.', 'rox-dynamic-cpt-fields-engine' ),
						$field
					),
					'invalid_type'
				);
			}
		}

		/**
		 * Filter the taxonomy validation result.
		 *
		 * @since 1.0.0
		 *
		 * @param ValidationResult $result The validation result.
		 * @param array            $config The configuration being validated.
		 */
		return apply_filters( 'rdcfe_validate_taxonomy', $result, $config );
	}

	/**
	 * Validate a field group configuration.
	 *
	 * @param array<string, mixed> $config The configuration to validate.
	 * @return ValidationResult
	 */
	public function validate_field_group( array $config ): ValidationResult {
		$result = new ValidationResult();

		// Required: title.
		if ( empty( $config['title'] ) ) {
			$result->add_error( 'title', __( 'Field group title is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		}

		// Required: location rules.
		if ( empty( $config['location'] ) ) {
			$result->add_error( 'location', __( 'At least one location rule is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		} elseif ( ! is_array( $config['location'] ) ) {
			$result->add_error( 'location', __( 'Location must be an array.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		// Validate fields array.
		if ( isset( $config['fields'] ) ) {
			if ( ! is_array( $config['fields'] ) ) {
				$result->add_error( 'fields', __( 'Fields must be an array.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
			} else {
				foreach ( $config['fields'] as $index => $field ) {
					$field_result = $this->validate_field( $field, "fields.{$index}" );
					$result->merge( $field_result );
				}
			}
		}

		// Validate position.
		if ( isset( $config['position'] ) ) {
			$valid_positions = array( 'normal', 'side', 'acf_after_title' );
			if ( ! in_array( $config['position'], $valid_positions, true ) ) {
				$result->add_error( 'position', __( 'Invalid position value.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_value' );
			}
		}

		// Validate style.
		if ( isset( $config['style'] ) ) {
			$valid_styles = array( 'default', 'seamless' );
			if ( ! in_array( $config['style'], $valid_styles, true ) ) {
				$result->add_error( 'style', __( 'Invalid style value.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_value' );
			}
		}

		// Validate match_priority — Step 25 metabox priority ordering.
		// Must be an integer in the inclusive range 0-100. Higher values
		// load first when multiple field groups match the same screen.
		if ( isset( $config['match_priority'] ) ) {
			$priority = $config['match_priority'];
			if ( ! is_numeric( $priority ) || (int) $priority < 0 || (int) $priority > 100 ) {
				$result->add_error(
					'match_priority',
					__( 'Match priority must be a number between 0 and 100.', 'rox-dynamic-cpt-fields-engine' ),
					'invalid_value'
				);
			}
		}

		/**
		 * Filter the field group validation result.
		 *
		 * @since 1.0.0
		 *
		 * @param ValidationResult $result The validation result.
		 * @param array            $config The configuration being validated.
		 */
		return apply_filters( 'rdcfe_validate_field_group', $result, $config );
	}

	/**
	 * Validate a single field configuration.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param string               $path The path prefix for error messages.
	 * @return ValidationResult
	 */
	public function validate_field( array $field, string $path = 'field' ): ValidationResult {
		$result = new ValidationResult();

		// Skip validation for non-field object types (tabs, accordions, endpoints).
		$object_type = $field['object_type'] ?? 'field';
		if ( in_array( $object_type, array( 'tab', 'accordion', 'endpoint' ), true ) ) {
			// For layout elements, only label is required.
			if ( empty( $field['label'] ) ) {
				$result->add_error( "{$path}.label", __( 'Label is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
			}
			return $result;
		}

		// Required: name.
		if ( empty( $field['name'] ) ) {
			$result->add_error( "{$path}.name", __( 'Field name is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		} else {
			// Validate meta key format.
			$meta_key_rule = new MetaKeyRule();
			$result->merge( $meta_key_rule->validate( $field['name'], "{$path}.name" ) );
		}

		// Required: label.
		if ( empty( $field['label'] ) ) {
			$result->add_error( "{$path}.label", __( 'Field label is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		}

		// Required: type.
		if ( empty( $field['type'] ) ) {
			$result->add_error( "{$path}.type", __( 'Field type is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		} else {
			$valid_types = array(
				'text',
				'textarea',
				'number',
				'email',
				'url',
				'select',
				'multiselect',
				'checkbox',
				'radio',
				'toggle',
				'date',
				'datetime',
				'time',
				'wysiwyg',
				'color',
				'image',
				'file',
				'gallery',
				'relationship',
				'taxonomy',
				'user',
				'group',
				'repeater',
			);

			if ( ! in_array( $field['type'], $valid_types, true ) ) {
				$result->add_error(
					"{$path}.type",
					sprintf(
						/* translators: %s: field type */
						__( 'Unknown field type: %s', 'rox-dynamic-cpt-fields-engine' ),
						$field['type']
					),
					'unknown_field_type'
				);
			}
		}

		// Validate width if provided.
		if ( isset( $field['width'] ) ) {
			$valid_widths = array( 25, 50, 75, 100 );
			if ( ! in_array( (int) $field['width'], $valid_widths, true ) ) {
				$result->add_warning(
					"{$path}.width",
					__( 'Width should be 25, 50, 75, or 100.', 'rox-dynamic-cpt-fields-engine' ),
					'invalid_width'
				);
			}
		}

		// Validate choices for select/radio/checkbox. The React UI persists
		// items under `options`, while older configs and the PHP API may use
		// `choices`. Either is acceptable.
		if ( in_array( $field['type'] ?? '', array( 'select', 'multiselect', 'radio', 'checkbox' ), true ) ) {
			$source         = $field['options'] ?? $field['choices'] ?? null;
			$options_source = $field['options_source'] ?? 'manual';

			// When the items come from a dynamic source (e.g. query builder),
			// a static array is not required.
			if ( 'manual' === $options_source && ( empty( $source ) || ! is_array( $source ) ) ) {
				$result->add_error( "{$path}.options", __( 'Options are required for this field type.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
			}
		}

		// Validate nested fields for group/repeater.
		if ( in_array( $field['type'] ?? '', array( 'group', 'repeater' ), true ) ) {
			if ( isset( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
				foreach ( $field['sub_fields'] as $index => $sub_field ) {
					$sub_result = $this->validate_field( $sub_field, "{$path}.sub_fields.{$index}" );
					$result->merge( $sub_result );
				}
			}
		}

		return $result;
	}

	/**
	 * Validate any configuration type.
	 *
	 * @param string               $config_type The configuration type.
	 * @param array<string, mixed> $config The configuration to validate.
	 * @return ValidationResult
	 */
	public function validate( string $config_type, array $config ): ValidationResult {
		return match ( $config_type ) {
			'post_type'    => $this->validate_post_type( $config ),
			'taxonomy'     => $this->validate_taxonomy( $config ),
			'field_group'  => $this->validate_field_group( $config ),
			'options_page' => $this->validate_options_page( $config ),
			default        => $this->validate_generic( $config ),
		};
	}

	/**
	 * Validate an options page configuration.
	 *
	 * @param array<string, mixed> $config The configuration to validate.
	 * @return ValidationResult
	 */
	public function validate_options_page( array $config ): ValidationResult {
		$result = new ValidationResult();

		// Required: page_title.
		if ( empty( $config['page_title'] ) ) {
			$result->add_error( 'page_title', __( 'Page title is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		}

		// Required: menu_slug.
		if ( empty( $config['menu_slug'] ) ) {
			$result->add_error( 'menu_slug', __( 'Menu slug is required.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		} else {
			$slug_rule = new SlugRule();
			$result->merge( $slug_rule->validate( $config['menu_slug'], 'menu_slug' ) );
		}

		// Validate capability — accept any non-empty string so custom roles
		// (e.g. `manage_woocommerce`, `edit_users`) work alongside core caps.
		if ( isset( $config['capability'] ) ) {
			if ( ! is_string( $config['capability'] ) ) {
				$result->add_error( 'capability', __( 'Capability must be a string.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
			} elseif ( '' !== $config['capability'] && ! preg_match( '/^[a-z][a-z0-9_]*$/', $config['capability'] ) ) {
				$result->add_error( 'capability', __( 'Capability must start with a letter and contain only lowercase letters, numbers, and underscores.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_value' );
			}
		}

		// Validate boolean fields (autoload, redirect).
		$boolean_fields = array( 'autoload', 'redirect' );
		foreach ( $boolean_fields as $field ) {
			if ( isset( $config[ $field ] ) && ! is_bool( $config[ $field ] ) ) {
				$result->add_error(
					$field,
					sprintf(
						/* translators: %s: field name */
						__( '%s must be a boolean value.', 'rox-dynamic-cpt-fields-engine' ),
						$field
					),
					'invalid_type'
				);
			}
		}

		// Validate position if provided.
		if ( isset( $config['position'] ) && ! is_int( $config['position'] ) && ! is_numeric( $config['position'] ) ) {
			$result->add_error( 'position', __( 'Position must be an integer.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		// Validate storage mode (enum).
		if ( isset( $config['storage'] ) ) {
			if ( ! is_string( $config['storage'] ) ) {
				$result->add_error( 'storage', __( 'Storage mode must be a string.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
			} elseif ( ! in_array( $config['storage'], array( 'options', 'custom' ), true ) ) {
				$result->add_error( 'storage', __( 'Storage mode must be either "options" or "custom".', 'rox-dynamic-cpt-fields-engine' ), 'invalid_value' );
			}
		}

		// Custom storage requires a parseable identifier — `123`, `user_2`,
		// `term_5`, or `category_3`. Allowing the empty string here so the
		// frontend's "switch mode but haven't typed yet" state isn't
		// rejected mid-edit; the registrar falls back to the options table
		// when the identifier is empty.
		if ( ( $config['storage'] ?? '' ) === 'custom' && ! empty( $config['custom_storage'] ) ) {
			if ( ! is_string( $config['custom_storage'] ) ) {
				$result->add_error( 'custom_storage', __( 'Custom storage identifier must be a string.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
			} elseif ( ! preg_match( '/^(?:\d+|[a-z][a-z0-9_-]*[_:]\d+)$/i', $config['custom_storage'] ) ) {
				$result->add_error(
					'custom_storage',
					__( 'Custom storage must be a numeric ID or look like "user_2", "term_5", or "category_3".', 'rox-dynamic-cpt-fields-engine' ),
					'invalid_value'
				);
			}
		}

		// Validate parent_slug if provided (must be a non-empty string).
		if ( isset( $config['parent_slug'] ) && '' !== $config['parent_slug'] && ! is_string( $config['parent_slug'] ) ) {
			$result->add_error( 'parent_slug', __( 'Parent slug must be a string.', 'rox-dynamic-cpt-fields-engine' ), 'invalid_type' );
		}

		return $result;
	}

	/**
	 * Validate a generic configuration.
	 *
	 * @param array<string, mixed> $config The configuration to validate.
	 * @return ValidationResult
	 */
	private function validate_generic( array $config ): ValidationResult {
		$result = new ValidationResult();

		// Basic check: must have a slug or name.
		if ( empty( $config['slug'] ) && empty( $config['name'] ) ) {
			$result->add_error( 'slug', __( 'Configuration must have a slug or name.', 'rox-dynamic-cpt-fields-engine' ), 'required' );
		}

		return $result;
	}
}

