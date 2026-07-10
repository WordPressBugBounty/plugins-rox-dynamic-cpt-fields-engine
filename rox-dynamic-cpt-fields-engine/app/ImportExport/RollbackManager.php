<?php
/**
 * Stores full export snapshots for Pro rollback flows.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\ImportExport;

use RDCFE\Config\ConfigRepository;
use WP_Error;

/**
 * Snapshot storage in a single autoloaded option.
 */
class RollbackManager {

	private const OPTION_KEY = 'rdcfe_import_snapshots';

	private const EXPORTABLE_TYPES = array( 'post_type', 'taxonomy', 'field_group', 'options_page' );

	/**
	 * Default and hard caps for retention count.
	 */
	private const RETENTION_DEFAULT = 5;
	private const RETENTION_MIN     = 1;
	private const RETENTION_MAX     = 50;

	/**
	 * Exporter instance.
	 *
	 * @var Exporter
	 */
	private Exporter $exporter;

	/**
	 * Repository instance.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $repository;

	/**
	 * Importer instance.
	 *
	 * @var Importer
	 */
	private Importer $importer;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->exporter   = new Exporter();
		$this->repository = new ConfigRepository();
		$this->importer   = new Importer();
	}

	/**
	 * Read option root with defaults.
	 *
	 * @return array{retention: int, snapshots: array<int, array<string, mixed>>}
	 */
	private function get_store(): array {
		$raw = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $raw ) ) {
			$raw = array();
		}

		$retention = isset( $raw['retention'] ) ? (int) $raw['retention'] : self::RETENTION_DEFAULT;
		$retention = max( self::RETENTION_MIN, min( self::RETENTION_MAX, $retention ) );

		$snaps = $raw['snapshots'] ?? array();
		$snaps = is_array( $snaps ) ? $snaps : array();

		return array(
			'retention'  => $retention,
			'snapshots'  => $snaps,
		);
	}

	/**
	 * Persist store.
	 *
	 * @param array{retention: int, snapshots: array<int, array<string, mixed>>} $store Data.
	 * @return void
	 */
	private function save_store( array $store ): void {
		update_option(
			self::OPTION_KEY,
			array(
				'retention'  => max( self::RETENTION_MIN, min( self::RETENTION_MAX, (int) $store['retention'] ) ),
				'snapshots'  => array_values( $store['snapshots'] ),
			),
			false
		);
	}

	/**
	 * Retention setting (number of snapshots to keep).
	 */
	public function get_retention(): int {
		return $this->get_store()['retention'];
	}

	/**
	 * Update retention (oldest snapshots are discarded when capped).
	 *
	 * @param int $count New limit.
	 * @return void
	 */
	public function set_retention( int $count ): void {
		$store             = $this->get_store();
		$store['retention'] = max( self::RETENTION_MIN, min( self::RETENTION_MAX, $count ) );
		$store['snapshots'] = array_slice( $store['snapshots'], 0, $store['retention'] );
		$this->save_store( $store );
	}

	/**
	 * Capture current site export into the snapshot list.
	 *
	 * @param string      $label    User-visible label.
	 * @param string|null $source   Optional source hint (filename, etc.).
	 * @return string Snapshot ID.
	 */
	public function push_snapshot( string $label, ?string $source = null ): string {
		$store = $this->get_store();

		$export = $this->exporter->export( array(), array() );

		$id = self::generate_id();

		$entry = array(
			'id'         => $id,
			'created_at' => current_time( 'c' ),
			'label'      => sanitize_text_field( $label ),
			'source'     => $source ? sanitize_text_field( $source ) : null,
			'summary'    => $export['summary'] ?? array(),
			'export'     => $export,
		);

		array_unshift( $store['snapshots'], $entry );
		$store['snapshots'] = array_slice( $store['snapshots'], 0, $store['retention'] );

		$this->save_store( $store );

		return $id;
	}

	/**
	 * List snapshot metadata (no embedded export).
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public function list_snapshots_meta(): array {
		$out = array();
		foreach ( $this->get_store()['snapshots'] as $snap ) {
			if ( ! is_array( $snap ) || empty( $snap['id'] ) ) {
				continue;
			}

			$out[] = array(
				'id'         => (string) $snap['id'],
				'created_at' => (string) ( $snap['created_at'] ?? '' ),
				'label'      => (string) ( $snap['label'] ?? '' ),
				'source'     => $snap['source'] ?? null,
				'summary'    => is_array( $snap['summary'] ?? null ) ? $snap['summary'] : array(),
			);
		}

		return $out;
	}

	/**
	 * Full snapshot including export blob.
	 *
	 * @param string $id Snapshot ID.
	 * @return array<string, mixed>|null
	 */
	public function get_snapshot( string $id ): ?array {
		$id = sanitize_text_field( $id );
		foreach ( $this->get_store()['snapshots'] as $snap ) {
			if ( ! is_array( $snap ) ) {
				continue;
			}

			if ( ( $snap['id'] ?? '' ) === $id ) {
				return $snap;
			}
		}

		return null;
	}

	/**
	 * Restore config state from snapshot (delete configs missing from snapshot, then import).
	 *
	 * @param string $id Snapshot ID.
	 * @return array<string, mixed>|WP_Error Result from importer or error.
	 */
	public function restore( string $id ): array|WP_Error {
		$snap = $this->get_snapshot( $id );

		if ( ! $snap || empty( $snap['export'] ) || ! is_array( $snap['export'] ) ) {
			return new WP_Error(
				'snapshot_not_found',
				__( 'Snapshot not found.', 'rox-dynamic-cpt-fields-engine' ),
				array( 'status' => 404 )
			);
		}

		$export = $snap['export'];
		$keys   = $this->snapshot_slug_index( $export );

		foreach ( self::EXPORTABLE_TYPES as $type ) {
			$keep = $keys[ $type ] ?? array();
			$all  = $this->repository->get_all( $type, 'all' );
			foreach ( $all as $row ) {
				$slug = (string) ( $row['slug'] ?? '' );
				if ( '' === $slug ) {
					continue;
				}

				if ( ! in_array( $slug, $keep, true ) ) {
					$del = $this->repository->delete( (int) $row['id'], true );
					if ( is_wp_error( $del ) ) {
						return $del;
					}
				}
			}
		}

		return $this->importer->import( $export, false );
	}

	/**
	 * Build slug index keyed by config type.
	 *
	 * @param array<string, mixed> $export Export root.
	 * @return array<string, array<int, string>>
	 */
	private function snapshot_slug_index( array $export ): array {
		$out   = array();
		$conf  = $export['configs'] ?? array();
		$conf  = is_array( $conf ) ? $conf : array();

		foreach ( self::EXPORTABLE_TYPES as $type ) {
			$out[ $type ] = array();
			if ( ! isset( $conf[ $type ] ) || ! is_array( $conf[ $type ] ) ) {
				continue;
			}

			foreach ( $conf[ $type ] as $item ) {
				if ( ! is_array( $item ) ) {
					continue;
				}

				$slug = (string) ( $item['slug'] ?? '' );
				if ( '' === $slug && is_array( $item['data'] ?? null ) ) {
					$slug = (string) ( $item['data']['slug'] ?? '' );
				}

				if ( '' !== $slug ) {
					$out[ $type ][] = $slug;
				}
			}
		}

		return $out;
	}

	/**
	 * Unique snapshot ID.
	 *
	 * @return string
	 */
	private static function generate_id(): string {
		if ( function_exists( 'wp_generate_uuid4' ) ) {
			return wp_generate_uuid4();
		}

		return 'rdcfe_' . str_replace( '.', '', uniqid( '', true ) );
	}
}
