<?php
/**
 * Applies per-item resolutions (overwrite / skip / rename) to import payloads.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\ImportExport;

use RDCFE\Config\ConfigRepository;
use WP_Error;

/**
 * Mutates export JSON before it is passed to {@see Importer::import()}.
 */
class ConflictResolver {

	/**
	 * Apply user resolutions.
	 *
	 * @param array<string, mixed> $import_data  Full export file.
	 * @param array<string, mixed> $resolutions Map of "type|slug" => [ action => overwrite|skip|rename, new_slug? => string ].
	 * @return array<string, mixed>|WP_Error
	 */
	public static function apply( array $import_data, array $resolutions ): array|WP_Error {
		$out      = $import_data;
		$configs  = $out['configs'] ?? array();

		if ( ! is_array( $configs ) ) {
			return new WP_Error(
				'invalid_configs',
				__( 'Import data is missing configs.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 400 )
			);
		}

		$repository = new ConfigRepository();

		foreach ( $resolutions as $composite_key => $payload ) {
			if ( ! is_string( $composite_key ) || ! is_array( $payload ) ) {
				continue;
			}

			$parts = explode( '|', $composite_key, 2 );
			if ( count( $parts ) !== 2 ) {
				continue;
			}

			$type = $parts[0];
			$slug = $parts[1];
			$act  = isset( $payload['action'] ) ? (string) $payload['action'] : 'overwrite';

			if ( ! isset( $configs[ $type ] ) || ! is_array( $configs[ $type ] ) ) {
				continue;
			}

			$idx = self::find_item_index( $configs[ $type ], $slug );
			if ( null === $idx ) {
				continue;
			}

			switch ( $act ) {
				case 'skip':
				case 'keep':
					array_splice( $configs[ $type ], $idx, 1 );
					if ( array() === $configs[ $type ] ) {
						unset( $configs[ $type ] );
					}
					break;

				case 'rename':
					$new_slug = isset( $payload['new_slug'] ) ? sanitize_title( (string) $payload['new_slug'] ) : '';
					if ( '' === $new_slug || ! preg_match( '/^[a-z0-9_-]+$/', $new_slug ) ) {
						return new WP_Error(
							'invalid_rename_slug',
							__( 'Rename requires a valid slug (lowercase letters, numbers, hyphens, underscores).', 'rox-dynamic-cpt-fields-engine' ),
							array( 'status' => 400 )
						);
					}

					if ( $repository->slug_exists( $type, $new_slug ) ) {
						return new WP_Error(
							'rename_slug_collision',
							sprintf(
								/* translators: %s: slug */
								__( 'Cannot rename import: slug "%s" is already in use.', 'rox-dynamic-cpt-fields-engine' ),
								$new_slug
							),
							array( 'status' => 409 )
						);
					}

					if ( self::slug_used_in_import( $configs, $type, $new_slug, $slug ) ) {
						return new WP_Error(
							'import_slug_collision',
							__( 'The new slug conflicts with another row in this import file.', 'rox-dynamic-cpt-fields-engine' ),
							array( 'status' => 409 )
						);
					}

					$item = $configs[ $type ][ $idx ];
					$item['slug']               = $new_slug;
					$item['data']               = is_array( $item['data'] ?? null ) ? $item['data'] : array();
					$item['data']['slug']       = $new_slug;
					$configs[ $type ][ $idx ] = $item;
					break;

				case 'overwrite':
				default:
					break;
			}
		}

		$out['configs'] = $configs;

		/**
		 * Filter import payload after resolutions are applied.
		 *
		 * @param array<string, mixed> $out         Import data.
		 * @param array<string, mixed> $resolutions Resolutions map.
		 */
		return apply_filters( 'rdcfe_import_after_resolutions', $out, $resolutions );
	}

	/**
	 * Index of item matching slug.
	 *
	 * @param array<int, array<string, mixed>> $items Items.
	 * @param string                           $slug  Slug.
	 * @return int|null
	 */
	private static function find_item_index( array $items, string $slug ): ?int {
		foreach ( $items as $i => $item ) {
			$s = $item['slug'] ?? '';
			if ( (string) $s === $slug ) {
				return (int) $i;
			}

			$data_slug = is_array( $item['data'] ?? null ) ? ( $item['data']['slug'] ?? '' ) : '';
			if ( (string) $data_slug === $slug ) {
				return (int) $i;
			}
		}

		return null;
	}

	/**
	 * Whether another import row already uses this slug for the type.
	 *
	 * @param array<string, mixed> $configs      Config bucket.
	 * @param string               $type         Type.
	 * @param string               $candidate    Candidate slug.
	 * @param string               $original_row Original slug being renamed.
	 * @return bool
	 */
	private static function slug_used_in_import( array $configs, string $type, string $candidate, string $original_row ): bool {
		if ( ! isset( $configs[ $type ] ) || ! is_array( $configs[ $type ] ) ) {
			return false;
		}

		foreach ( $configs[ $type ] as $item ) {
			$s = (string) ( $item['slug'] ?? '' );
			if ( '' === $s && is_array( $item['data'] ?? null ) ) {
				$s = (string) ( $item['data']['slug'] ?? '' );
			}

			if ( $s === $original_row ) {
				continue;
			}

			if ( $s === $candidate ) {
				return true;
			}
		}

		return false;
	}
}
