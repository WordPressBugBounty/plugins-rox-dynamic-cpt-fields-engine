<?php
/**
 * Import diff generator — compares incoming export JSON with the current database.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\ImportExport;

use RDCFE\Config\ConfigRepository;

/**
 * Produces structured new / unchanged / modified groups with field-level paths.
 */
class DiffGenerator {

	private const MAX_CHANGES_PER_ITEM = 120;

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $repository;

	/**
	 * Import validator instance.
	 *
	 * @var ImportValidator
	 */
	private ImportValidator $validator;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->repository = new ConfigRepository();
		$this->validator  = new ImportValidator();
	}

	/**
	 * Analyze import file against the current site.
	 *
	 * @param array<string, mixed> $import_data Valid export-shaped array.
	 * @return array<string, mixed>
	 */
	public function analyze( array $import_data ): array {
		$is_valid = $this->validator->validate( $import_data );

		$result = array(
			'success'    => $is_valid,
			'validation' => $this->validator->to_array(),
			'summary'    => array(
				'new'        => 0,
				'modified'   => 0,
				'unchanged'  => 0,
			),
			'items'      => array(),
		);

		if ( ! $is_valid ) {
			$result['message'] = __( 'Validation failed. Fix errors before reviewing the diff.', 'rox-dynamic-cpt-fields-engine' );
			return $result;
		}

		$valid_items = $this->validator->get_valid_items();
		$items_out   = array();

		foreach ( $valid_items as $type => $entries ) {
			foreach ( $entries as $item ) {
				$items_out[] = $this->analyze_item( $type, $item );
			}
		}

		$result['items'] = $items_out;

		foreach ( $items_out as $row ) {
			switch ( $row['status_category'] ) {
				case 'new':
					++$result['summary']['new'];
					break;
				case 'unchanged':
					++$result['summary']['unchanged'];
					break;
				case 'modified':
					++$result['summary']['modified'];
					break;
			}
		}

		$result['message'] = __( 'Diff ready.', 'rox-dynamic-cpt-fields-engine' );

		return $result;
	}

	/**
	 * Build one diff row.
	 *
	 * @param string               $type Config type.
	 * @param array<string, mixed> $item Export item.
	 * @return array<string, mixed>
	 */
	private function analyze_item( string $type, array $item ): array {
		$title  = (string) ( $item['title'] ?? '' );
		$slug   = (string) ( $item['slug'] ?? sanitize_title( $title ) );
		$status = (string) ( $item['status'] ?? 'publish' );
		$data   = $item['data'] ?? array();
		$data   = is_array( $data ) ? $data : array();

		$key = $type . '|' . $slug;

		$import_block = array(
			'title'  => $title,
			'status' => $status,
			'data'   => $data,
		);

		$existing = $this->repository->get_by_slug( $type, $slug );

		if ( ! $existing ) {
			return array(
				'key'             => $key,
				'type'            => $type,
				'slug'            => $slug,
				'title'           => $title,
				'import_title'    => $title,
				'status_category' => 'new',
				'existing_id'     => null,
				'change_count'    => 0,
				'changes'         => array(),
				'changes_total'   => 0,
				'changes_truncated' => false,
			);
		}

		$existing_block = array(
			'title'  => (string) $existing['title'],
			'status' => (string) $existing['status'],
			'data'   => is_array( $existing['data'] ?? null ) ? $existing['data'] : array(),
		);

		$changes = array();
		$this->diff_assoc( $existing_block, $import_block, '', $changes );

		$total    = count( $changes );
		$truncated = $total > self::MAX_CHANGES_PER_ITEM;
		$preview  = $truncated ? array_slice( $changes, 0, self::MAX_CHANGES_PER_ITEM ) : $changes;

		return array(
			'key'               => $key,
			'type'              => $type,
			'slug'              => $slug,
			'title'             => (string) $existing['title'],
			'import_title'      => $title,
			'status_category'   => $total > 0 ? 'modified' : 'unchanged',
			'existing_id'       => (int) $existing['id'],
			'change_count'      => $total,
			'changes'           => $preview,
			'changes_total'     => $total,
			'changes_truncated' => $truncated,
		);
	}

	/**
	 * Recursive association diff (paths use dot notation).
	 *
	 * @param array<string, mixed>   $before Before value.
	 * @param array<string, mixed>   $after  After value.
	 * @param string                 $path   Base path.
	 * @param array<int, array<string, mixed>> $out Collected changes.
	 * @return void
	 */
	private function diff_assoc( array $before, array $after, string $path, array &$out ): void {
		$keys = array_unique( array_merge( array_keys( $before ), array_keys( $after ) ) );

		foreach ( $keys as $k ) {
			$sub_path = '' === $path ? (string) $k : $path . '.' . $k;
			$b_has    = array_key_exists( $k, $before );
			$a_has    = array_key_exists( $k, $after );
			$b_val    = $b_has ? $before[ $k ] : null;
			$a_val    = $a_has ? $after[ $k ] : null;

			if ( ! $b_has ) {
				$out[] = array(
					'path'   => $sub_path,
					'before' => null,
					'after'  => $a_val,
				);
				continue;
			}

			if ( ! $a_has ) {
				$out[] = array(
					'path'   => $sub_path,
					'before' => $b_val,
					'after'  => null,
				);
				continue;
			}

			if ( is_array( $b_val ) && is_array( $a_val ) && $this->is_assoc_array( $b_val ) && $this->is_assoc_array( $a_val ) ) {
				$this->diff_assoc( $b_val, $a_val, $sub_path, $out );
				continue;
			}

			if ( $this->deep_equals( $b_val, $a_val ) ) {
				continue;
			}

			$out[] = array(
				'path'   => $sub_path,
				'before' => $b_val,
				'after'  => $a_val,
			);
		}
	}

	/**
	 * Whether array is associative (object-like).
	 *
	 * @param array<mixed> $arr Input.
	 * @return bool
	 */
	private function is_assoc_array( array $arr ): bool {
		if ( array() === $arr ) {
			return false;
		}

		return array_keys( $arr ) !== range( 0, count( $arr ) - 1 );
	}

	/**
	 * Loose deep equality for scalars and arrays (sequential arrays compared serialized).
	 *
	 * @param mixed $a First.
	 * @param mixed $b Second.
	 * @return bool
	 */
	private function deep_equals( mixed $a, mixed $b ): bool {
		if ( $a === $b ) {
			return true;
		}

		if ( is_array( $a ) && is_array( $b ) ) {
			return wp_json_encode( $a ) === wp_json_encode( $b );
		}

		return false;
	}
}
