<?php
/**
 * Reserved Words Validation Rule
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Schema\Rules;

use RDCFE\Schema\ValidationResult;

/**
 * Class ReservedWordsRule
 *
 * Validates that values don't use WordPress reserved words.
 */
class ReservedWordsRule implements RuleInterface {

	/**
	 * WordPress reserved post type slugs.
	 *
	 * @var array<string>
	 */
	private const RESERVED_POST_TYPES = array(
		'post',
		'page',
		'attachment',
		'revision',
		'nav_menu_item',
		'custom_css',
		'customize_changeset',
		'oembed_cache',
		'user_request',
		'wp_block',
		'wp_template',
		'wp_template_part',
		'wp_global_styles',
		'wp_navigation',
		'wp_font_family',
		'wp_font_face',
	);

	/**
	 * WordPress reserved taxonomy slugs.
	 *
	 * @var array<string>
	 */
	private const RESERVED_TAXONOMIES = array(
		'category',
		'post_tag',
		'nav_menu',
		'link_category',
		'post_format',
		'wp_theme',
		'wp_template_part_area',
		'wp_pattern_category',
	);

	/**
	 * WordPress reserved query vars / rewrite slugs.
	 *
	 * @var array<string>
	 */
	private const RESERVED_SLUGS = array(
		'action',
		'attachment',
		'attachment_id',
		'author',
		'author_name',
		'calendar',
		'cat',
		'category',
		'category_name',
		'cpage',
		'day',
		'debug',
		'embed',
		'error',
		'exact',
		'feed',
		'hour',
		'link_category',
		'm',
		'minute',
		'monthnum',
		'more',
		'name',
		'nav_menu',
		'nonce',
		'nopaging',
		'offset',
		'order',
		'orderby',
		'p',
		'page',
		'page_id',
		'paged',
		'pagename',
		'pb',
		'perm',
		'post',
		'post_format',
		'post_mime_type',
		'post_status',
		'post_tag',
		'post_type',
		'posts',
		'posts_per_archive_page',
		'posts_per_page',
		'preview',
		'robots',
		's',
		'search',
		'second',
		'sentence',
		'showposts',
		'static',
		'status',
		'subpost',
		'subpost_id',
		'tag',
		'tag_id',
		'tag_slug__and',
		'tag_slug__in',
		'taxonomy',
		'tb',
		'term',
		'terms',
		'theme',
		'title',
		'type',
		'types',
		'w',
		'withcomments',
		'withoutcomments',
		'year',
	);

	/**
	 * The type of slug being validated.
	 *
	 * @var string
	 */
	private string $slug_type;

	/**
	 * Constructor.
	 *
	 * @param string $slug_type The type of slug (post_type, taxonomy, general).
	 */
	public function __construct( string $slug_type = 'general' ) {
		$this->slug_type = $slug_type;
	}

	/**
	 * Validate a value against reserved words.
	 *
	 * @param mixed               $value The value to validate.
	 * @param string              $path The path to the field being validated.
	 * @param array<string,mixed> $context Additional context for validation.
	 * @return ValidationResult
	 */
	public function validate( mixed $value, string $path, array $context = array() ): ValidationResult {
		$result = new ValidationResult();

		if ( ! is_string( $value ) ) {
			return $result;
		}

		$value = strtolower( $value );

		// Check against appropriate reserved list.
		$reserved_list = $this->get_reserved_list();

		if ( in_array( $value, $reserved_list, true ) ) {
			$result->add_error(
				$path,
				sprintf(
					/* translators: %s: the reserved word */
					__( '"%s" is a reserved word and cannot be used.', 'rox-dynamic-cpt-fields-engine' ),
					$value
				),
				'reserved_word'
			);
		}

		// Check against general reserved slugs for warnings.
		if ( 'general' !== $this->slug_type && in_array( $value, self::RESERVED_SLUGS, true ) ) {
			$result->add_warning(
				$path,
				sprintf(
					/* translators: %s: the slug */
					__( '"%s" may conflict with WordPress query variables. Consider using a different slug.', 'rox-dynamic-cpt-fields-engine' ),
					$value
				),
				'potential_conflict'
			);
		}

		// Check if it starts with 'wp_' prefix.
		if ( str_starts_with( $value, 'wp_' ) ) {
			$result->add_warning(
				$path,
				__( 'Slugs starting with "wp_" are reserved for WordPress core. Consider using a different prefix.', 'rox-dynamic-cpt-fields-engine' ),
				'wp_prefix_warning'
			);
		}

		return $result;
	}

	/**
	 * Get the reserved word list based on slug type.
	 *
	 * @return array<string>
	 */
	private function get_reserved_list(): array {
		return match ( $this->slug_type ) {
			'post_type' => self::RESERVED_POST_TYPES,
			'taxonomy'  => self::RESERVED_TAXONOMIES,
			default     => array_unique( array_merge( self::RESERVED_POST_TYPES, self::RESERVED_TAXONOMIES, self::RESERVED_SLUGS ) ),
		};
	}

	/**
	 * Get the rule name.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return 'reserved_words';
	}

	/**
	 * Get all reserved post types.
	 *
	 * @return array<string>
	 */
	public static function get_reserved_post_types(): array {
		return self::RESERVED_POST_TYPES;
	}

	/**
	 * Get all reserved taxonomies.
	 *
	 * @return array<string>
	 */
	public static function get_reserved_taxonomies(): array {
		return self::RESERVED_TAXONOMIES;
	}
}

