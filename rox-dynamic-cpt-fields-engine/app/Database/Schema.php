<?php
/**
 * Database Schema Definitions
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Database;

/**
 * Class Schema
 *
 * Defines the database table schemas for the plugin.
 */
class Schema {

	/**
	 * Get the relations table name.
	 *
	 * @return string
	 */
	public static function get_relations_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'rdcfe_relations';
	}

	/**
	 * Get the snapshots table name.
	 *
	 * @return string
	 */
	public static function get_snapshots_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'rdcfe_snapshots';
	}

	/**
	 * Get the migrations table name.
	 *
	 * @return string
	 */
	public static function get_migrations_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'rdcfe_migrations';
	}

	/**
	 * Get charset collate.
	 *
	 * @return string
	 */
	public static function get_charset_collate(): string {
		global $wpdb;
		return $wpdb->get_charset_collate();
	}

	/**
	 * Get the SQL for creating the relations table.
	 *
	 * @return string
	 */
	public static function get_relations_schema(): string {
		$table_name      = self::get_relations_table();
		$charset_collate = self::get_charset_collate();

		// `unique_relation` is enforced as a UNIQUE INDEX so the
		// `RelationManager::attach()` upsert pipeline can rely on the
		// database to reject duplicate triples atomically — preventing
		// race conditions on concurrent REST writes without an extra
		// SELECT round-trip.
		//
		// `dbDelta()` registers the column list on first install. The
		// UNIQUE INDEX is added by the post-migration step in
		// `Migrator::ensure_relations_unique_index()` because dbDelta
		// has historical issues parsing UNIQUE KEY clauses inside
		// CREATE TABLE on some MySQL/MariaDB versions.
		//
		// Multi-object support: `parent_kind` / `child_kind` classify
		// each side as `post`, `term`, or `user` so the same table can
		// store post↔post, post↔term, post↔user, term↔term, term↔user,
		// and user↔user pairs without a discriminator junk column.
		// The `parent_type` / `child_type` columns are kept for
		// the slug **within** that kind (post type for posts, taxonomy
		// for terms, role for users — empty when "any role"). Existing
		// rows back-fill to `post` via the upgrade migration.
		//
		// The UNIQUE INDEX therefore now spans the kind columns too:
		// `(relation_id, parent_kind, parent_id, child_kind, child_id)`
		// — `Migrator::ensure_relations_unique_index()` migrates a
		// narrow legacy index to the wider one in place.
		//
		// `meta` holds per-pair custom field values as a JSON object
		// keyed by the relation definition's `meta_fields[].key`. The
		// column is LONGTEXT (rather than the MySQL 5.7+ `JSON` type)
		// for broad host compatibility — we serialise / deserialise
		// in PHP. Empty pairs leave the column NULL so existing rows
		// don't pay for unused storage.
		return "CREATE TABLE {$table_name} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			relation_id varchar(64) NOT NULL,
			parent_kind varchar(8) NOT NULL DEFAULT 'post',
			parent_type varchar(64) NOT NULL,
			parent_id bigint(20) unsigned NOT NULL,
			child_kind varchar(8) NOT NULL DEFAULT 'post',
			child_type varchar(64) NOT NULL,
			child_id bigint(20) unsigned NOT NULL,
			rel_order int(11) NOT NULL DEFAULT 0,
			meta longtext DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY relation_parent (relation_id, parent_kind, parent_id),
			KEY relation_child (relation_id, child_kind, child_id),
			KEY relation_types (relation_id, parent_kind, parent_type, child_kind, child_type)
		) {$charset_collate};";
	}

	/**
	 * Get the SQL for creating the snapshots table.
	 *
	 * @return string
	 */
	public static function get_snapshots_schema(): string {
		$table_name      = self::get_snapshots_table();
		$charset_collate = self::get_charset_collate();

		return "CREATE TABLE {$table_name} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			snapshot_type varchar(32) NOT NULL,
			snapshot_data longtext NOT NULL,
			trigger_action varchar(128) NOT NULL,
			user_id bigint(20) unsigned NOT NULL,
			is_manual tinyint(1) NOT NULL DEFAULT 0,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY snapshot_type (snapshot_type),
			KEY user_id (user_id),
			KEY created_at (created_at)
		) {$charset_collate};";
	}

	/**
	 * Get the SQL for creating the migrations table.
	 *
	 * @return string
	 */
	public static function get_migrations_schema(): string {
		$table_name      = self::get_migrations_table();
		$charset_collate = self::get_charset_collate();

		return "CREATE TABLE {$table_name} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			version varchar(16) NOT NULL,
			migration varchar(128) NOT NULL,
			batch int(11) NOT NULL,
			executed_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY migration (migration),
			KEY version (version),
			KEY batch (batch)
		) {$charset_collate};";
	}

	/**
	 * Get all table schemas.
	 *
	 * @return array<string, string> Array of table name => SQL schema.
	 */
	public static function get_all_schemas(): array {
		return array(
			self::get_relations_table()  => self::get_relations_schema(),
			self::get_snapshots_table()  => self::get_snapshots_schema(),
			self::get_migrations_table() => self::get_migrations_schema(),
		);
	}

	/**
	 * Get all table names.
	 *
	 * @return array<string>
	 */
	public static function get_all_tables(): array {
		return array(
			self::get_relations_table(),
			self::get_snapshots_table(),
			self::get_migrations_table(),
		);
	}
}

