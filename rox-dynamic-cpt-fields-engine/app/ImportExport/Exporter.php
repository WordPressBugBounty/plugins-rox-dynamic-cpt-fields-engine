<?php
/**
 * Exporter Class
 *
 * Handles exporting configurations to JSON format.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\ImportExport;

use RDCFE\Config\ConfigRepository;
use RDCFE\Config\ConfigPostType;

/**
 * Class Exporter
 *
 * Exports plugin configurations to JSON format.
 */
class Exporter {

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $repository;

	/**
	 * Export format version.
	 */
	public const EXPORT_VERSION = '1.0.0';

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->repository = new ConfigRepository();
	}

	/**
	 * Export configurations.
	 *
	 * @param array<string> $types Config types to export (post_type, taxonomy, field_group, options_page).
	 * @param array<int>    $ids   Optional specific IDs to export. Empty means all of the selected types.
	 * @return array<string, mixed> The export data.
	 */
	public function export( array $types = array(), array $ids = array() ): array {
		// Default to all exportable types if none specified.
		$exportable_types = array( 'post_type', 'taxonomy', 'field_group', 'options_page' );

		if ( empty( $types ) ) {
			$types = $exportable_types;
		} else {
			// Filter to only valid types.
			$types = array_intersect( $types, $exportable_types );
		}

		$export_data = array(
			'version'     => self::EXPORT_VERSION,
			'plugin'      => 'rox-dynamic-cpt-fields-engine',
			'generated'   => current_time( 'c' ),
			'site_url'    => home_url(),
			'configs'     => array(),
		);

		foreach ( $types as $type ) {
			$configs = $this->get_configs_for_export( $type, $ids );
			
			if ( ! empty( $configs ) ) {
				$export_data['configs'][ $type ] = $configs;
			}
		}

		// Add summary.
		$export_data['summary'] = $this->generate_summary( $export_data['configs'] );

		/**
		 * Filter the export data before returning.
		 *
		 * @since 1.0.0
		 *
		 * @param array $export_data The export data.
		 * @param array $types       The config types being exported.
		 */
		return apply_filters( 'rdcfe_export_data', $export_data, $types );
	}

	/**
	 * Get configurations for export by type.
	 *
	 * @param string     $type The config type.
	 * @param array<int> $ids  Optional specific IDs to export.
	 * @return array<array<string, mixed>> Array of config data.
	 */
	private function get_configs_for_export( string $type, array $ids = array() ): array {
		$all_configs = $this->repository->get_all( $type, 'all' );
		$configs     = array();

		foreach ( $all_configs as $config ) {
			// If specific IDs provided, filter by them.
			if ( ! empty( $ids ) && ! in_array( $config['id'], $ids, true ) ) {
				continue;
			}

			// Format for export (remove internal IDs, keep portable data).
			$configs[] = $this->format_config_for_export( $config );
		}

		return $configs;
	}

	/**
	 * Format a single config for export.
	 *
	 * @param array<string, mixed> $config The config data.
	 * @return array<string, mixed> Formatted config for export.
	 */
	private function format_config_for_export( array $config ): array {
		return array(
			'title'          => $config['title'],
			'slug'           => $config['slug'],
			'status'         => $config['status'],
			'config_type'    => $config['config_type'],
			'data'           => $config['data'],
			'schema_version' => $config['schema_version'] ?? '1.0.0',
		);
	}

	/**
	 * Generate export summary.
	 *
	 * @param array<string, array<mixed>> $configs The configs grouped by type.
	 * @return array<string, int> Summary counts.
	 */
	private function generate_summary( array $configs ): array {
		$summary = array(
			'total'        => 0,
			'post_types'   => 0,
			'taxonomies'   => 0,
			'field_groups' => 0,
			'options_pages' => 0,
		);

		foreach ( $configs as $type => $items ) {
			$count = count( $items );
			$summary['total'] += $count;

			switch ( $type ) {
				case 'post_type':
					$summary['post_types'] = $count;
					break;
				case 'taxonomy':
					$summary['taxonomies'] = $count;
					break;
				case 'field_group':
					$summary['field_groups'] = $count;
					break;
				case 'options_page':
					$summary['options_pages'] = $count;
					break;
			}
		}

		return $summary;
	}

	/**
	 * Export to JSON string.
	 *
	 * @param array<string> $types Config types to export.
	 * @param array<int>    $ids   Optional specific IDs.
	 * @return string JSON string.
	 */
	public function export_to_json( array $types = array(), array $ids = array() ): string {
		$data = $this->export( $types, $ids );
		return wp_json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) ?: '{}';
	}

	/**
	 * Generate a filename for the export.
	 *
	 * @return string The filename.
	 */
	public function generate_filename(): string {
		$site_name = sanitize_title( get_bloginfo( 'name' ) );
		$date      = gmdate( 'Y-m-d-His' );
		
		return "rdcfe-export-{$site_name}-{$date}.json";
	}
}
