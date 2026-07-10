<?php
/**
 * Helpers for register_post_meta / register_term_meta.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Normalizes `show_in_rest` so WordPress accepts `type => array` meta in the REST API (WP 5.3+).
 */
final class MetaRegistration {

	/**
	 * Build a valid `show_in_rest` value for register_meta().
	 *
	 * @param mixed  $show_in_rest Field flag or custom REST args from field config.
	 * @param string $meta_type    WP meta `type`: string, boolean, integer, number, array, object.
	 * @return bool|array<string, mixed>
	 */
	public static function normalize_show_in_rest( mixed $show_in_rest, string $meta_type ): bool|array {
		if ( ! $show_in_rest ) {
			return false;
		}

		if ( 'array' !== $meta_type ) {
			return is_array( $show_in_rest ) ? $show_in_rest : true;
		}

		if ( is_array( $show_in_rest ) ) {
			if ( ! isset( $show_in_rest['schema'] ) || ! is_array( $show_in_rest['schema'] ) ) {
				$show_in_rest['schema'] = array();
			}
			if ( ! isset( $show_in_rest['schema']['items'] ) || ! is_array( $show_in_rest['schema']['items'] ) ) {
				$show_in_rest['schema']['type']  = 'array';
				$show_in_rest['schema']['items'] = array(
					'type' => 'string',
				);
			}
			return $show_in_rest;
		}

		return array(
			'schema' => array(
				'type'  => 'array',
				'items' => array(
					'type' => 'string',
				),
			),
		);
	}
}
