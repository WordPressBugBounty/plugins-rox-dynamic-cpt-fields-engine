<?php
/**
 * Main Plugin Class
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE;

/**
 * Class Plugin
 *
 * Main plugin class that bootstraps all functionality.
 */
final class Plugin {

	/**
	 * Plugin instance.
	 *
	 * @var Plugin|null
	 */
	private static ?Plugin $instance = null;

	/**
	 * Whether the plugin has been initialized.
	 *
	 * @var bool
	 */
	private bool $initialized = false;

	/**
	 * Get plugin instance (Singleton).
	 *
	 * @return Plugin
	 */
	public static function get_instance(): Plugin {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor to prevent direct instantiation.
	 */
	private function __construct() {
		// Prevent cloning and unserialization.
	}

	/**
	 * Prevent cloning.
	 *
	 * @return void
	 */
	private function __clone() {
	}

	/**
	 * Prevent unserialization.
	 *
	 * @throws \Exception When trying to unserialize.
	 * @return void
	 */
	public function __wakeup(): void {
		throw new \Exception( 'Cannot unserialize singleton' );
	}

	/**
	 * Initialize the plugin.
	 *
	 * @return void
	 */
	public function init(): void {
		if ( $this->initialized ) {
			return;
		}

		$this->initialized = true;

		// Initialize components.
		$this->init_components();

		// Fire actions to include local configurations from themes/plugins.
		$this->include_local_configs();

		/**
		 * Fires after the plugin has been initialized.
		 *
		 * @since 1.0.0
		 */
		do_action( 'rdcfe_init' );
	}

	/**
	 * Include local configurations registered via PHP API.
	 *
	 * @return void
	 */
	private function include_local_configs(): void {
		// Fire actions for themes/plugins to register their configurations.
		if ( function_exists( 'rdcfe_include_post_types' ) ) {
			rdcfe_include_post_types();
		}

		if ( function_exists( 'rdcfe_include_taxonomies' ) ) {
			rdcfe_include_taxonomies();
		}

		if ( function_exists( 'rdcfe_include_fields' ) ) {
			rdcfe_include_fields();
		}

		if ( function_exists( 'rdcfe_include_options_pages' ) ) {
			rdcfe_include_options_pages();
		}

		// Register local configurations.
		$this->register_local_configs();
	}

	/**
	 * Register local configurations with the appropriate managers.
	 *
	 * @return void
	 */
	private function register_local_configs(): void {
		if ( ! class_exists( 'RDCFE_Local_Store' ) ) {
			return;
		}

		// Register local post types.
		$post_types = \RDCFE_Local_Store::get_post_types();
		if ( ! empty( $post_types ) && null !== $this->registration_manager ) {
			foreach ( $post_types as $config ) {
				$this->registration_manager->register_local_post_type( $config );
			}
		}

		// Register local taxonomies.
		$taxonomies = \RDCFE_Local_Store::get_taxonomies();
		if ( ! empty( $taxonomies ) && null !== $this->registration_manager ) {
			foreach ( $taxonomies as $config ) {
				$this->registration_manager->register_local_taxonomy( $config );
			}
		}

		// Register local field groups.
		$field_groups = \RDCFE_Local_Store::get_field_groups();
		if ( ! empty( $field_groups ) && null !== $this->field_group_manager ) {
			foreach ( $field_groups as $config ) {
				$this->field_group_manager->register_local_field_group( $config );
			}
		}

		// Register local options pages.
		$options_pages = \RDCFE_Local_Store::get_options_pages();
		if ( ! empty( $options_pages ) && null !== $this->options_page_registrar ) {
			foreach ( $options_pages as $config ) {
				$this->options_page_registrar->register_local_options_page( $config );
			}
		}
	}

	/**
	 * Config post type instance.
	 *
	 * @var Config\ConfigPostType|null
	 */
	private ?Config\ConfigPostType $config_post_type = null;

	/**
	 * Config repository instance.
	 *
	 * @var Config\ConfigRepository|null
	 */
	private ?Config\ConfigRepository $config_repository = null;

	/**
	 * Initialize plugin components.
	 *
	 * @return void
	 */
	private function init_components(): void {
		// Initialize config storage (runs early, before admin).
		$this->init_config_storage();

		// Admin components (only in admin context).
		if ( is_admin() ) {
			$this->init_admin();
		}

		// Initialize frontend components.
		$this->init_frontend();

		// Initialize REST API.
		$this->init_rest_api();
	}

	/**
	 * Initialize config storage.
	 *
	 * @return void
	 */
	private function init_config_storage(): void {
		$this->config_post_type = new Config\ConfigPostType();
		$this->config_post_type->init();

		$this->config_repository = new Config\ConfigRepository();
	}

	/**
	 * Get config repository instance.
	 *
	 * @return Config\ConfigRepository
	 */
	public function get_config_repository(): Config\ConfigRepository {
		if ( null === $this->config_repository ) {
			$this->config_repository = new Config\ConfigRepository();
		}
		return $this->config_repository;
	}

	/**
	 * Admin menu instance.
	 *
	 * @var Admin\AdminMenu|null
	 */
	private ?Admin\AdminMenu $admin_menu = null;

	/**
	 * Admin assets instance.
	 *
	 * @var Admin\AdminAssets|null
	 */
	private ?Admin\AdminAssets $admin_assets = null;

	/**
	 * Options page registrar instance.
	 *
	 * @var Admin\OptionsPageRegistrar|null
	 */
	private ?Admin\OptionsPageRegistrar $options_page_registrar = null;

	/**
	 * Initialize admin components.
	 *
	 * @return void
	 */
	private function init_admin(): void {
		$this->admin_menu = new Admin\AdminMenu();
		$this->admin_menu->init();

		$this->admin_assets = new Admin\AdminAssets( $this->admin_menu );
		$this->admin_assets->init();

		// Initialize field assets manager (for conditional CSS/JS loading).
		Fields\FieldAssetsManager::get_instance();

		// Initialize options pages registrar.
		$this->options_page_registrar = new Admin\OptionsPageRegistrar( $this->config_repository );
		$this->options_page_registrar->init();
	}

	/**
	 * Get options page registrar instance.
	 *
	 * @return Admin\OptionsPageRegistrar|null
	 */
	public function get_options_page_registrar(): ?Admin\OptionsPageRegistrar {
		return $this->options_page_registrar;
	}

	/**
	 * Get admin menu instance.
	 *
	 * @return Admin\AdminMenu|null
	 */
	public function get_admin_menu(): ?Admin\AdminMenu {
		return $this->admin_menu;
	}

	/**
	 * Registration manager instance.
	 *
	 * @var Registration\RegistrationManager|null
	 */
	private ?Registration\RegistrationManager $registration_manager = null;

	/**
	 * Initialize frontend components.
	 *
	 * @return void
	 */
	private function init_frontend(): void {
		// Initialize registration manager (runs on both admin and frontend).
		$this->init_registration();

		// Initialize field groups (admin only for meta boxes).
		if ( is_admin() ) {
			$this->init_field_groups();
		}
	}

	/**
	 * Initialize registration of CPTs and taxonomies.
	 *
	 * @return void
	 */
	private function init_registration(): void {
		$this->registration_manager = new Registration\RegistrationManager(
			$this->config_repository
		);
		$this->registration_manager->init();
	}

	/**
	 * Get registration manager instance.
	 *
	 * @return Registration\RegistrationManager|null
	 */
	public function get_registration_manager(): ?Registration\RegistrationManager {
		return $this->registration_manager;
	}

	/**
	 * Field group manager instance.
	 *
	 * @var Fields\FieldGroupManager|null
	 */
	private ?Fields\FieldGroupManager $field_group_manager = null;

	/**
	 * CPT meta fields manager instance.
	 *
	 * @var Fields\CPTMetaFieldsManager|null
	 */
	private ?Fields\CPTMetaFieldsManager $cpt_meta_fields_manager = null;

	/**
	 * Taxonomy meta fields manager instance.
	 *
	 * @var Fields\TaxonomyMetaFieldsManager|null
	 */
	private ?Fields\TaxonomyMetaFieldsManager $taxonomy_meta_fields_manager = null;

	/**
	 * Initialize field groups.
	 *
	 * @return void
	 */
	private function init_field_groups(): void {
		// Initialize standalone field groups (Metaboxes).
		$this->field_group_manager = new Fields\FieldGroupManager(
			$this->config_repository
		);
		$this->field_group_manager->init();

		// Initialize CPT embedded meta fields.
		$this->cpt_meta_fields_manager = new Fields\CPTMetaFieldsManager(
			$this->config_repository
		);
		$this->cpt_meta_fields_manager->init();

		// Initialize Taxonomy embedded meta fields.
		$this->taxonomy_meta_fields_manager = new Fields\TaxonomyMetaFieldsManager(
			$this->config_repository
		);
		$this->taxonomy_meta_fields_manager->init();
	}

	/**
	 * Get field group manager instance.
	 *
	 * @return Fields\FieldGroupManager|null
	 */
	public function get_field_group_manager(): ?Fields\FieldGroupManager {
		return $this->field_group_manager;
	}

	/**
	 * Get CPT meta fields manager instance.
	 *
	 * @return Fields\CPTMetaFieldsManager|null
	 */
	public function get_cpt_meta_fields_manager(): ?Fields\CPTMetaFieldsManager {
		return $this->cpt_meta_fields_manager;
	}

	/**
	 * Get Taxonomy meta fields manager instance.
	 *
	 * @return Fields\TaxonomyMetaFieldsManager|null
	 */
	public function get_taxonomy_meta_fields_manager(): ?Fields\TaxonomyMetaFieldsManager {
		return $this->taxonomy_meta_fields_manager;
	}

	/**
	 * REST manager instance.
	 *
	 * @var REST\RestManager|null
	 */
	private ?REST\RestManager $rest_manager = null;

	/**
	 * Initialize REST API.
	 *
	 * @return void
	 */
	private function init_rest_api(): void {
		$this->rest_manager = new REST\RestManager();
		$this->rest_manager->init();
	}

	/**
	 * Get REST manager instance.
	 *
	 * @return REST\RestManager|null
	 */
	public function get_rest_manager(): ?REST\RestManager {
		return $this->rest_manager;
	}

	/**
	 * Plugin activation.
	 *
	 * @return void
	 */
	public static function activate(): void {
		// Check capabilities.
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		// Set default options.
		$default_options = array(
			'version'            => RDCFE_VERSION,
			'db_version'         => '1.0.0',
			'auto_flush_rewrite' => true,
			'clean_uninstall'    => false,
			'debug_mode'         => false,
			'installed_at'       => current_time( 'mysql' ),
		);

		// Only set options if they don't exist.
		if ( ! get_option( 'rdcfe_settings' ) ) {
			add_option( 'rdcfe_settings', $default_options );
		}

		// Run database migrations.
		$migrator = new Database\Migrator();
		$migrator->run();

		// Flush rewrite rules.
		flush_rewrite_rules();

		/**
		 * Fires after the plugin has been activated.
		 *
		 * @since 1.0.0
		 */
		do_action( 'rdcfe_activated' );
	}

	/**
	 * Plugin deactivation.
	 *
	 * @return void
	 */
	public static function deactivate(): void {
		// Check capabilities.
		if ( ! current_user_can( 'deactivate_plugins' ) ) {
			return;
		}

		// Flush rewrite rules.
		flush_rewrite_rules();

		// Clear transients.
		delete_transient( 'rdcfe_schema_cache' );

		/**
		 * Fires after the plugin has been deactivated.
		 *
		 * @since 1.0.0
		 */
		do_action( 'rdcfe_deactivated' );
	}

	/**
	 * Get plugin version.
	 *
	 * @return string
	 */
	public function get_version(): string {
		return RDCFE_VERSION;
	}

	/**
	 * Get plugin directory path.
	 *
	 * @return string
	 */
	public function get_plugin_dir(): string {
		return RDCFE_PLUGIN_DIR;
	}

	/**
	 * Get plugin URL.
	 *
	 * @return string
	 */
	public function get_plugin_url(): string {
		return RDCFE_PLUGIN_URL;
	}

	/**
	 * Get plugin settings.
	 *
	 * @param string|null $key Optional. Specific setting key.
	 * @param mixed       $default Optional. Default value if key doesn't exist.
	 * @return mixed
	 */
	public function get_setting( ?string $key = null, mixed $default = null ): mixed {
		$settings = get_option( 'rdcfe_settings', array() );

		if ( null === $key ) {
			return $settings;
		}

		return $settings[ $key ] ?? $default;
	}

	/**
	 * Update plugin setting.
	 *
	 * @param string $key Setting key.
	 * @param mixed  $value Setting value.
	 * @return bool
	 */
	public function update_setting( string $key, mixed $value ): bool {
		$settings         = get_option( 'rdcfe_settings', array() );
		$settings[ $key ] = $value;

		return update_option( 'rdcfe_settings', $settings );
	}
}
