<?php
/**
 * Options Page Storage
 *
 * Resolves where an options page persists its field values and provides
 * read/write helpers that abstract over the configured backend
 * (WordPress options table, post meta, user meta, or term meta).
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class OptionsPageStorage
 *
 * Centralized, storage-aware persistence layer for options pages.
 *
 * Storage modes:
 *  - `options` (default): stored in `wp_options` under `rdcfe_options_<slug>`.
 *  - `custom`:  stored in post/user/term meta. The custom storage string is
 *               parsed as `<type>_<id>` (e.g. `user_2`, `term_5`,
 *               `category_3`) — a bare numeric id is treated as a post id.
 *               The meta key follows the same `rdcfe_options_<slug>` shape.
 */
class OptionsPageStorage {

	/**
	 * Meta key / option name prefix.
	 *
	 * @var string
	 */
	public const KEY_PREFIX = 'rdcfe_options_';

	/**
	 * Storage modes recognised by the parser.
	 *
	 * @var array<string>
	 */
	public const SUPPORTED_TYPES = array( 'option', 'post', 'user', 'term' );

	/**
	 * Build the full option name / meta key for a given menu slug.
	 *
	 * @param string $menu_slug The options page menu slug.
	 * @return string
	 */
	public static function build_key( string $menu_slug ): string {
		return self::KEY_PREFIX . sanitize_key( $menu_slug );
	}

	/**
	 * Resolve a storage location from an options page configuration.
	 *
	 * @param array<string, mixed> $page_config The options page `data` array.
	 * @return array{type:string, id:int} Storage descriptor. `type=option`
	 *                                    implies `id=0`.
	 */
	public static function resolve( array $page_config ): array {
		$mode = $page_config['storage'] ?? 'options';

		if ( 'custom' !== $mode ) {
			return array(
				'type' => 'option',
				'id'   => 0,
			);
		}

		$raw = (string) ( $page_config['custom_storage'] ?? '' );
		$raw = trim( $raw );

		if ( '' === $raw ) {
			// Misconfigured custom storage falls back to the options table so
			// the page never silently drops user input.
			return array(
				'type' => 'option',
				'id'   => 0,
			);
		}

		return self::parse_location( $raw );
	}

	/**
	 * Parse a custom storage identifier into a typed descriptor.
	 *
	 * Accepted formats:
	 *  - `123`            → post meta on post 123
	 *  - `post_123`       → post meta on post 123
	 *  - `user_2`         → user meta on user 2
	 *  - `term_5`         → term meta on term 5
	 *  - `category_3`     → term meta on term 3 (taxonomy hint, ignored)
	 *  - any other prefix → treated as term meta on the trailing id
	 *
	 * @param string $raw The custom storage identifier.
	 * @return array{type:string, id:int}
	 */
	public static function parse_location( string $raw ): array {
		$raw = trim( $raw );

		if ( '' === $raw ) {
			return array(
				'type' => 'option',
				'id'   => 0,
			);
		}

		if ( ctype_digit( $raw ) ) {
			return array(
				'type' => 'post',
				'id'   => (int) $raw,
			);
		}

		if ( preg_match( '/^(?<type>[a-z][a-z0-9_-]*)[_:](?<id>\d+)$/i', $raw, $m ) ) {
			$type = strtolower( $m['type'] );
			$id   = (int) $m['id'];

			if ( 'post' === $type ) {
				return array(
					'type' => 'post',
					'id'   => $id,
				);
			}
			if ( 'user' === $type ) {
				return array(
					'type' => 'user',
					'id'   => $id,
				);
			}
			// Any other prefix (term, category, post_tag, etc.) is treated as
			// term meta — taxonomy is not part of the meta lookup.
			return array(
				'type' => 'term',
				'id'   => $id,
			);
		}

		// Unparseable input — fall back to the options table to avoid losing
		// data when a user types something we don't recognise.
		return array(
			'type' => 'option',
			'id'   => 0,
		);
	}

	/**
	 * Read the saved values for an options page.
	 *
	 * @param string               $menu_slug   The options page menu slug.
	 * @param array<string, mixed> $page_config The options page `data` array.
	 * @return array<string, mixed> The saved values (always an array).
	 */
	public static function read( string $menu_slug, array $page_config ): array {
		$location = self::resolve( $page_config );
		$key      = self::build_key( $menu_slug );

		$value = match ( $location['type'] ) {
			'post' => $location['id'] > 0 ? get_post_meta( $location['id'], $key, true ) : '',
			'user' => $location['id'] > 0 ? get_user_meta( $location['id'], $key, true ) : '',
			'term' => $location['id'] > 0 ? get_term_meta( $location['id'], $key, true ) : '',
			default => get_option( $key, array() ),
		};

		if ( ! is_array( $value ) ) {
			return array();
		}

		return $value;
	}

	/**
	 * Persist values for an options page.
	 *
	 * `autoload` is honored only when storing to the WordPress options table —
	 * post/user/term meta have no autoload concept.
	 *
	 * @param string               $menu_slug   The options page menu slug.
	 * @param array<string, mixed> $page_config The options page `data` array.
	 * @param array<string, mixed> $values      Sanitized values to save.
	 * @return bool True on success.
	 */
	public static function write( string $menu_slug, array $page_config, array $values ): bool {
		$location = self::resolve( $page_config );
		$key      = self::build_key( $menu_slug );

		switch ( $location['type'] ) {
			case 'post':
				if ( $location['id'] <= 0 ) {
					return false;
				}
				return false !== update_post_meta( $location['id'], $key, $values );

			case 'user':
				if ( $location['id'] <= 0 ) {
					return false;
				}
				return false !== update_user_meta( $location['id'], $key, $values );

			case 'term':
				if ( $location['id'] <= 0 ) {
					return false;
				}
				return false !== update_term_meta( $location['id'], $key, $values );

			case 'option':
			default:
				return self::write_option( $key, $values, (bool) ( $page_config['autoload'] ?? false ) );
		}
	}

	/**
	 * Write to the options table with the requested autoload behavior.
	 *
	 * Tries the modern `wp_set_option_autoload()` (WP 6.4+) first to flip the
	 * autoload flag for an existing option without rewriting its value. Falls
	 * back to a delete + add cycle on older WP versions.
	 *
	 * @param string               $key      The option name.
	 * @param array<string, mixed> $values   The values to save.
	 * @param bool                 $autoload Whether the option should autoload.
	 * @return bool True on success.
	 */
	private static function write_option( string $key, array $values, bool $autoload ): bool {
		$exists   = get_option( $key, '__rdcfe_missing__' );
		$autoload = $autoload ? 'yes' : 'no';

		if ( '__rdcfe_missing__' === $exists ) {
			// First-time write: use add_option() so we control the autoload
			// flag from the start (update_option without an existing row falls
			// through to add_option with autoload='auto' on modern WP).
			return add_option( $key, $values, '', $autoload );
		}

		$updated = update_option( $key, $values );

		// Bring the autoload flag in line with the configuration even when
		// the value didn't change. Available since WP 6.4.
		if ( function_exists( 'wp_set_option_autoload' ) ) {
			wp_set_option_autoload( $key, $autoload );
		}

		return $updated || $values === $exists;
	}

	/**
	 * Delete saved values for an options page.
	 *
	 * Useful when the storage backend is being changed and stale data needs
	 * to be removed from the previous backend.
	 *
	 * @param string               $menu_slug   The options page menu slug.
	 * @param array<string, mixed> $page_config The options page `data` array.
	 * @return bool True on success.
	 */
	public static function delete( string $menu_slug, array $page_config ): bool {
		$location = self::resolve( $page_config );
		$key      = self::build_key( $menu_slug );

		return match ( $location['type'] ) {
			'post' => $location['id'] > 0 ? (bool) delete_post_meta( $location['id'], $key ) : false,
			'user' => $location['id'] > 0 ? (bool) delete_user_meta( $location['id'], $key ) : false,
			'term' => $location['id'] > 0 ? (bool) delete_term_meta( $location['id'], $key ) : false,
			default => (bool) delete_option( $key ),
		};
	}
}
