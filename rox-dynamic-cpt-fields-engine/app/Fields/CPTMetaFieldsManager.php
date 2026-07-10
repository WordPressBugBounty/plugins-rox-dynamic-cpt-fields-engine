<?php
/**
 * CPT Meta Fields Manager
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use RDCFE\Config\ConfigRepository;

/**
 * Class CPTMetaFieldsManager
 *
 * Handles meta fields that are embedded directly within CPT configurations.
 * Supports Tab (Horizontal/Vertical), Accordion, and Endpoint layout elements.
 */
class CPTMetaFieldsManager {

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $config_repository;

	/**
	 * Meta box renderer.
	 *
	 * @var MetaBoxRenderer
	 */
	private MetaBoxRenderer $renderer;

	/**
	 * CPT configs with meta fields.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private array $cpt_meta_fields = array();

	/**
	 * Constructor.
	 *
	 * @param ConfigRepository|null $config_repository Config repository instance.
	 * @param MetaBoxRenderer|null  $renderer Meta box renderer instance.
	 */
	public function __construct(
		?ConfigRepository $config_repository = null,
		?MetaBoxRenderer $renderer = null
	) {
		$this->config_repository = $config_repository ?? new ConfigRepository();
		$this->renderer          = $renderer ?? new MetaBoxRenderer();
	}

	/**
	 * Initialize the manager.
	 *
	 * @return void
	 */
	public function init(): void {
		// Load CPT meta fields early.
		add_action( 'init', array( $this, 'load_cpt_meta_fields' ), 15 );

		// Add meta boxes.
		add_action( 'add_meta_boxes', array( $this, 'register_meta_boxes' ), 10, 2 );

		// Save meta box data.
		add_action( 'save_post', array( $this, 'save_meta_boxes' ), 10, 2 );

		// Register meta for REST API.
		add_action( 'init', array( $this, 'register_meta_for_rest' ), 25 );

		// Enqueue media scripts.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );

		// Display validation error notices.
		add_action( 'admin_notices', array( $this, 'display_validation_errors' ) );
	}

	/**
	 * Display validation error notices in admin.
	 *
	 * @return void
	 */
	public function display_validation_errors(): void {
		// Check if we have a validation error query arg.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Just checking for query arg.
		if ( ! isset( $_GET['rdcfe_validation_error'] ) ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->base ) {
			return;
		}

		// Get post ID.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Just getting post ID.
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( ! $post_id ) {
			return;
		}

		// Get validation errors from transient.
		$errors = get_transient( 'rdcfe_validation_errors_' . $post_id );
		if ( empty( $errors ) ) {
			return;
		}

		// Delete the transient.
		delete_transient( 'rdcfe_validation_errors_' . $post_id );

		// Build error message.
		$error_list = '<ul style="margin: 0.5em 0 0 1.5em; list-style: disc;">';
		foreach ( $errors as $field_name => $error_message ) {
			$error_list .= '<li>' . esc_html( $error_message ) . '</li>';
		}
		$error_list .= '</ul>';

		printf(
			'<div class="notice notice-error is-dismissible"><p><strong>%s</strong>%s</p></div>',
			esc_html__( 'Validation Error: Please fix the following issues:', 'rox-dynamic-cpt-fields-engine' ),
			$error_list // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already escaped above.
		);
	}

	/**
	 * Enqueue admin scripts for media fields.
	 *
	 * @param string $hook The current admin page hook.
	 * @return void
	 */
	public function enqueue_scripts( string $hook ): void {
		// Only on post edit screens.
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		$post_type = get_current_screen()->post_type ?? '';

		// Check if this post type has meta fields.
		if ( ! isset( $this->cpt_meta_fields[ $post_type ] ) ) {
			return;
		}

		// Enqueue block editor dependencies for validation.
		$screen = get_current_screen();
		if ( $screen && $screen->is_block_editor() ) {
			wp_enqueue_script( 'wp-data' );
			wp_enqueue_script( 'wp-editor' );
			wp_enqueue_script( 'wp-notices' );
		}

		// Check field types needed.
		$has_media_fields    = false;
		$has_multiple_select = false;
		$meta_fields         = $this->cpt_meta_fields[ $post_type ]['meta_fields'];

		foreach ( $meta_fields as $field ) {
			$type = $field['type'] ?? 'text';
			if ( in_array( $type, array( 'image', 'file' ), true ) ) {
				$has_media_fields = true;
			}
			if ( 'select' === $type && ! empty( $field['multiple'] ) ) {
				$has_multiple_select = true;
			}
		}

		// Multiple select fields use native HTML5 multi-select (no external dependencies).
		// Enhanced styling is provided via rdcfe-fields.css.
		unset( $has_multiple_select ); // Silence unused variable warning.

		// Media fields are handled by rdcfe-fields.js
		if ( $has_media_fields ) {
			wp_enqueue_media();
		}

		/**
		 * Fires after the CPT meta-field assets have been queued for the
		 * current edit screen.
		 *
		 * Pro plugins hook here to enqueue extra JS (e.g. the conditional
		 * logic evaluator) only on screens that actually render RDCFE
		 * meta fields, instead of every wp-admin page.
		 *
		 * @since 1.0.0
		 *
		 * @param string                            $post_type   The post type slug.
		 * @param array<int, array<string, mixed>>  $meta_fields The meta fields config.
		 * @param string                            $hook        The current admin page hook.
		 */
		do_action( 'rdcfe_cpt_meta_assets_enqueued', $post_type, $meta_fields, $hook );
	}

	/**
	 * Load CPT configurations that have meta fields.
	 *
	 * @return void
	 */
	public function load_cpt_meta_fields(): void {
		$post_types = $this->config_repository->get_all( 'post_type', 'publish' );

		foreach ( $post_types as $post_type ) {
			$data        = $post_type['data'] ?? array();
			$meta_fields = $data['meta_fields'] ?? array();
			$slug        = $data['slug'] ?? '';

			if ( ! empty( $meta_fields ) && ! empty( $slug ) ) {
				$this->cpt_meta_fields[ $slug ] = array(
					'config_id'   => $post_type['id'],
					'title'       => $data['label'] ?? $slug,
					'meta_fields' => $meta_fields,
				);
			}
		}
	}

	/**
	 * Register meta boxes for CPTs with embedded meta fields.
	 *
	 * @param string   $post_type The post type.
	 * @param \WP_Post $post The post object.
	 * @return void
	 */
	public function register_meta_boxes( string $post_type, \WP_Post $post ): void {
		// Check if this post type has embedded meta fields.
		if ( ! isset( $this->cpt_meta_fields[ $post_type ] ) ) {
			return;
		}

		$cpt_config  = $this->cpt_meta_fields[ $post_type ];
		$meta_fields = $cpt_config['meta_fields'];
		$cpt_title   = $cpt_config['title'];

		// Parse fields into structured layout (tabs, accordions, fields).
		$layout = $this->parse_field_layout( $meta_fields );

		// Register a single meta box with all fields using proper layout.
		$meta_box_id = 'rdcfe_cpt_meta_' . $post_type;

		add_meta_box(
			$meta_box_id,
			$cpt_title . ' ' . __( 'Settings', 'rox-dynamic-cpt-fields-engine' ),
			array( $this, 'render_meta_box' ),
			$post_type,
			'normal',
			'high',
			array(
				'layout'    => $layout,
				'cpt_slug'  => $post_type,
			)
		);
	}

	/**
	 * Parse meta fields into structured layout with tabs, accordions, and fields.
	 *
	 * @param array<array<string, mixed>> $meta_fields The meta fields array.
	 * @return array<string, mixed> Structured layout data.
	 */
	private function parse_field_layout( array $meta_fields ): array {
		$layout = array(
			'type'     => 'simple', // simple, tabs, mixed.
			'tab_type' => 'horizontal', // horizontal or vertical.
			'sections' => array(),
		);

		$current_section = array(
			'type'   => 'fields',
			'tab'    => null,
			'fields' => array(),
		);

		$has_tabs       = false;
		$has_accordions = false;
		$first_tab      = null;

		foreach ( $meta_fields as $field ) {
			$object_type = $field['object_type'] ?? 'field';

			switch ( $object_type ) {
				case 'tab':
					// Save the current section before starting a new tab. We
					// also push when the current section is itself a tab or
					// accordion (even with no fields) so back-to-back
					// markers don't silently overwrite each other — the
					// previous, possibly-empty container still appears.
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					// Start new tab section.
					$has_tabs       = true;
					$current_section = array(
						'type'   => 'tab',
						'tab'    => $field,
						'fields' => array(),
					);

					// Remember first tab for layout type.
					if ( null === $first_tab ) {
						$first_tab          = $field;
						$layout['tab_type'] = ( 'vertical' === ( $field['layout'] ?? 'horizontal' ) ) ? 'vertical' : 'horizontal';
					}
					break;

				case 'accordion':
					// Save the current section before starting a new
					// accordion (see rationale on the `tab` case).
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					// Start new accordion section.
					$has_accordions  = true;
					$current_section = array(
						'type'      => 'accordion',
						'accordion' => $field,
						'fields'    => array(),
					);
					break;

				case 'endpoint':
					// End current tab/accordion and save section.
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					// Push an explicit break marker. The renderer treats this
					// as a hard block separator, so a sequence like
					// `tab → endpoint → tab` produces TWO distinct tab strips
					// instead of one strip with both tabs flattened together.
					$layout['sections'][] = array(
						'type'   => 'break',
						'fields' => array(),
					);

					// Reset to simple fields section.
					$current_section = array(
						'type'   => 'fields',
						'tab'    => null,
						'fields' => array(),
					);
					break;

				case 'field':
				default:
					$current_section['fields'][] = $field;
					break;
			}
		}

		// Add final section.
		if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
			$layout['sections'][] = $current_section;
		}

		// Determine layout type.
		if ( $has_tabs ) {
			$layout['type'] = 'tabs';
		} elseif ( $has_accordions ) {
			$layout['type'] = 'accordions';
		} else {
			$layout['type'] = 'simple';
		}

		return $layout;
	}

	/**
	 * Render meta box callback.
	 *
	 * Walks the parsed sections in document order and emits each
	 * consecutive run of same-kind sections as a discrete block (tab strip,
	 * accordion list, or standalone fields container). This preserves the
	 * author's intended ordering when tabs and accordions are mixed in the
	 * same metabox — e.g. `tab → endpoint → accordion → accordion` renders
	 * a tab strip followed by an accordion list, not a tab strip with the
	 * accordion content silently flattened above it (which was the bug in
	 * the previous "tabs OR accordions, exclusive" dispatcher).
	 *
	 * @param \WP_Post             $post The post object.
	 * @param array<string, mixed> $metabox The metabox arguments.
	 * @return void
	 */
	public function render_meta_box( \WP_Post $post, array $metabox ): void {
		$layout   = $metabox['args']['layout'] ?? array();
		$sections = $layout['sections'] ?? array();

		if ( empty( $sections ) ) {
			echo '<p>' . esc_html__( 'No fields configured.', 'rox-dynamic-cpt-fields-engine' ) . '</p>';
			return;
		}

		// Nonce field.
		wp_nonce_field( 'rdcfe_save_cpt_meta_fields', 'rdcfe_cpt_meta_nonce' );

		$tab_type   = $layout['tab_type'] ?? 'horizontal';
		$metabox_id = (string) $metabox['id'];

		echo '<div class="rdcfe-meta-box rdcfe-cpt-meta-fields">';
		$this->render_section_blocks( $sections, $tab_type, $metabox_id, $post->ID );
		echo '</div>';

		// Enqueue CPT layout assets (includes common field CSS/JS).
		FieldAssetsManager::get_instance()->enqueue_cpt_layout();
	}

	/**
	 * Walk parsed sections in order and emit each consecutive run as a
	 * block (tabs strip / accordions list / standalone fields).
	 *
	 * Each tab/accordion block gets a unique DOM ID derived from the
	 * metabox ID plus a running block index, so multiple strips/lists on
	 * the same screen never collide.
	 *
	 * @param array<int, array<string, mixed>> $sections   Parsed sections in document order.
	 * @param string                           $tab_type   'horizontal'|'vertical'.
	 * @param string                           $metabox_id Stable DOM-safe ID prefix.
	 * @param int                              $post_id    The post ID.
	 * @return void
	 */
	private function render_section_blocks( array $sections, string $tab_type, string $metabox_id, int $post_id ): void {
		$count       = count( $sections );
		$index       = 0;
		$block_index = 0;

		while ( $index < $count ) {
			$section_type = $sections[ $index ]['type'] ?? 'fields';

			// Hard block separator emitted by the parser whenever the author
			// dropped an `endpoint` marker. We just consume it and let the
			// outer loop start a fresh block — never merge across a break.
			if ( 'break' === $section_type ) {
				++$index;
				continue;
			}

			if ( 'tab' === $section_type ) {
				$run = array();
				while ( $index < $count && 'tab' === ( $sections[ $index ]['type'] ?? '' ) ) {
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_tabs_block(
					$run,
					$tab_type,
					$metabox_id . '_b' . $block_index,
					$post_id
				);
			} elseif ( 'accordion' === $section_type ) {
				$run = array();
				while ( $index < $count && 'accordion' === ( $sections[ $index ]['type'] ?? '' ) ) {
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_accordions_block(
					$run,
					$metabox_id . '_b' . $block_index,
					$post_id
				);
			} else {
				$run = array();
				while ( $index < $count ) {
					$current_type = $sections[ $index ]['type'] ?? 'fields';
					if ( 'tab' === $current_type || 'accordion' === $current_type || 'break' === $current_type ) {
						break;
					}
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_fields_block( $run, $post_id );
			}

			++$block_index;
		}
	}

	/**
	 * Render a run of standalone field sections as one flat fields grid.
	 *
	 * @param array<int, array<string, mixed>> $sections Section subset (all `type === 'fields'`).
	 * @param int                              $post_id  The post ID.
	 * @return void
	 */
	private function render_fields_block( array $sections, int $post_id ): void {
		$has_any = false;
		foreach ( $sections as $section ) {
			if ( ! empty( $section['fields'] ?? array() ) ) {
				$has_any = true;
				break;
			}
		}

		if ( ! $has_any ) {
			return;
		}

		echo '<div class="rdcfe-fields-container rdcfe-standalone-fields">';
		foreach ( $sections as $section ) {
			foreach ( $section['fields'] ?? array() as $field ) {
				$this->render_field( $field, $post_id );
			}
		}
		echo '</div>';
	}

	/**
	 * Render a run of tab sections as one horizontal/vertical tab strip.
	 *
	 * @param array<int, array<string, mixed>> $sections  Section subset (all `type === 'tab'`).
	 * @param string                           $tab_type  'horizontal'|'vertical'.
	 * @param string                           $unique_id DOM-safe ID prefix for THIS strip.
	 * @param int                              $post_id   The post ID.
	 * @return void
	 */
	private function render_tabs_block( array $sections, string $tab_type, string $unique_id, int $post_id ): void {
		if ( empty( $sections ) ) {
			return;
		}

		$layout_class = 'vertical' === $tab_type ? 'rdcfe-tabs--vertical' : 'rdcfe-tabs--horizontal';

		echo '<div class="rdcfe-tabs ' . esc_attr( $layout_class ) . '" data-tabs-id="' . esc_attr( $unique_id ) . '">';

		echo '<div class="rdcfe-tabs__nav" role="tablist">';
		foreach ( $sections as $tab_index => $section ) {
			$tab_meta     = $section['tab'] ?? array();
			$tab_id       = $unique_id . '_tab_' . $tab_index;
			$panel_id     = $unique_id . '_panel_' . $tab_index;
			$is_active    = 0 === $tab_index;
			$tab_label    = $tab_meta['label'] ?? sprintf( '%s %d', __( 'Tab', 'rox-dynamic-cpt-fields-engine' ), $tab_index + 1 );
			$active_class = $is_active ? 'rdcfe-tabs__tab--active' : '';

			printf(
				'<button type="button" class="rdcfe-tabs__tab %s" role="tab" id="%s" aria-selected="%s" aria-controls="%s" data-tab-index="%d">%s</button>',
				esc_attr( $active_class ),
				esc_attr( $tab_id ),
				$is_active ? 'true' : 'false',
				esc_attr( $panel_id ),
				(int) $tab_index,
				esc_html( $tab_label )
			);
		}
		echo '</div>';

		echo '<div class="rdcfe-tabs__panels">';
		foreach ( $sections as $tab_index => $section ) {
			$tab_id       = $unique_id . '_tab_' . $tab_index;
			$panel_id     = $unique_id . '_panel_' . $tab_index;
			$is_active    = 0 === $tab_index;
			$active_class = $is_active ? 'rdcfe-tabs__panel--active' : '';
			$hidden       = ! $is_active ? 'hidden' : '';

			printf(
				'<div class="rdcfe-tabs__panel %s" role="tabpanel" id="%s" aria-labelledby="%s" %s>',
				esc_attr( $active_class ),
				esc_attr( $panel_id ),
				esc_attr( $tab_id ),
				esc_attr( $hidden )
			);

			echo '<div class="rdcfe-fields-container">';
			foreach ( $section['fields'] ?? array() as $field ) {
				$this->render_field( $field, $post_id );
			}
			echo '</div>';

			echo '</div>';
		}
		echo '</div>';

		echo '</div>';
	}

	/**
	 * Render a run of accordion sections as one accordion list.
	 *
	 * @param array<int, array<string, mixed>> $sections  Section subset (all `type === 'accordion'`).
	 * @param string                           $unique_id DOM-safe ID prefix for THIS list.
	 * @param int                              $post_id   The post ID.
	 * @return void
	 */
	private function render_accordions_block( array $sections, string $unique_id, int $post_id ): void {
		if ( empty( $sections ) ) {
			return;
		}

		echo '<div class="rdcfe-accordions" data-accordion-id="' . esc_attr( $unique_id ) . '">';

		foreach ( $sections as $accordion_index => $section ) {
			$accordion       = $section['accordion'] ?? array();
			$fields          = $section['fields'] ?? array();
			$accordion_label = $accordion['label'] ?? sprintf( '%s %d', __( 'Section', 'rox-dynamic-cpt-fields-engine' ), $accordion_index + 1 );
			$header_id       = $unique_id . '_accordion_header_' . $accordion_index;
			$content_id      = $unique_id . '_accordion_content_' . $accordion_index;
			$is_open         = 0 === $accordion_index;

			echo '<div class="rdcfe-accordion' . ( $is_open ? ' rdcfe-accordion--open' : '' ) . '">';
			printf(
				'<button type="button" class="rdcfe-accordion__header" id="%s" aria-expanded="%s" aria-controls="%s" data-accordion-index="%d">',
				esc_attr( $header_id ),
				$is_open ? 'true' : 'false',
				esc_attr( $content_id ),
				(int) $accordion_index
			);
			echo '<span class="rdcfe-accordion__title">' . esc_html( $accordion_label ) . '</span>';
			echo '<span class="rdcfe-accordion__icon"></span>';
			echo '</button>';

			printf(
				'<div class="rdcfe-accordion__content" id="%s" role="region" aria-labelledby="%s" %s>',
				esc_attr( $content_id ),
				esc_attr( $header_id ),
				esc_attr( ! $is_open ? 'hidden' : '' )
			);
			echo '<div class="rdcfe-fields-container">';
			foreach ( $fields as $field ) {
				$this->render_field( $field, $post_id );
			}
			echo '</div>';
			echo '</div>';

			echo '</div>';
		}

		echo '</div>';
	}

	/**
	 * Render a single field.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param int                  $post_id The post ID.
	 * @return void
	 */
	private function render_field( array $field, int $post_id ): void {
		$object_type = $field['object_type'] ?? 'field';

		// Only render actual fields.
		if ( 'field' !== $object_type ) {
			return;
		}

		$field_type = $field['type'] ?? 'text';

		/*
		 * Field types that this class renders inline via its own
		 * `render_input()` switch. Anything outside this list (e.g.
		 * Pro types like `group`, `repeater`, `gallery`,
		 * `relationship`, `taxonomy`, `user`, `html`, plus the layout
		 * markers which never reach here anyway) must be delegated to
		 * its `FieldTypeInterface::render()` implementation instead,
		 * because the local switch has no `case` for them and would
		 * silently fall through to the `default:` branch — rendering
		 * a plain `<input type="text">` for a Group, Repeater, etc.
		 * (the bug this guard now fixes).
		 */
		$locally_handled_types = array(
			'text',
			'textarea',
			'number',
			'email',
			'url',
			'date',
			'select',
			'checkbox',
			'radio',
			'toggle',
			// 'image' was previously handled inline by `case 'image':` in
			// `render_input()`, but that path could not honour the
			// `multiple` flag. Image rendering is now delegated to
			// `ImageField::render()` (registered in the field-type
			// registry) which supports both single and multi-image mode.
			'file',
			'time',
			'datetime',
			'color',
			'wysiwyg',
		);

		if ( ! in_array( $field_type, $locally_handled_types, true ) ) {
			$registry = FieldTypeRegistry::get_instance();
			$type_obj = $registry->get( $field_type );

			if ( null !== $type_obj ) {
				// Pull the current value (some Pro types — Group,
				// Repeater, Gallery — read it as JSON-encoded /
				// nested data and decode internally; passing the raw
				// stored meta is correct).
				$meta_key = $field['name'] ?? '';
				$value    = '' !== $meta_key ? get_post_meta( $post_id, $meta_key, true ) : null;

				// Display-only types (`html`) and layout markers don't
				// own a meta key, so passing null preserves the prior
				// short-circuit behaviour for them.
				if ( ! $registry->is_field_storable( $field ) ) {
					$value = null;
				} elseif ( '' === $value || null === $value ) {
					$value = $type_obj->get_default_value( $field );
				}

				$type_obj->render( $field, $value, $post_id );
				return;
			}
		}

		$field_name  = $field['name'] ?? '';
		$field_label = $field['label'] ?? '';
		$placeholder = $field['placeholder'] ?? '';
		$description = $field['description'] ?? '';
		$required    = $field['required'] ?? false;
		$width       = $field['field_width'] ?? '100%';
		$char_limit  = $field['character_limit'] ?? null;

		if ( empty( $field_name ) ) {
			return;
		}

		// Get current value.
		$value = get_post_meta( $post_id, $field_name, true );

		// Use default if no value.
		if ( '' === $value || null === $value ) {
			$value = $field['default_value'] ?? '';
		}

		// Calculate width style. Mirrors AbstractFieldType::resolve_field_width_style()
		// — both paths emit `flex: 0 0 calc(N% - Xpx)` with a per-width shave
		// sized for the maximum siblings that fit on one row at that width, so
		// two 50% siblings, three 33.3% siblings, or four 25% siblings all fit
		// on a single flex row instead of wrapping due to wp-admin's reset
		// padding plus browser sub-pixel rounding. Empirically validated value:
		// `33.33% - 16px` is the minimum that fits 3 columns inside a CPT
		// metabox; smaller shaves leave the last sibling wrapped to its own row.
		$width_config = match ( $width ) {
			'75%'   => array( '75%', 8 ),
			'66.6%' => array( '66.66%', 12 ),
			'50%'   => array( '50%', 12 ),
			'33.3%' => array( '33.33%', 16 ),
			'25%'   => array( '25%', 16 ),
			default => null,
		};
		if ( null === $width_config ) {
			$width_style = 'width: 100%;';
		} else {
			[ $width_pct, $width_shave ] = $width_config;
			$width_style                 = sprintf(
				'flex: 0 0 calc(%1$s - %2$dpx); width: calc(%1$s - %2$dpx); max-width: calc(%1$s - %2$dpx);',
				$width_pct,
				$width_shave
			);
		}

		// Build wrapper data attributes. Maintains backward compatibility
		// with the prior hand-rolled string output, but the map form lets
		// the Pro plugin inject `data-rdcfe-conditional-logic` and similar
		// hooks via `rdcfe_field_wrapper_attrs`.
		$wrapper_attrs = array(
			'data-field-type'  => $field_type,
			'data-field-name'  => $field_name,
			'data-field-label' => $field_label,
		);
		if ( $required ) {
			$wrapper_attrs['data-required'] = 'true';
		}
		if ( 'url' === $field_type ) {
			$wrapper_attrs['data-validate-url'] = 'true';
		}
		if ( 'email' === $field_type ) {
			$wrapper_attrs['data-validate-email'] = 'true';
		}

		/** This filter is documented in app/Fields/FieldTypes/AbstractFieldType.php */
		$wrapper_attrs = apply_filters( 'rdcfe_field_wrapper_attrs', $wrapper_attrs, $field, $field_type );

		$wrapper_attr_pairs = array();
		foreach ( $wrapper_attrs as $key => $val ) {
			$wrapper_attr_pairs[] = esc_attr( (string) $key ) . '="' . esc_attr( (string) $val ) . '"';
		}
		$wrapper_attr_str = implode( ' ', $wrapper_attr_pairs );

		$wrapper_classes = array( 'rdcfe-field' );
		/** This filter is documented in app/Fields/FieldTypes/AbstractFieldType.php */
		$wrapper_classes = apply_filters( 'rdcfe_field_wrapper_classes', $wrapper_classes, $field, $field_type );

		?>
		<div class="<?php echo esc_attr( implode( ' ', $wrapper_classes ) ); ?>" style="<?php echo esc_attr( $width_style ); ?>" <?php echo $wrapper_attr_str; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Pairs already individually escaped above. ?>>
			<div class="rdcfe-field__label">
				<label for="<?php echo esc_attr( $field_name ); ?>">
					<?php echo esc_html( $field_label ); ?>
					<?php if ( $required ) : ?>
						<span class="rdcfe-required">*</span>
					<?php endif; ?>
				</label>
			</div>
			<div class="rdcfe-field__input">
				<?php $this->render_input( $field_type, $field_name, $value, $placeholder, $field, $char_limit ); ?>
				<div class="rdcfe-field__error" style="display: none;"></div>
			</div>
			<?php if ( ! empty( $description ) ) : ?>
				<div class="rdcfe-field__instructions"><?php echo esc_html( $description ); ?></div>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Render input based on field type.
	 *
	 * @param string               $type The field type.
	 * @param string               $name The field name.
	 * @param mixed                $value The current value.
	 * @param string               $placeholder The placeholder.
	 * @param array<string, mixed> $field The full field config.
	 * @param int|null             $char_limit Character limit.
	 * @return void
	 */
	private function render_input( string $type, string $name, mixed $value, string $placeholder, array $field, ?int $char_limit ): void {
		$maxlength = $char_limit ? 'maxlength="' . esc_attr( (string) $char_limit ) . '"' : '';

		switch ( $type ) {
			case 'textarea':
				?>
				<textarea
					id="<?php echo esc_attr( $name ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-textarea large-text"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
					rows="4"
					<?php echo $maxlength; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				><?php echo esc_textarea( (string) $value ); ?></textarea>
				<?php
				break;

			case 'number':
				$min  = $field['min'] ?? '';
				$max  = $field['max'] ?? '';
				$step = $field['step'] ?? '1';
				?>
				<input
					type="number"
					id="<?php echo esc_attr( $name ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-input regular-text"
					value="<?php echo esc_attr( (string) $value ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
					<?php echo '' !== $min ? 'min="' . esc_attr( $min ) . '"' : ''; ?>
					<?php echo '' !== $max ? 'max="' . esc_attr( $max ) . '"' : ''; ?>
					step="<?php echo esc_attr( $step ); ?>"
				/>
				<?php
				break;

			case 'email':
				?>
				<input
					type="email"
					id="<?php echo esc_attr( $name ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-input regular-text"
					value="<?php echo esc_attr( (string) $value ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
					<?php echo $maxlength; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				/>
				<?php
				break;

			case 'url':
				?>
				<input
					type="url"
					id="<?php echo esc_attr( $name ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-input regular-text"
					value="<?php echo esc_attr( (string) $value ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
				/>
				<?php
				break;

			case 'date':
				// Enqueue jQuery UI Datepicker (styles are in rdcfe-fields.css).
				wp_enqueue_script( 'jquery-ui-datepicker' );
				
				$date_value = (string) $value;
				// Ensure Y-m-d format.
				if ( ! empty( $date_value ) && ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date_value ) ) {
					$timestamp = strtotime( $date_value );
					if ( false !== $timestamp ) {
						$date_value = gmdate( 'Y-m-d', $timestamp );
					}
				}
				?>
				<div class="rdcfe-date-wrapper">
					<input
						type="text"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						class="rdcfe-input rdcfe-input--date rdcfe-datepicker"
						value="<?php echo esc_attr( $date_value ); ?>"
						placeholder="<?php echo esc_attr( $placeholder ?: 'YYYY-MM-DD' ); ?>"
						autocomplete="off"
						data-date-format="yy-mm-dd"
					/>
					<span class="rdcfe-date-icon dashicons dashicons-calendar-alt"></span>
				</div>
				<?php
				// Note: Datepicker initialization is handled by rdcfe-fields.js using data attributes.
				break;

			case 'select':
				$options     = $field['options'] ?? array();
				// Strict check for multiple - must be explicitly true or "1" or 1.
				$is_multiple = isset( $field['multiple'] ) && ( true === $field['multiple'] || '1' === $field['multiple'] || 1 === $field['multiple'] );
				$field_name  = $is_multiple ? $name . '[]' : $name;

				// Handle value - for multiple select, ensure it's an array.
				if ( $is_multiple ) {
					$selected_values = is_array( $value ) ? $value : ( ! empty( $value ) ? array( $value ) : array() );
				} else {
					$selected_values = is_array( $value ) ? ( $value[0] ?? '' ) : $value;
				}

				// If no value set, use checked options as defaults.
				if ( empty( $value ) || ( is_array( $value ) && empty( array_filter( $value ) ) ) ) {
					$default_values = array();
					foreach ( $options as $option ) {
						if ( ! empty( $option['checked'] ) ) {
							$default_values[] = $option['value'] ?? '';
						}
					}
					if ( ! empty( $default_values ) ) {
						$selected_values = $is_multiple ? $default_values : $default_values[0];
					}
				}
				?>
				<select
					id="<?php echo esc_attr( $name ); ?>"
					name="<?php echo esc_attr( $field_name ); ?>"
					class="rdcfe-select<?php echo $is_multiple ? ' rdcfe-select--multiple' : ''; ?>"
					<?php echo $is_multiple ? 'multiple="multiple"' : ''; ?>
				>
					<?php if ( ! empty( $placeholder ) && ! $is_multiple ) : ?>
						<option value=""><?php echo esc_html( $placeholder ); ?></option>
					<?php endif; ?>
					<?php foreach ( $options as $option ) : ?>
						<?php
						$opt_value    = $option['value'] ?? '';
						$is_selected  = $is_multiple
							? in_array( $opt_value, (array) $selected_values, true )
							: ( (string) $selected_values === (string) $opt_value );
						?>
						<option value="<?php echo esc_attr( $opt_value ); ?>" <?php selected( $is_selected, true ); ?>>
							<?php echo esc_html( $option['label'] ?? $opt_value ); ?>
						</option>
					<?php endforeach; ?>
				</select>
				<?php
				break;

			case 'checkbox':
				$options        = $field['options'] ?? array();
				$values         = is_array( $value ) ? $value : ( ! empty( $value ) ? array( $value ) : array() );
				$options_layout = $field['options_layout'] ?? 'vertical';

				// If no value set, use checked options as defaults.
				if ( empty( $values ) ) {
					foreach ( $options as $option ) {
						if ( ! empty( $option['checked'] ) ) {
							$values[] = $option['value'] ?? '';
						}
					}
				}
				?>
				<div class="rdcfe-checkbox-group<?php echo 'horizontal' === $options_layout ? ' rdcfe-checkbox-group--horizontal' : ''; ?>">
					<?php foreach ( $options as $option ) : ?>
						<label class="rdcfe-checkbox-item">
							<input
								type="checkbox"
								name="<?php echo esc_attr( $name ); ?>[]"
								value="<?php echo esc_attr( $option['value'] ?? '' ); ?>"
								<?php checked( in_array( $option['value'] ?? '', $values, true ) ); ?>
							/>
							<?php echo esc_html( $option['label'] ?? $option['value'] ?? '' ); ?>
						</label>
					<?php endforeach; ?>
				</div>
				<?php
				break;

			case 'radio':
				$options        = $field['options'] ?? array();
				$radio_value    = $value;
				$options_layout = $field['options_layout'] ?? 'vertical';

				// If no value set, use first checked option as default.
				if ( empty( $radio_value ) ) {
					foreach ( $options as $option ) {
						if ( ! empty( $option['checked'] ) ) {
							$radio_value = $option['value'] ?? '';
							break; // Only one can be checked for radio.
						}
					}
				}
				?>
				<div class="rdcfe-radio-group<?php echo 'horizontal' === $options_layout ? ' rdcfe-radio-group--horizontal' : ''; ?>">
					<?php foreach ( $options as $option ) : ?>
						<label class="rdcfe-radio-item">
							<input
								type="radio"
								name="<?php echo esc_attr( $name ); ?>"
								value="<?php echo esc_attr( $option['value'] ?? '' ); ?>"
								<?php checked( $radio_value, $option['value'] ?? '' ); ?>
							/>
							<?php echo esc_html( $option['label'] ?? $option['value'] ?? '' ); ?>
						</label>
					<?php endforeach; ?>
				</div>
				<?php
				break;

			case 'toggle':
				$is_checked = ! empty( $value ) && ( $value === '1' || $value === 1 || $value === true );
				$on_label   = $field['on_label'] ?? __( 'On', 'rox-dynamic-cpt-fields-engine' );
				$off_label  = $field['off_label'] ?? __( 'Off', 'rox-dynamic-cpt-fields-engine' );
				?>
				<label class="rdcfe-toggle">
					<input type="hidden" name="<?php echo esc_attr( $name ); ?>" value="0" />
					<input
						type="checkbox"
						class="rdcfe-toggle__input"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						value="1"
						<?php checked( $is_checked ); ?>
					/>
					<span class="rdcfe-toggle__slider"></span>
					<span class="rdcfe-toggle__labels">
						<span class="rdcfe-toggle__on"><?php echo esc_html( $on_label ); ?></span>
						<span class="rdcfe-toggle__off"><?php echo esc_html( $off_label ); ?></span>
					</span>
				</label>
				<?php
				break;

			case 'image':
				$image_url = $value ? wp_get_attachment_image_url( (int) $value, 'thumbnail' ) : '';
				?>
				<div class="rdcfe-image-field">
					<div class="rdcfe-image-field__preview-wrapper" <?php echo ! $value ? 'style="display:none;"' : ''; ?>>
						<div class="rdcfe-image-field__preview">
							<?php if ( $image_url ) : ?>
								<img src="<?php echo esc_url( $image_url ); ?>" alt="" />
							<?php endif; ?>
						</div>
						<a href="#" class="rdcfe-image-field__remove" title="<?php esc_attr_e( 'Remove', 'rox-dynamic-cpt-fields-engine' ); ?>">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
						</a>
					</div>
					<input
						type="hidden"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						value="<?php echo esc_attr( (string) $value ); ?>"
						class="rdcfe-image-field__input"
					/>
					<a href="#" class="rdcfe-btn rdcfe-image-field__select">
						<?php esc_html_e( 'Select Image', 'rox-dynamic-cpt-fields-engine' ); ?>
					</a>
				</div>
				<?php
				break;

			case 'file':
				$file_url = $value ? wp_get_attachment_url( (int) $value ) : '';
				?>
				<div class="rdcfe-file-field">
					<div class="rdcfe-file-field__info">
						<?php if ( $file_url ) : ?>
							<a href="<?php echo esc_url( $file_url ); ?>" target="_blank">
								<?php echo esc_html( basename( $file_url ) ); ?>
							</a>
						<?php endif; ?>
					</div>
					<input
						type="hidden"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						value="<?php echo esc_attr( (string) $value ); ?>"
						class="rdcfe-file-field__input"
					/>
					<div class="rdcfe-file-field__buttons">
						<a href="#" class="rdcfe-btn rdcfe-file-field__select">
							<?php esc_html_e( 'Select File', 'rox-dynamic-cpt-fields-engine' ); ?>
						</a>
						<a href="#" class="rdcfe-btn rdcfe-btn--danger rdcfe-file-field__remove" <?php echo ! $value ? 'style="display:none;"' : ''; ?>>
							<?php esc_html_e( 'Remove', 'rox-dynamic-cpt-fields-engine' ); ?>
						</a>
					</div>
				</div>
				<?php
				break;

			case 'time':
				$time_value = (string) $value;
				// Ensure H:i format.
				if ( ! empty( $time_value ) && ! preg_match( '/^\d{2}:\d{2}$/', $time_value ) ) {
					$timestamp = strtotime( $time_value );
					if ( false !== $timestamp ) {
						$time_value = gmdate( 'H:i', $timestamp );
					}
				}
				?>
				<input
					type="time"
					id="<?php echo esc_attr( $name ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-input rdcfe-input--time"
					value="<?php echo esc_attr( $time_value ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ?: 'HH:MM' ); ?>"
					step="60"
					style="max-width: 150px;"
				/>
				<?php
				break;

			case 'datetime':
				// Format datetime value for datetime-local input (Y-m-dTH:i).
				$datetime_value = '';
				if ( ! empty( $value ) ) {
					$value_str = (string) $value;
					// Convert Y-m-d H:i to Y-m-dTH:i format.
					if ( preg_match( '/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/', $value_str, $matches ) ) {
						$datetime_value = $matches[1] . 'T' . $matches[2];
					} elseif ( preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value_str ) ) {
						$datetime_value = $value_str;
					} else {
						$timestamp = strtotime( $value_str );
						if ( false !== $timestamp ) {
							$datetime_value = gmdate( 'Y-m-d\TH:i', $timestamp );
						}
					}
				}
				?>
				<div class="rdcfe-datetime-wrapper">
					<input
						type="datetime-local"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						class="rdcfe-input rdcfe-input--datetime"
						value="<?php echo esc_attr( $datetime_value ); ?>"
						step="60"
					/>
				</div>
				<?php
				break;

			case 'color':
				// Enqueue WordPress color picker.
				wp_enqueue_style( 'wp-color-picker' );
				wp_enqueue_script( 'wp-color-picker' );
				$color_field_id  = 'rdcfe_color_' . sanitize_key( $name );
				$default_color   = $field['default_value'] ?? '';
				$current_color   = ! empty( $value ) ? (string) $value : $default_color;
				?>
				<input
					type="text"
					id="<?php echo esc_attr( $color_field_id ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-color-field"
					value="<?php echo esc_attr( $current_color ); ?>"
					data-default-color="<?php echo esc_attr( $default_color ); ?>"
				/>
				<?php
				// Note: Color picker initialization is handled by rdcfe-fields.js using data-default-color attribute.
				break;

			case 'wysiwyg':
				// Use unique editor ID - must be lowercase and no special chars.
				$editor_id = 'rdcfe_' . preg_replace( '/[^a-z0-9_]/', '', strtolower( $name ) );
				$rows      = $field['rows'] ?? 10;
				$settings  = array(
					'textarea_name' => $name,
					'textarea_rows' => $rows,
					'media_buttons' => $field['media_upload'] ?? true,
					'teeny'         => ( $field['toolbar'] ?? 'full' ) === 'basic',
					'quicktags'     => $field['quicktags'] ?? true,
					'editor_class'  => 'rdcfe-wysiwyg',
					'tinymce'       => true,
					'wpautop'       => true,
				);
				wp_editor( (string) $value, $editor_id, $settings );
				
				break;

			case 'text':
			default:
				?>
				<input
					type="text"
					id="<?php echo esc_attr( $name ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-input regular-text"
					value="<?php echo esc_attr( (string) $value ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
					<?php echo $maxlength; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				/>
				<?php
				break;
		}
	}

	/**
	 * Save meta box data.
	 *
	 * @param int      $post_id The post ID.
	 * @param \WP_Post $post The post object.
	 * @return void
	 */
	public function save_meta_boxes( int $post_id, \WP_Post $post ): void {
		// Verify nonce.
		if ( ! isset( $_POST['rdcfe_cpt_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rdcfe_cpt_meta_nonce'] ) ), 'rdcfe_save_cpt_meta_fields' ) ) {
			return;
		}

		// Check autosave.
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		// Check permissions.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		// Check revision.
		if ( 'revision' === $post->post_type ) {
			return;
		}

		// Get meta fields for this post type.
		$post_type = $post->post_type;
		if ( ! isset( $this->cpt_meta_fields[ $post_type ] ) ) {
			return;
		}

		$meta_fields = $this->cpt_meta_fields[ $post_type ]['meta_fields'];

		// Server-side validation.
		$validation_errors = $this->validate_fields( $meta_fields );
		if ( ! empty( $validation_errors ) ) {
			// Store validation errors in transient to display later.
			set_transient( 'rdcfe_validation_errors_' . $post_id, $validation_errors, 60 );

			// Add admin notice hook.
			add_filter( 'redirect_post_location', array( $this, 'add_validation_error_query_arg' ), 99 );

			return; // Don't save if validation fails.
		}

		$registry = FieldTypeRegistry::get_instance();

		// Save each field.
		foreach ( $meta_fields as $field ) {
			// Skip layout markers (tab/accordion/endpoint) AND display-only
			// field types (html) — neither has a meta key to write.
			if ( ! $registry->is_field_storable( $field ) ) {
				continue;
			}

			$field_name = $field['name'] ?? '';
			if ( empty( $field_name ) ) {
				continue;
			}

			$field_type = $field['type'] ?? 'text';

			// Get value from POST.
			// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce verified above, sanitization happens in sanitize_value().
			$value = isset( $_POST[ $field_name ] ) ? wp_unslash( $_POST[ $field_name ] ) : null;

			// Sanitize based on type.
			$value = $this->sanitize_value( $value, $field_type, $field );

			// Save or delete.
			if ( '' === $value || null === $value || ( is_array( $value ) && empty( $value ) ) ) {
				delete_post_meta( $post_id, $field_name );
			} else {
				update_post_meta( $post_id, $field_name, $value );
			}
		}

		/**
		 * Fires after CPT meta fields are saved.
		 *
		 * @since 1.0.0
		 *
		 * @param int      $post_id The post ID.
		 * @param \WP_Post $post The post object.
		 * @param array    $meta_fields The meta fields configuration.
		 */
		do_action( 'rdcfe_cpt_meta_fields_saved', $post_id, $post, $meta_fields );
	}

	/**
	 * Validate fields server-side.
	 *
	 * @param array<array<string, mixed>> $meta_fields The meta fields.
	 * @return array<string, string> Validation errors (field_name => error_message).
	 */
	private function validate_fields( array $meta_fields ): array {
		$errors   = array();
		$registry = FieldTypeRegistry::get_instance();

		foreach ( $meta_fields as $field ) {
			// Layout markers and display-only fields don't accept input,
			// so they have nothing to validate.
			if ( ! $registry->is_field_storable( $field ) ) {
				continue;
			}

			$field_name  = $field['name'] ?? '';
			$field_label = $field['label'] ?? $field_name;
			$field_type  = $field['type'] ?? 'text';
			$required    = $field['required'] ?? false;

			if ( empty( $field_name ) ) {
				continue;
			}

			// Get value from POST.
			// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce verified in save_meta_boxes, value validated below.
			$value = isset( $_POST[ $field_name ] ) ? wp_unslash( $_POST[ $field_name ] ) : '';

			// Handle arrays (checkboxes).
			if ( is_array( $value ) ) {
				$value = array_filter( $value );
				$is_empty = empty( $value );
			} else {
				$value = trim( (string) $value );
				$is_empty = '' === $value;
			}

			// Required validation.
			if ( $required && $is_empty ) {
				$errors[ $field_name ] = sprintf(
					/* translators: %s: field label */
					__( '%s is required.', 'rox-dynamic-cpt-fields-engine' ),
					$field_label
				);
				continue;
			}

			// Skip further validation if empty and not required.
			if ( $is_empty ) {
				continue;
			}

			// URL validation.
			if ( 'url' === $field_type && ! filter_var( $value, FILTER_VALIDATE_URL ) ) {
				$errors[ $field_name ] = sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid URL.', 'rox-dynamic-cpt-fields-engine' ),
					$field_label
				);
			}

			// Email validation.
			if ( 'email' === $field_type && ! is_email( $value ) ) {
				$errors[ $field_name ] = sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid email address.', 'rox-dynamic-cpt-fields-engine' ),
					$field_label
				);
			}
		}

		/**
		 * Filters the validation errors collected for a meta-fields submission.
		 *
		 * Pro plugins hook into this filter to add regex / pattern based
		 * validation errors. Passing an empty array always re-allows the save.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string, string>             $errors      Map of field_name => error_message.
		 * @param array<int, array<string, mixed>>  $meta_fields The full meta-fields config for this CPT.
		 */
		return (array) apply_filters( 'rdcfe_field_validation_errors', $errors, $meta_fields );
	}

	/**
	 * Add query arg for validation error.
	 *
	 * @param string $location The redirect location.
	 * @return string Modified location.
	 */
	public function add_validation_error_query_arg( string $location ): string {
		return add_query_arg( 'rdcfe_validation_error', '1', $location );
	}

	/**
	 * Sanitize value based on field type.
	 *
	 * @param mixed               $value The value to sanitize.
	 * @param string              $type The field type.
	 * @param array<string,mixed> $field The full field configuration.
	 * @return mixed
	 */
	private function sanitize_value( mixed $value, string $type, array $field = array() ): mixed {
		if ( null === $value ) {
			return '';
		}

		return match ( $type ) {
			'textarea'      => sanitize_textarea_field( $value ),
			'number'        => is_numeric( $value ) ? floatval( $value ) : '',
			'email'         => sanitize_email( $value ),
			'url'           => esc_url_raw( $value ),
			'date'          => preg_match( '/^\d{4}-\d{2}-\d{2}$/', sanitize_text_field( $value ) ) ? sanitize_text_field( $value ) : '',
			'checkbox'      => is_array( $value ) ? array_map( 'sanitize_text_field', $value ) : array(),
			'select'        => ! empty( $field['multiple'] ) && is_array( $value )
				? array_map( 'sanitize_text_field', $value )
				: sanitize_text_field( is_array( $value ) ? ( $value[0] ?? '' ) : $value ),
			'toggle'        => $value ? '1' : '',
			'image'         => $this->sanitize_image_value( $value, $field ),
			'file'          => absint( $value ),
			default         => sanitize_text_field( $value ),
		};
	}

	/**
	 * Sanitize an image field value, honouring the `multiple` flag so the
	 * value may be either a single attachment ID or a comma-separated
	 * list of attachment IDs.
	 *
	 * @param mixed               $value The raw value (int, CSV string, or array).
	 * @param array<string,mixed> $field The full field configuration.
	 * @return int|string Single ID, or CSV of IDs when `multiple` is on.
	 */
	private function sanitize_image_value( mixed $value, array $field ): int|string {
		// Delegate to the field type so single/multi logic lives in one
		// place (`ImageField::sanitize`). Falls back to absint() if the
		// registry hasn't been initialised yet (e.g. very early hooks).
		$registry = FieldTypeRegistry::get_instance();
		$type_obj = $registry->get( 'image' );

		if ( null !== $type_obj && method_exists( $type_obj, 'sanitize' ) ) {
			$sanitized = $type_obj->sanitize( $value, $field );
			return is_int( $sanitized ) || is_string( $sanitized ) ? $sanitized : 0;
		}

		return absint( $value );
	}

	/**
	 * Register meta fields for REST API.
	 *
	 * @return void
	 */
	public function register_meta_for_rest(): void {
		$registry = FieldTypeRegistry::get_instance();

		foreach ( $this->cpt_meta_fields as $post_type => $cpt_config ) {
			$meta_fields = $cpt_config['meta_fields'];

			foreach ( $meta_fields as $field ) {
				// Layout markers and display-only fields are not stored,
				// so they have no postmeta key to register.
				if ( ! $registry->is_field_storable( $field ) ) {
					continue;
				}

				$field_name   = $field['name'] ?? '';
				$show_in_rest = $field['show_in_rest'] ?? false;
				$meta_type    = $this->get_rest_type( $field['type'] ?? 'text', $field );

				if ( empty( $field_name ) ) {
					continue;
				}

				register_post_meta(
					$post_type,
					$field_name,
					array(
						'type'          => $meta_type,
						'single'        => true,
						'show_in_rest'  => MetaRegistration::normalize_show_in_rest( $show_in_rest, $meta_type ),
						'auth_callback' => fn() => current_user_can( 'edit_posts' ),
					)
				);
			}
		}
	}

	/**
	 * Get REST API type for a field type.
	 *
	 * @param string $field_type The field type.
	 * @return string
	 */
	private function get_rest_type( string $field_type, array $field = array() ): string {
		return match ( $field_type ) {
			'number'   => 'number',
			'toggle'   => 'boolean',
			'checkbox' => 'array',
			// Image stores CSV when `multiple` is on, otherwise an int.
			'image'    => ! empty( $field['multiple'] ) ? 'string' : 'integer',
			'file'     => 'integer',
			default    => 'string',
		};
	}

}

