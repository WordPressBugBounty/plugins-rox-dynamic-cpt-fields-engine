<?php
/**
 * Plugin Name: Dynamic Fields Engine
 * Plugin URI: https://dynamicfieldsengine.com/
 * Description: Build Custom Post Types, Taxonomies, Custom Fields, Queries, and Listings from one unified interface.
 * Version: 1.0.7
 * Author: Roxnor,  Wpmet
 * Author URI: https://wpmet.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: rox-dynamic-cpt-fields-engine
 * Domain Path: /languages
 * Requires at least: 6.5
 * Requires PHP: 8.0
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Plugin constants.
define( 'RDCFE_VERSION', '1.0.7' );
define( 'RDCFE_PLUGIN_FILE', __FILE__ );
define( 'RDCFE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'RDCFE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'RDCFE_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// Autoloader.
if ( file_exists( RDCFE_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
	require_once RDCFE_PLUGIN_DIR . 'vendor/autoload.php';
}

// Load public API functions (available early for theme/plugin use).
require_once RDCFE_PLUGIN_DIR . 'includes/api.php';

/**
 * Initialize the plugin.
 *
 * @return void
 */
function rdcfe_init(): void {
	// Check PHP version.
	if ( version_compare( PHP_VERSION, '8.0', '<' ) ) {
		add_action( 'admin_notices', 'rdcfe_php_version_notice' );
		return;
	}

	// Check WordPress version.
	if ( version_compare( get_bloginfo( 'version' ), '6.4', '<' ) ) {
		add_action( 'admin_notices', 'rdcfe_wp_version_notice' );
		return;
	}

	// Boot the plugin.
	$plugin = \RDCFE\Plugin::get_instance();
	$plugin->init();
}

/**
 * PHP version notice.
 *
 * @return void
 */
function rdcfe_php_version_notice(): void {
	$message = sprintf(
		/* translators: 1: Required PHP version, 2: Current PHP version */
		esc_html__( 'Rox Dynamic CPT Fields Engine requires PHP %1$s or higher. You are running PHP %2$s.', 'rox-dynamic-cpt-fields-engine' ),
		'8.0',
		PHP_VERSION
	);
	printf( '<div class="notice notice-error"><p>%s</p></div>', esc_html( $message ) );
}

/**
 * WordPress version notice.
 *
 * @return void
 */
function rdcfe_wp_version_notice(): void {
	$message = sprintf(
		/* translators: 1: Required WordPress version, 2: Current WordPress version */
		esc_html__( 'Rox Dynamic CPT Fields Engine requires WordPress %1$s or higher. You are running WordPress %2$s.', 'rox-dynamic-cpt-fields-engine' ),
		'6.4',
		get_bloginfo( 'version' )
	);
	printf( '<div class="notice notice-error"><p>%s</p></div>', esc_html( $message ) );
}

/**
 * Activation hook.
 *
 * @return void
 */
function rdcfe_activate(): void {
	// Run activation tasks.
	if ( class_exists( '\RDCFE\Plugin' ) ) {
		\RDCFE\Plugin::activate();
	}
}

/**
 * Deactivation hook.
 *
 * @return void
 */
function rdcfe_deactivate(): void {
	// Run deactivation tasks.
	if ( class_exists( '\RDCFE\Plugin' ) ) {
		\RDCFE\Plugin::deactivate();
	}
}

// Register hooks.
register_activation_hook( __FILE__, 'rdcfe_activate' );
register_deactivation_hook( __FILE__, 'rdcfe_deactivate' );

/**
 * Load plugin text domain for PHP translations.
 *
 * @return void
 */
function rdcfe_load_textdomain(): void {
	load_plugin_textdomain(
		'rox-dynamic-cpt-fields-engine',
		false,
		dirname( RDCFE_PLUGIN_BASENAME ) . '/languages'
	);
}

// Initialize plugin after plugins are loaded.
add_action( 'plugins_loaded', 'rdcfe_init' );
add_action( 'init', 'rdcfe_load_textdomain' );
