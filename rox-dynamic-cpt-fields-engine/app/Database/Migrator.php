<?php
/**
 * Database Migrator
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Database;

/**
 * Class Migrator
 *
 * Handles database migrations for the plugin.
 */
class Migrator {

	/**
	 * Current database version.
	 *
	 * 1.0.0 — Initial three-table schema (relations, snapshots, migrations).
	 * 1.1.0 — relations table gains a UNIQUE INDEX on
	 *         (relation_id, parent_id, child_id) so `RelationManager::attach()`
	 *         can use a single upsert without a SELECT round-trip.
	 * 1.2.0 — relations table gains `parent_kind` + `child_kind`
	 *         columns so a single table can store post↔post, post↔term,
	 *         post↔user, term↔term, term↔user, and user↔user pairs.
	 *         The narrow `unique_relation` index is dropped and replaced
	 *         with `(relation_id, parent_kind, parent_id, child_kind,
	 *         child_id)`. Existing rows back-fill to `kind = post`.
	 * 1.3.0 — relations table gains a nullable `meta longtext` column
	 *         that stores per-pair custom field values as a JSON
	 *         object. The relation definition declares the schema
	 *         (`meta_fields`); pairs only carry values for keys their
	 *         definition allows. Empty meta stays NULL.
	 */
	public const DB_VERSION = '1.3.0';

	/**
	 * Option name for storing database version.
	 */
	private const DB_VERSION_OPTION = 'rdcfe_db_version';

	/**
	 * Run all pending migrations.
	 *
	 * @return bool True if migrations ran successfully.
	 */
	public function run(): bool {
		$installed_version = get_option( self::DB_VERSION_OPTION, '0.0.0' );

		// No migrations needed if version matches.
		if ( version_compare( $installed_version, self::DB_VERSION, '>=' ) ) {
			return true;
		}

		// Create / patch tables.
		$result = $this->create_tables();

		// (1.2.0): add `parent_kind` / `child_kind` columns
		// before the unique-index step so the wider index includes them.
		// Idempotent — `INFORMATION_SCHEMA.COLUMNS` is consulted first.
		// Order matters: this MUST run before
		// `ensure_relations_unique_index()` because that helper now
		// expects the kind columns to exist when (re)building the index.
		$this->ensure_relations_object_kinds();

		// (1.1.0) → (1.2.0): ensure the relations table has the wider
		// UNIQUE INDEX. Idempotent — drops a narrow legacy index in
		// place and rebuilds. Safe on installs that already shipped
		// the wider index.
		$this->ensure_relations_unique_index();

		// (1.3.0): add the nullable `meta` column for per-pair custom
		// field values. Idempotent — short-circuits when the column
		// already exists.
		$this->ensure_relations_meta_column();

		if ( $result ) {
			// Update database version.
			update_option( self::DB_VERSION_OPTION, self::DB_VERSION );

			// Record initial schema migration once (older installs).
			if ( ! $this->has_migration_run( 'initial_schema' ) ) {
				$this->record_migration( '1.0.0', 'initial_schema' );
			}

			// Record the 1.1.0 unique-index migration so the migrations
			// log mirrors what actually executed.
			if ( ! $this->has_migration_run( 'relations_unique_index' ) ) {
				$this->record_migration( '1.1.0', 'relations_unique_index' );
			}

			// Track the multi-object kinds rollout so we can reason
			// about which sites already migrated when adding future
			// columns to the relations table.
			if ( ! $this->has_migration_run( 'relations_object_kinds' ) ) {
				$this->record_migration( '1.2.0', 'relations_object_kinds' );
			}

			// Track the per-pair meta column rollout. Future schema
			// bumps that touch the same column can assert this
			// migration ran first instead of probing the live table.
			if ( ! $this->has_migration_run( 'relations_pair_meta' ) ) {
				$this->record_migration( '1.3.0', 'relations_pair_meta' );
			}

			/**
			 * Fires after database migrations have been run.
			 *
			 * @since 1.0.0
			 *
			 * @param string $from_version Previous database version.
			 * @param string $to_version New database version.
			 * @param bool   $result Whether the migration succeeded.
			 */
			do_action( 'rdcfe_after_schema_migration', $installed_version, self::DB_VERSION, $result );
		}

		return $result;
	}

	/**
	 * Add the wide UNIQUE INDEX `unique_relation` to the relations table.
	 *
	 *  the index now spans `(relation_id, parent_kind,
	 * parent_id, child_kind, child_id)` so post↔term and post↔user
	 * pairs sharing a numeric id with a post↔post pair don't trigger
	 * a false-positive duplicate. The helper is idempotent in three
	 * scenarios:
	 *
	 *   1. Fresh install — index doesn't exist; we add the wide one.
	 *   2. Site upgrading from 1.1.0 — narrow `(relation_id, parent_id,
	 *      child_id)` index exists; we DROP and rebuild as wide.
	 *   3. Site already on 1.2.0 — wide index exists and matches; we
	 *      no-op.
	 *
	 * `INFORMATION_SCHEMA.STATISTICS` is consulted first so we never
	 * throw "duplicate key name" when the index is already shaped
	 * correctly.
	 *
	 * @return bool
	 */
	public function ensure_relations_unique_index(): bool {
		global $wpdb;

		$table_name = Schema::get_relations_table();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Trusted internal table name; checking presence before ALTER.
		$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" );
		if ( $table_exists !== $table_name ) {
			return false;
		}

		// Pull the column list of the existing `unique_relation` index
		// (if any) so we can decide whether to keep, replace, or create
		// it. `SEQ_IN_INDEX` orders the columns; `GROUP_CONCAT` collapses
		// them into a single comparable string.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reading information_schema for index detection.
		$current_columns = (string) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) FROM information_schema.STATISTICS
					WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND INDEX_NAME = %s",
				DB_NAME,
				$table_name,
				'unique_relation'
			)
		);

		$wide_columns = 'relation_id,parent_kind,parent_id,child_kind,child_id';

		if ( $current_columns === $wide_columns ) {
			// Already shaped correctly — nothing to do.
			return true;
		}

		if ( '' !== $current_columns ) {
			// Drop the narrow / mismatched index in place. We don't try
			// to be clever about partial overlaps — the column set is
			// either exactly right or we rebuild it.
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, PluginCheck.Security.DirectDB.UnescapedDBParameter -- ALTER on plugin-owned table.
			$dropped = $wpdb->query( "ALTER TABLE {$table_name} DROP INDEX unique_relation" );
			if ( false === $dropped && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( 'DCFE: Failed to drop legacy unique_relation index on ' . $table_name );
				return false;
			}
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, PluginCheck.Security.DirectDB.UnescapedDBParameter -- ALTER on plugin-owned table.
		$result = $wpdb->query(
			"ALTER TABLE {$table_name} ADD UNIQUE INDEX unique_relation (relation_id, parent_kind, parent_id, child_kind, child_id)"
		);

		if ( false === $result && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( 'DCFE: Failed to add wide unique_relation index on ' . $table_name );
		}

		return false !== $result;
	}

	/**
	 *  add the `parent_kind` and `child_kind` columns to the
	 * relations table on existing installs.
	 *
	 * Both columns default to `'post'` so existing rows back-fill to the
	 * pre-32.1 semantics (post↔post pairs) without requiring a data
	 * migration. The helper is idempotent — it consults
	 * `INFORMATION_SCHEMA.COLUMNS` and only ALTERs the missing columns.
	 *
	 * Returns `true` when both columns exist after the run (whether
	 * pre-existing or freshly added), `false` if the table itself is
	 * missing or any ALTER failed.
	 *
	 * @return bool
	 */
	public function ensure_relations_object_kinds(): bool {
		global $wpdb;

		$table_name = Schema::get_relations_table();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Trusted internal table name; checking presence before ALTER.
		$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" );
		if ( $table_exists !== $table_name ) {
			return false;
		}

		// `parent_kind` lives between `relation_id` and `parent_type`
		// so post-32.1 SELECT * results read `relation_id, parent_kind,
		// parent_type, parent_id, child_kind, child_type, child_id, …`.
		// `child_kind` mirrors that ordering for the child side.
		$columns = array(
			'parent_kind' => "ALTER TABLE {$table_name} ADD COLUMN parent_kind varchar(8) NOT NULL DEFAULT 'post' AFTER relation_id",
			'child_kind'  => "ALTER TABLE {$table_name} ADD COLUMN child_kind varchar(8) NOT NULL DEFAULT 'post' AFTER parent_id",
		);

		foreach ( $columns as $column => $alter ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reading information_schema for column detection.
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					'SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s',
					DB_NAME,
					$table_name,
					$column
				)
			);

			if ( (int) $exists > 0 ) {
				continue;
			}

			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- ALTER on plugin-owned table; statement built from internal whitelist.
			$result = $wpdb->query( $alter );
			if ( false === $result ) {
				if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
					error_log( "DCFE: Failed to add column {$column} on {$table_name}" );
				}
				return false;
			}
		}

		return true;
	}

	/**
	 * Add the nullable `meta` column to the relations table on existing
	 * installs.
	 *
	 * The column stores per-pair custom field values as a JSON object
	 * keyed by the relation definition's `meta_fields[].key`. The
	 * column is LONGTEXT (rather than the MySQL 5.7+ native `JSON`
	 * type) for broad host compatibility — values are encoded /
	 * decoded in PHP. The default is NULL so legacy rows pay nothing
	 * for the new column until they actually carry meta values.
	 *
	 * Idempotent — consults `INFORMATION_SCHEMA.COLUMNS` first and
	 * short-circuits when the column already exists.
	 *
	 * @return bool
	 */
	public function ensure_relations_meta_column(): bool {
		global $wpdb;

		$table_name = Schema::get_relations_table();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Trusted internal table name; checking presence before ALTER.
		$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" );
		if ( $table_exists !== $table_name ) {
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reading information_schema for column detection.
		$exists = $wpdb->get_var(
			$wpdb->prepare(
				'SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s',
				DB_NAME,
				$table_name,
				'meta'
			)
		);

		if ( (int) $exists > 0 ) {
			return true;
		}

		// Place `meta` after `rel_order` so SELECT * lists keep all the
		// hot columns clustered before payload data.
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, PluginCheck.Security.DirectDB.UnescapedDBParameter -- ALTER on plugin-owned table.
		$result = $wpdb->query(
			"ALTER TABLE {$table_name} ADD COLUMN meta longtext DEFAULT NULL AFTER rel_order"
		);

		if ( false === $result && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( 'DCFE: Failed to add `meta` column on ' . $table_name );
		}

		return false !== $result;
	}

	/**
	 * Create database tables.
	 *
	 * @return bool True if tables were created successfully.
	 */
	public function create_tables(): bool {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$schemas = Schema::get_all_schemas();
		$errors  = array();

		foreach ( $schemas as $table_name => $sql ) {
			dbDelta( $sql );

			// Check if table exists.
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checking if migration table exists.
			$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" );

			if ( $table_exists !== $table_name ) {
				$errors[] = $table_name;

				// Log error.
				if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
					error_log( sprintf( 'DCFE: Failed to create table %s', $table_name ) );
				}
			}
		}

		return empty( $errors );
	}

	/**
	 * Drop all plugin tables.
	 *
	 * @return bool True if tables were dropped successfully.
	 */
	public function drop_tables(): bool {
		global $wpdb;

		$tables = Schema::get_all_tables();

		foreach ( $tables as $table_name ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Dropping plugin tables on uninstall.
			$wpdb->query( "DROP TABLE IF EXISTS {$table_name}" );
		}

		// Remove version option.
		delete_option( self::DB_VERSION_OPTION );

		return true;
	}

	/**
	 * Record a migration in the migrations table.
	 *
	 * @param string $version Migration version.
	 * @param string $migration Migration name.
	 * @return bool
	 */
	private function record_migration( string $version, string $migration ): bool {
		global $wpdb;

		$table_name = Schema::get_migrations_table();

		// Check if table exists first.
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checking if migrations table exists.
		$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" );

		if ( $table_exists !== $table_name ) {
			return false;
		}

		// Get current batch number.
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Getting batch number from migrations table.
		$batch = (int) $wpdb->get_var( "SELECT MAX(batch) FROM {$table_name}" );
		$batch = $batch + 1;

		// Insert migration record.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Inserting migration record.
		$result = $wpdb->insert(
			$table_name,
			array(
				'version'     => $version,
				'migration'   => $migration,
				'batch'       => $batch,
				'executed_at' => current_time( 'mysql' ),
			),
			array( '%s', '%s', '%d', '%s' )
		);

		return false !== $result;
	}

	/**
	 * Check if a migration has been run.
	 *
	 * @param string $migration Migration name.
	 * @return bool
	 */
	public function has_migration_run( string $migration ): bool {
		global $wpdb;

		$table_name = Schema::get_migrations_table();

		// Check if table exists first.
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checking if migrations table exists.
		$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" );

		if ( $table_exists !== $table_name ) {
			return false;
		}

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checking migration status in migrations table, table name from trusted source.
		$result = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table_name} WHERE migration = %s",
				$migration
			)
		);
		// phpcs:enable

		return (int) $result > 0;
	}

	/**
	 * Get all run migrations.
	 *
	 * @return array<object>
	 */
	public function get_migrations(): array {
		global $wpdb;

		$table_name = Schema::get_migrations_table();

		// Check if table exists first.
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checking if migrations table exists.
		$table_exists = $wpdb->get_var( "SHOW TABLES LIKE '{$table_name}'" );

		if ( $table_exists !== $table_name ) {
			return array();
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Retrieving migrations from migrations table.
		return $wpdb->get_results( "SELECT * FROM {$table_name} ORDER BY id ASC" );
	}

	/**
	 * Check if database needs migration.
	 *
	 * @return bool
	 */
	public function needs_migration(): bool {
		$installed_version = get_option( self::DB_VERSION_OPTION, '0.0.0' );
		return version_compare( $installed_version, self::DB_VERSION, '<' );
	}

	/**
	 * Get current database version.
	 *
	 * @return string
	 */
	public function get_db_version(): string {
		return get_option( self::DB_VERSION_OPTION, '0.0.0' );
	}

	/**
	 * Get required database version.
	 *
	 * @return string
	 */
	public function get_required_version(): string {
		return self::DB_VERSION;
	}
}

