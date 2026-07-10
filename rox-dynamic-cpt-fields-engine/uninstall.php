<?php
/**
 * Uninstall Script
 *
 * This file runs when the plugin is deleted via the WordPress admin.
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

// Exit if not called by WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Load autoloader if needed.
$rdcfe_autoloader = __DIR__ . '/vendor/autoload.php';
if ( file_exists( $rdcfe_autoloader ) ) {
	require_once $rdcfe_autoloader;
}

// Get plugin settings.
$rdcfe_settings = get_option( 'rdcfe_settings', array() );

// Check if clean uninstall is enabled.
$rdcfe_clean_uninstall = isset( $rdcfe_settings['clean_uninstall'] ) && $rdcfe_settings['clean_uninstall'];

if ( $rdcfe_clean_uninstall ) {
	global $wpdb;

	// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery
	// phpcs:disable WordPress.DB.DirectDatabaseQuery.NoCaching

	// Delete all rdcfe_config posts.
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->posts} WHERE post_type = %s",
			'rdcfe_config'
		)
	);

	// Delete all rdcfe_config postmeta.
	$wpdb->query(
		"DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE '_rdcfe_%'"
	);

	// Delete plugin options.
	delete_option( 'rdcfe_settings' );
	delete_option( 'rdcfe_db_version' );

	// Delete all rdcfe_ prefixed options.
	$wpdb->query(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE 'rdcfe_%'"
	);

	// Delete transients.
	$wpdb->query(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_rdcfe_%'"
	);
	$wpdb->query(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_rdcfe_%'"
	);

	// Drop custom tables using Schema class if available.
	if ( class_exists( '\RDCFE\Database\Schema' ) ) {
		$rdcfe_tables = \RDCFE\Database\Schema::get_all_tables();
	} else {
		// Fallback to hardcoded table names.
		$rdcfe_tables = array(
			$wpdb->prefix . 'rdcfe_relations',
			$wpdb->prefix . 'rdcfe_snapshots',
			$wpdb->prefix . 'rdcfe_migrations',
		);
	}

	foreach ( $rdcfe_tables as $rdcfe_table ) {
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.SchemaChange, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table name from known source.
		$wpdb->query( "DROP TABLE IF EXISTS {$rdcfe_table}" );
	}

	// Delete user meta.
	$wpdb->query(
		"DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'rdcfe_%'"
	);

	// phpcs:enable

	// Clear any scheduled hooks.
	wp_clear_scheduled_hook( 'rdcfe_daily_cleanup' );

	// Flush rewrite rules.
	flush_rewrite_rules();
}
