<?php
/**
 * Slug Validation Rule
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Schema\Rules;

use RDCFE\Schema\ValidationResult;

/**
 * Class SlugRule
 *
 * Validates slug format and constraints.
 */
class SlugRule implements RuleInterface {

	/**
	 * Default maximum slug length (matches `register_post_type()`'s own cap).
	 */
	private const DEFAULT_MAX_LENGTH = 20;

	/**
	 * Minimum slug length.
	 */
	private const MIN_LENGTH = 1;

	/**
	 * Maximum slug length for this instance.
	 *
	 * @var int
	 */
	private int $max_length;

	/**
	 * Constructor.
	 *
	 * @param int $max_length Max length — pass 32 for taxonomy/options_page
	 *                        slugs (`register_taxonomy()`'s own cap; options
	 *                        pages have no WP-imposed limit so we match it).
	 */
	public function __construct( int $max_length = self::DEFAULT_MAX_LENGTH ) {
		$this->max_length = $max_length;
	}

	/**
	 * Validate a slug value.
	 *
	 * @param mixed               $value The value to validate.
	 * @param string              $path The path to the field being validated.
	 * @param array<string,mixed> $context Additional context for validation.
	 * @return ValidationResult
	 */
	public function validate( mixed $value, string $path, array $context = array() ): ValidationResult {
		$result = new ValidationResult();

		// Must be a string.
		if ( ! is_string( $value ) ) {
			return $result->add_error(
				$path,
				__( 'Slug must be a string.', 'rox-dynamic-cpt-fields-engine' ),
				'invalid_type'
			);
		}

		// Check length.
		$length = strlen( $value );

		if ( $length < self::MIN_LENGTH ) {
			$result->add_error(
				$path,
				__( 'Slug cannot be empty.', 'rox-dynamic-cpt-fields-engine' ),
				'slug_empty'
			);
		}

		if ( $length > $this->max_length ) {
			$result->add_error(
				$path,
				sprintf(
					/* translators: %d: maximum length */
					__( 'Slug must not exceed %d characters.', 'rox-dynamic-cpt-fields-engine' ),
					$this->max_length
				),
				'slug_too_long'
			);
		}

		// Check format (lowercase, alphanumeric, underscores, hyphens).
		if ( ! preg_match( '/^[a-z][a-z0-9_-]*$/', $value ) ) {
			$result->add_error(
				$path,
				__( 'Slug must start with a letter and contain only lowercase letters, numbers, underscores, and hyphens.', 'rox-dynamic-cpt-fields-engine' ),
				'invalid_slug_format'
			);
		}

		// Check for double underscores or hyphens.
		if ( preg_match( '/__|--/', $value ) ) {
			$result->add_warning(
				$path,
				__( 'Avoid consecutive underscores or hyphens in slugs.', 'rox-dynamic-cpt-fields-engine' ),
				'slug_format_warning'
			);
		}

		return $result;
	}

	/**
	 * Get the rule name.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return 'slug';
	}
}

