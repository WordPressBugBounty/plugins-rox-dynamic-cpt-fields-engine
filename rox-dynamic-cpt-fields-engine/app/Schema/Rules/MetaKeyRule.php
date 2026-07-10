<?php
/**
 * Meta Key Validation Rule
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Schema\Rules;

use RDCFE\Schema\ValidationResult;

/**
 * Class MetaKeyRule
 *
 * Validates meta key format and checks for conflicts with other plugins.
 */
class MetaKeyRule implements RuleInterface {

	/**
	 * Maximum meta key length.
	 */
	private const MAX_LENGTH = 255;

	/**
	 * Patterns that may conflict with other plugins.
	 *
	 * @var array<string, string>
	 */
	private const CONFLICT_PATTERNS = array(
		'/^_?field_/'     => 'another custom fields plugin',
		'/^_?acf_/'       => 'another custom fields plugin',
		'/^pods_/'        => 'Pods',
		'/^_?jet_/'       => 'another dynamic content plugin',
		'/^_?cmb2?_/'     => 'CMB2',
		'/^_?rwmb_/'      => 'Meta Box',
		'/^_?elementor_/' => 'Elementor',
		'/^_?yoast_/'     => 'Yoast SEO',
	);

	/**
	 * Validate a meta key value.
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
				__( 'Meta key must be a string.', 'rox-dynamic-cpt-fields-engine' ),
				'invalid_type'
			);
		}

		// Check length.
		if ( strlen( $value ) > self::MAX_LENGTH ) {
			$result->add_error(
				$path,
				sprintf(
					/* translators: %d: maximum length */
					__( 'Meta key must not exceed %d characters.', 'rox-dynamic-cpt-fields-engine' ),
					self::MAX_LENGTH
				),
				'meta_key_too_long'
			);
		}

		// Check for empty.
		if ( empty( $value ) ) {
			$result->add_error(
				$path,
				__( 'Meta key cannot be empty.', 'rox-dynamic-cpt-fields-engine' ),
				'meta_key_empty'
			);
			return $result;
		}

		// Check format (alphanumeric, underscores only).
		if ( ! preg_match( '/^[a-zA-Z_][a-zA-Z0-9_]*$/', $value ) ) {
			$result->add_error(
				$path,
				__( 'Meta key must start with a letter or underscore and contain only letters, numbers, and underscores.', 'rox-dynamic-cpt-fields-engine' ),
				'invalid_meta_key_format'
			);
		}

		// Check for potential conflicts with other plugins.
		foreach ( self::CONFLICT_PATTERNS as $pattern => $plugin_name ) {
			if ( preg_match( $pattern, $value ) ) {
				$result->add_warning(
					$path,
					sprintf(
						/* translators: 1: meta key, 2: plugin name */
						__( 'Meta key "%1$s" may conflict with %2$s. Consider using a different prefix.', 'rox-dynamic-cpt-fields-engine' ),
						$value,
						$plugin_name
					),
					'potential_conflict'
				);
				break;
			}
		}

		// Warn about leading underscore (makes it hidden in standard UI).
		if ( str_starts_with( $value, '_' ) && ! str_starts_with( $value, '_rdcfe_' ) ) {
			$result->add_warning(
				$path,
				__( 'Meta keys starting with underscore are hidden in the default Custom Fields UI. This is usually intentional for internal fields.', 'rox-dynamic-cpt-fields-engine' ),
				'hidden_meta_key'
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
		return 'meta_key';
	}

	/**
	 * Generate a safe meta key from a field name.
	 *
	 * @param string $name The field name.
	 * @param bool   $private Whether the key should be private (prefixed with underscore).
	 * @return string
	 */
	public static function generate_key( string $name, bool $private = false ): string {
		// Convert to lowercase.
		$key = strtolower( $name );

		// Replace spaces and hyphens with underscores.
		$key = preg_replace( '/[\s-]+/', '_', $key );

		// Remove non-alphanumeric characters except underscores.
		$key = preg_replace( '/[^a-z0-9_]/', '', $key );

		// Ensure it starts with a letter or underscore.
		if ( ! preg_match( '/^[a-z_]/', $key ) ) {
			$key = 'field_' . $key;
		}

		// Add dcfe prefix if not present.
		if ( ! str_starts_with( $key, 'rdcfe_' ) ) {
			$key = 'rdcfe_' . $key;
		}

		// Add private prefix if needed.
		if ( $private && ! str_starts_with( $key, '_' ) ) {
			$key = '_' . $key;
		}

		return $key;
	}
}

