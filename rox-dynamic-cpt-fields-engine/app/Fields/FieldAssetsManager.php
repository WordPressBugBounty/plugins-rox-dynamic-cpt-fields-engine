<?php
/**
 * Field Assets Manager
 *
 * Handles CSS/JS enqueuing for meta fields - only loads on pages where fields are displayed.
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
 * Class FieldAssetsManager
 *
 * Manages field-related CSS and JavaScript assets with conditional loading.
 */
class FieldAssetsManager {

	/**
	 * Singleton instance.
	 *
	 * @var FieldAssetsManager|null
	 */
	private static ?FieldAssetsManager $instance = null;

	/**
	 * Whether base assets have been enqueued.
	 *
	 * @var bool
	 */
	private bool $base_assets_enqueued = false;

	/**
	 * Whether CPT layout assets have been enqueued.
	 *
	 * @var bool
	 */
	private bool $cpt_layout_enqueued = false;

	/**
	 * Whether taxonomy layout assets have been enqueued.
	 *
	 * @var bool
	 */
	private bool $taxonomy_layout_enqueued = false;

	/**
	 * Get singleton instance.
	 *
	 * @return FieldAssetsManager
	 */
	public static function get_instance(): FieldAssetsManager {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor to enforce singleton.
	 */
	private function __construct() {
		// Register assets but don't enqueue yet.
		add_action( 'admin_init', array( $this, 'register_assets' ) );
	}

	/**
	 * Register CSS and JS assets (without enqueuing).
	 *
	 * @return void
	 */
	public function register_assets(): void {
		// Use filemtime() so any CSS change automatically busts the browser
		// cache without needing to bump RDCFE_VERSION on every tweak.
		// Falls back to RDCFE_VERSION if the file is missing for any reason.
		$asset_version = static function ( string $relative_path ): string {
			$absolute = RDCFE_PLUGIN_DIR . $relative_path;
			$mtime    = file_exists( $absolute ) ? filemtime( $absolute ) : false;

			return false !== $mtime ? (string) $mtime : RDCFE_VERSION;
		};

		// Register common field CSS.
		wp_register_style(
			'rdcfe-fields',
			RDCFE_PLUGIN_URL . 'assets/css/rdcfe-fields.css',
			array( 'wp-color-picker' ),
			$asset_version( 'assets/css/rdcfe-fields.css' )
		);

		// Register CPT layout CSS.
		wp_register_style(
			'rdcfe-cpt-layout',
			RDCFE_PLUGIN_URL . 'assets/css/rdcfe-cpt-layout.css',
			array( 'rdcfe-fields' ),
			$asset_version( 'assets/css/rdcfe-cpt-layout.css' )
		);

		// Register Taxonomy layout CSS.
		wp_register_style(
			'rdcfe-taxonomy-layout',
			RDCFE_PLUGIN_URL . 'assets/css/rdcfe-taxonomy-layout.css',
			array( 'rdcfe-fields' ),
			$asset_version( 'assets/css/rdcfe-taxonomy-layout.css' )
		);

		// Register common field JS. Same filemtime-based versioning as CSS
		// so JS edits also auto-bust the browser cache.
		wp_register_script(
			'rdcfe-fields',
			RDCFE_PLUGIN_URL . 'assets/js/rdcfe-fields.js',
			array(
				'jquery',
				'jquery-ui-datepicker',
				'jquery-ui-sortable', // For Gallery/Repeater drag-drop.
				'wp-color-picker',
				'media-upload',
				'thickbox',
			),
			$asset_version( 'assets/js/rdcfe-fields.js' ),
			true
		);

		// Localization for JS.
		wp_localize_script(
			'rdcfe-fields',
			'rdcfeFieldsL10n',
			array(
				'selectImage'       => __( 'Select Image', 'rox-dynamic-cpt-fields-engine' ),
				'useImage'          => __( 'Use this image', 'rox-dynamic-cpt-fields-engine' ),
				'useImages'         => __( 'Use these images', 'rox-dynamic-cpt-fields-engine' ),
				'remove'            => __( 'Remove', 'rox-dynamic-cpt-fields-engine' ),
				'selectFile'        => __( 'Select File', 'rox-dynamic-cpt-fields-engine' ),
				'useFile'           => __( 'Use this file', 'rox-dynamic-cpt-fields-engine' ),
				'required'          => __( 'is required.', 'rox-dynamic-cpt-fields-engine' ),
				'invalidUrl'        => __( 'Please enter a valid URL.', 'rox-dynamic-cpt-fields-engine' ),
				'invalidEmail'      => __( 'Please enter a valid email address.', 'rox-dynamic-cpt-fields-engine' ),
				'validationError'   => __( 'Validation Error:', 'rox-dynamic-cpt-fields-engine' ),
				'validationMessage' => __( 'Please fill in all required fields and correct any validation errors before saving.', 'rox-dynamic-cpt-fields-engine' ),
				'dismiss'           => __( 'Dismiss this notice.', 'rox-dynamic-cpt-fields-engine' ),
				// Pro field types.
				'selectImages'      => __( 'Select Images', 'rox-dynamic-cpt-fields-engine' ),
				'addToGallery'      => __( 'Add to Gallery', 'rox-dynamic-cpt-fields-engine' ),
				'removeAll'         => __( 'Remove all images from this gallery?', 'rox-dynamic-cpt-fields-engine' ),
				'row'               => __( 'Row', 'rox-dynamic-cpt-fields-engine' ),
				'addRow'            => __( 'Add Row', 'rox-dynamic-cpt-fields-engine' ),
				'dragToReorder'     => __( 'Drag to reorder', 'rox-dynamic-cpt-fields-engine' ),
			)
		);
	}

	/**
	 * Enqueue base field assets (common CSS/JS).
	 *
	 * Call this method from managers when fields are being rendered.
	 * Assets are only enqueued once, even if called multiple times.
	 *
	 * @return void
	 */
	public function enqueue_assets(): void {
		if ( $this->base_assets_enqueued ) {
			return;
		}

		$this->base_assets_enqueued = true;

		// Enqueue our consolidated field CSS (includes datepicker styles).
		wp_enqueue_style( 'rdcfe-fields' );

		// Enqueue our consolidated field JS.
		wp_enqueue_script( 'rdcfe-fields' );

		// Enqueue media uploader.
		wp_enqueue_media();
	}

	/**
	 * Enqueue CPT-specific layout assets (tabs, accordions).
	 *
	 * @return void
	 */
	public function enqueue_cpt_layout(): void {
		// Ensure base assets are loaded first.
		$this->enqueue_assets();

		if ( $this->cpt_layout_enqueued ) {
			return;
		}

		$this->cpt_layout_enqueued = true;

		// Enqueue CPT layout CSS.
		wp_enqueue_style( 'rdcfe-cpt-layout' );
	}

	/**
	 * Enqueue Taxonomy-specific layout assets (tabs, accordions).
	 *
	 * @return void
	 */
	public function enqueue_taxonomy_layout(): void {
		// Ensure base assets are loaded first.
		$this->enqueue_assets();

		if ( $this->taxonomy_layout_enqueued ) {
			return;
		}

		$this->taxonomy_layout_enqueued = true;

		// Enqueue Taxonomy layout CSS.
		wp_enqueue_style( 'rdcfe-taxonomy-layout' );
	}

	/**
	 * Check if base assets have been enqueued.
	 *
	 * @return bool
	 */
	public function is_enqueued(): bool {
		return $this->base_assets_enqueued;
	}

	/**
	 * Check if CPT layout assets have been enqueued.
	 *
	 * @return bool
	 */
	public function is_cpt_layout_enqueued(): bool {
		return $this->cpt_layout_enqueued;
	}

	/**
	 * Check if Taxonomy layout assets have been enqueued.
	 *
	 * @return bool
	 */
	public function is_taxonomy_layout_enqueued(): bool {
		return $this->taxonomy_layout_enqueued;
	}

	/**
	 * Enqueue assets for specific field types.
	 *
	 * @param array<string> $field_types Array of field types being used.
	 * @return void
	 */
	public function enqueue_for_field_types( array $field_types ): void {
		$this->enqueue_assets();

		// Additional dependencies based on field types.
		foreach ( $field_types as $type ) {
			switch ( $type ) {
				case 'date':
				case 'datetime':
					// jQuery UI Datepicker is already included in base deps.
					break;

				case 'color':
					// WordPress Color Picker is already included in base deps.
					break;

				case 'image':
				case 'file':
					// Media uploader is already enqueued.
					break;

				case 'wysiwyg':
					// Ensure editor scripts are loaded.
					wp_enqueue_editor();
					break;
			}
		}
	}
}
