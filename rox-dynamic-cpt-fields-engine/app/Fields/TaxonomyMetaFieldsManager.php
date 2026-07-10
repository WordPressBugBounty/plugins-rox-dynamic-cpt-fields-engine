<?php
/**
 * Taxonomy Meta Fields Manager
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
 * Class TaxonomyMetaFieldsManager
 *
 * Handles meta fields for taxonomy terms.
 * Supports Tab (Horizontal/Vertical), Accordion, and simple field layouts.
 */
class TaxonomyMetaFieldsManager {

	/**
	 * Config repository.
	 *
	 * @var ConfigRepository
	 */
	private ConfigRepository $config_repository;

	/**
	 * Taxonomy configs with meta fields.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private array $taxonomy_meta_fields = array();

	/**
	 * Constructor.
	 *
	 * @param ConfigRepository|null $config_repository Config repository instance.
	 */
	public function __construct( ?ConfigRepository $config_repository = null ) {
		$this->config_repository = $config_repository ?? new ConfigRepository();
	}

	/**
	 * Initialize the manager.
	 *
	 * @return void
	 */
	public function init(): void {
		// Load taxonomy meta fields early.
		add_action( 'init', array( $this, 'load_taxonomy_meta_fields' ), 15 );

		// Register hooks for taxonomy forms.
		add_action( 'init', array( $this, 'register_taxonomy_hooks' ), 20 );

		// Enqueue scripts.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Load taxonomy configurations that have meta fields.
	 *
	 * @return void
	 */
	public function load_taxonomy_meta_fields(): void {
		$taxonomies = $this->config_repository->get_all( 'taxonomy', 'publish' );

		foreach ( $taxonomies as $taxonomy ) {
			$data        = $taxonomy['data'] ?? array();
			$meta_fields = $data['meta_fields'] ?? array();
			$slug        = $data['slug'] ?? '';

			if ( ! empty( $meta_fields ) && ! empty( $slug ) ) {
				$this->taxonomy_meta_fields[ $slug ] = array(
					'config_id'   => $taxonomy['id'],
					'title'       => $data['label'] ?? $slug,
					'meta_fields' => $meta_fields,
				);
			}
		}
	}

	/**
	 * Register hooks for each taxonomy with meta fields.
	 *
	 * @return void
	 */
	public function register_taxonomy_hooks(): void {
		foreach ( $this->taxonomy_meta_fields as $taxonomy => $config ) {
			// Add form fields (new term).
			add_action( "{$taxonomy}_add_form_fields", array( $this, 'render_add_form_fields' ), 10, 1 );

			// Edit form fields (existing term).
			add_action( "{$taxonomy}_edit_form_fields", array( $this, 'render_edit_form_fields' ), 10, 2 );

			// Save term meta on create.
			add_action( "created_{$taxonomy}", array( $this, 'save_term_meta' ), 10, 2 );

			// Save term meta on edit.
			add_action( "edited_{$taxonomy}", array( $this, 'save_term_meta' ), 10, 2 );

			// Register meta for REST API.
			$this->register_term_meta_for_rest( $taxonomy, $config['meta_fields'] );
		}
	}

	/**
	 * Enqueue admin scripts for taxonomy term pages.
	 *
	 * @param string $hook The current admin page hook.
	 * @return void
	 */
	public function enqueue_scripts( string $hook ): void {
		// Only on taxonomy term pages.
		if ( ! in_array( $hook, array( 'edit-tags.php', 'term.php' ), true ) ) {
			return;
		}

		// Get current taxonomy.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$taxonomy = isset( $_GET['taxonomy'] ) ? sanitize_key( $_GET['taxonomy'] ) : '';

		if ( empty( $taxonomy ) || ! isset( $this->taxonomy_meta_fields[ $taxonomy ] ) ) {
			return;
		}

		$meta_fields = $this->taxonomy_meta_fields[ $taxonomy ]['meta_fields'];

		// Check field types needed.
		$has_media_fields    = false;
		$has_multiple_select = false;

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
		// Enhanced styling is provided via rdcfe-taxonomy-layout.css.
		unset( $has_multiple_select ); // Silence unused variable warning.

		// Media fields are handled by rdcfe-fields.js
		if ( $has_media_fields ) {
			wp_enqueue_media();
		}
	}

	/**
	 * Render fields on the Add New Term form.
	 *
	 * @param string $taxonomy The taxonomy slug.
	 * @return void
	 */
	public function render_add_form_fields( string $taxonomy ): void {
		if ( ! isset( $this->taxonomy_meta_fields[ $taxonomy ] ) ) {
			return;
		}

		$meta_fields = $this->taxonomy_meta_fields[ $taxonomy ]['meta_fields'];

		wp_nonce_field( 'rdcfe_save_taxonomy_meta_fields', 'rdcfe_taxonomy_meta_nonce' );

		// `render_meta_fields()` chooses its own outer wrapper based on layout
		// type, so we don't double-wrap here.
		$this->render_meta_fields( $meta_fields, 0, 'add', $taxonomy );
	}

	/**
	 * Render fields on the Edit Term form.
	 *
	 * @param \WP_Term $term The term object.
	 * @param string   $taxonomy The taxonomy slug.
	 * @return void
	 */
	public function render_edit_form_fields( \WP_Term $term, string $taxonomy ): void {
		if ( ! isset( $this->taxonomy_meta_fields[ $taxonomy ] ) ) {
			return;
		}

		$meta_fields = $this->taxonomy_meta_fields[ $taxonomy ]['meta_fields'];

		wp_nonce_field( 'rdcfe_save_taxonomy_meta_fields', 'rdcfe_taxonomy_meta_nonce' );

		// `render_meta_fields()` chooses its own outer wrapper based on layout
		// type, so we don't double-wrap here.
		$this->render_meta_fields( $meta_fields, $term->term_id, 'edit', $taxonomy );
	}

	/**
	 * Public reusable renderer for an arbitrary meta-fields array on a term
	 * form. Picks the right outer wrapper based on form context and layout
	 * type so taxonomy meta and field group fields share the same markup,
	 * styling, asset pipeline, and tab/accordion support.
	 *
	 *  - Edit + simple: rows are emitted directly into the surrounding
	 *    `<table class="form-table">` (no extra wrapper, no extra padding).
	 *  - Edit + tabs/accordions: wrapped in a single `<tr><td colspan="2">`
	 *    since complex layouts can't fit the two-column pattern.
	 *  - Add (any layout): wrapped in a div container that matches the
	 *    div-based add term form.
	 *
	 * @param array<array<string, mixed>> $meta_fields The fields to render.
	 * @param int                         $term_id Term ID (0 on add form).
	 * @param string                      $context Either `'add'` or `'edit'`.
	 * @param string                      $taxonomy Taxonomy slug (used for unique IDs).
	 * @return void
	 */
	public function render_meta_fields( array $meta_fields, int $term_id, string $context, string $taxonomy ): void {
		if ( empty( $meta_fields ) ) {
			return;
		}

		// Ensure shared assets (field CSS/JS + taxonomy layout CSS) are loaded.
		FieldAssetsManager::get_instance()->enqueue_taxonomy_layout();

		$layout      = $this->parse_field_layout( $meta_fields );
		$layout_type = $layout['type'] ?? 'simple';

		if ( 'edit' === $context && 'simple' === $layout_type ) {
			$this->render_layout( $layout, $term_id, $context, $taxonomy );
			return;
		}

		if ( 'edit' === $context ) {
			echo '<tr class="form-field rdcfe-taxonomy-meta-row"><td colspan="2">';
			echo '<div class="rdcfe-taxonomy-meta-fields rdcfe-taxonomy-edit-form">';
			$this->render_layout( $layout, $term_id, $context, $taxonomy );
			echo '</div>';
			echo '</td></tr>';
			return;
		}

		echo '<div class="rdcfe-taxonomy-meta-fields rdcfe-taxonomy-add-form">';
		$this->render_layout( $layout, $term_id, $context, $taxonomy );
		echo '</div>';
	}

	/**
	 * Public reusable saver for an arbitrary meta-fields array against a term.
	 * Reuses the same per-type sanitize logic as taxonomy-config meta fields,
	 * so values written by Field Groups follow identical rules and are stored
	 * via `update_term_meta()` / `delete_term_meta()`.
	 *
	 * Caller is responsible for verifying its own nonce and capability checks
	 * before invoking this method.
	 *
	 * @param int                         $term_id Term ID.
	 * @param array<array<string, mixed>> $meta_fields The fields to save.
	 * @return void
	 */
	public function save_meta_fields( int $term_id, array $meta_fields ): void {
		$registry = FieldTypeRegistry::get_instance();

		foreach ( $meta_fields as $field ) {
			// Skip layout markers (tab/accordion/endpoint) AND display-only
			// field types (html) — neither has a term meta key to write.
			if ( ! $registry->is_field_storable( $field ) ) {
				continue;
			}

			$field_name = $field['name'] ?? '';
			if ( empty( $field_name ) ) {
				continue;
			}

			$field_type = $field['type'] ?? 'text';

			// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Caller verifies nonce; sanitization happens via sanitize_value().
			$value = isset( $_POST[ $field_name ] ) ? wp_unslash( $_POST[ $field_name ] ) : null;

			$value = $this->sanitize_value( $value, $field_type, $field );

			if ( '' === $value || null === $value || ( is_array( $value ) && empty( $value ) ) ) {
				delete_term_meta( $term_id, $field_name );
			} else {
				update_term_meta( $term_id, $field_name, $value );
			}
		}
	}

	/**
	 * Parse meta fields into structured layout.
	 *
	 * @param array<array<string, mixed>> $meta_fields The meta fields array.
	 * @return array<string, mixed> Structured layout data.
	 */
	private function parse_field_layout( array $meta_fields ): array {
		$layout = array(
			'type'     => 'simple',
			'tab_type' => 'horizontal',
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
					// Push when the current section has fields OR is itself
					// a tab/accordion marker, so consecutive markers don't
					// silently swallow each other.
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					$has_tabs        = true;
					$current_section = array(
						'type'   => 'tab',
						'tab'    => $field,
						'fields' => array(),
					);

					if ( null === $first_tab ) {
						$first_tab          = $field;
						$layout['tab_type'] = ( 'vertical' === ( $field['layout'] ?? 'horizontal' ) ) ? 'vertical' : 'horizontal';
					}
					break;

				case 'accordion':
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					$has_accordions  = true;
					$current_section = array(
						'type'      => 'accordion',
						'accordion' => $field,
						'fields'    => array(),
					);
					break;

				case 'endpoint':
					if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
						$layout['sections'][] = $current_section;
					}

					// Push an explicit break marker. The renderer treats this
					// as a hard block separator, so a sequence like
					// `tab → endpoint → accordion` produces a tab strip
					// FOLLOWED BY an accordion list — not a tab strip with
					// the accordion content silently flattened above it
					// (which was the bug in the previous "tabs OR
					// accordions, exclusive" dispatcher).
					$layout['sections'][] = array(
						'type'   => 'break',
						'fields' => array(),
					);

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

		if ( ! empty( $current_section['fields'] ) || 'tab' === $current_section['type'] || 'accordion' === $current_section['type'] ) {
			$layout['sections'][] = $current_section;
		}

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
	 * Render layout based on type.
	 *
	 * Walks `$layout['sections']` once and groups CONSECUTIVE same-kind
	 * sections into "blocks" (a run of tab sections becomes one tab strip,
	 * a run of accordion sections becomes one accordion list, a run of
	 * standalone field sections becomes one flat fields-container). Each
	 * block is then emitted in document order, so a sequence like
	 * `tab → endpoint → accordion` renders as a tab strip FOLLOWED BY an
	 * accordion list — not a tab strip with the accordion's fields
	 * silently flattened out into a standalone strip above it (which was
	 * the bug in the previous "tabs OR accordions, exclusive" dispatcher).
	 *
	 * @param array<string, mixed> $layout The layout configuration.
	 * @param int                  $term_id The term ID (0 for new term).
	 * @param string               $context The form context (add/edit).
	 * @param string               $taxonomy The taxonomy slug.
	 * @return void
	 */
	private function render_layout( array $layout, int $term_id, string $context, string $taxonomy ): void {
		$sections  = $layout['sections'] ?? array();
		$tab_type  = $layout['tab_type'] ?? 'horizontal';
		$unique_id = 'rdcfe_tax_' . $taxonomy . '_' . $context;

		if ( empty( $sections ) ) {
			echo '<p>' . esc_html__( 'No fields configured.', 'rox-dynamic-cpt-fields-engine' ) . '</p>';
			return;
		}

		// Detect whether this layout has any complex blocks. A purely
		// simple layout (no tabs/accordions) takes the form-table-friendly
		// path so edit-screen rows align with the native Name/Slug fields.
		$has_complex = false;
		foreach ( $sections as $section ) {
			$section_type = $section['type'] ?? 'fields';
			if ( 'tab' === $section_type || 'accordion' === $section_type ) {
				$has_complex = true;
				break;
			}
		}

		if ( ! $has_complex ) {
			$this->render_simple_layout( $sections, $term_id, $context );
			return;
		}

		$this->render_section_blocks( $sections, $tab_type, $unique_id, $term_id, $context );
	}

	/**
	 * Walk parsed sections in order and emit each consecutive run as a
	 * block (tabs strip / accordions list / standalone fields).
	 *
	 * Splitting into runs (rather than re-grouping all tabs together,
	 * then all accordions, etc.) preserves the author's intended ordering
	 * — e.g. `tab → endpoint → accordion → accordion` renders one tab
	 * strip followed by one accordion list with two items, exactly as
	 * configured in the metabox builder. Each tab/accordion block gets a
	 * unique DOM ID derived from `$unique_id` plus a running block index,
	 * so multiple strips/lists on the same screen never collide.
	 *
	 * @param array<int, array<string, mixed>> $sections   Parsed sections in document order.
	 * @param string                           $tab_type   'horizontal'|'vertical' (applies to tab blocks only).
	 * @param string                           $unique_id  DOM-safe ID prefix.
	 * @param int                              $term_id    The term ID.
	 * @param string                           $context    The form context.
	 * @return void
	 */
	private function render_section_blocks( array $sections, string $tab_type, string $unique_id, int $term_id, string $context ): void {
		$count       = count( $sections );
		$index       = 0;
		$block_index = 0;

		while ( $index < $count ) {
			$section_type = $sections[ $index ]['type'] ?? 'fields';

			// Hard block separator emitted by the parser whenever the author
			// dropped an `endpoint` marker. Consume it and let the outer
			// loop start a fresh block — never merge across a break.
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
				$this->render_tabs_block( $run, $tab_type, $unique_id . '_b' . $block_index, $term_id, $context );
			} elseif ( 'accordion' === $section_type ) {
				$run = array();
				while ( $index < $count && 'accordion' === ( $sections[ $index ]['type'] ?? '' ) ) {
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_accordions_block( $run, $unique_id . '_b' . $block_index, $term_id, $context );
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
				$this->render_fields_block( $run, $term_id, $context );
			}

			++$block_index;
		}
	}

	/**
	 * Render a run of standalone field sections as one flat fields grid.
	 *
	 * @param array<int, array<string, mixed>> $sections Section subset (all `type === 'fields'`).
	 * @param int                              $term_id  The term ID.
	 * @param string                           $context  The form context.
	 * @return void
	 */
	private function render_fields_block( array $sections, int $term_id, string $context ): void {
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

		echo '<div class="rdcfe-taxonomy-fields-container rdcfe-taxonomy-standalone-fields">';
		foreach ( $sections as $section ) {
			foreach ( $section['fields'] ?? array() as $field ) {
				$this->render_field( $field, $term_id, $context, 'div' );
			}
		}
		echo '</div>';
	}

	/**
	 * Render simple layout.
	 *
	 * On the edit screen each field is emitted as its own `<tr>` row directly
	 * into the surrounding `<table class="form-table">`, so labels sit in the
	 * left column and inputs in the right — matching the native Name/Slug/
	 * Description rows. The add screen keeps the existing div-stacked layout.
	 *
	 * @param array<array<string, mixed>> $sections The sections.
	 * @param int                         $term_id The term ID.
	 * @param string                      $context The form context.
	 * @return void
	 */
	private function render_simple_layout( array $sections, int $term_id, string $context ): void {
		if ( 'edit' === $context ) {
			foreach ( $sections as $section ) {
				foreach ( $section['fields'] ?? array() as $field ) {
					$this->render_field( $field, $term_id, $context, 'row' );
				}
			}
			return;
		}

		echo '<div class="rdcfe-taxonomy-fields-container">';
		foreach ( $sections as $section ) {
			foreach ( $section['fields'] ?? array() as $field ) {
				$this->render_field( $field, $term_id, $context, 'div' );
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
	 * @param int                              $term_id   The term ID.
	 * @param string                           $context   The form context.
	 * @return void
	 */
	private function render_tabs_block( array $sections, string $tab_type, string $unique_id, int $term_id, string $context ): void {
		if ( empty( $sections ) ) {
			return;
		}

		$layout_class = 'vertical' === $tab_type ? 'rdcfe-taxonomy-tabs--vertical' : 'rdcfe-taxonomy-tabs--horizontal';

		echo '<div class="rdcfe-taxonomy-tabs ' . esc_attr( $layout_class ) . '" data-tabs-id="' . esc_attr( $unique_id ) . '">';

		echo '<div class="rdcfe-taxonomy-tabs__nav" role="tablist">';
		foreach ( $sections as $tab_index => $section ) {
			$tab_meta     = $section['tab'] ?? array();
			$tab_id       = $unique_id . '_tab_' . $tab_index;
			$panel_id     = $unique_id . '_panel_' . $tab_index;
			$is_active    = 0 === $tab_index;
			$tab_label    = $tab_meta['label'] ?? sprintf( '%s %d', __( 'Tab', 'rox-dynamic-cpt-fields-engine' ), $tab_index + 1 );
			$active_class = $is_active ? 'rdcfe-taxonomy-tabs__tab--active' : '';

			printf(
				'<button type="button" class="rdcfe-taxonomy-tabs__tab %s" role="tab" id="%s" aria-selected="%s" aria-controls="%s" data-tab-index="%d">%s</button>',
				esc_attr( $active_class ),
				esc_attr( $tab_id ),
				$is_active ? 'true' : 'false',
				esc_attr( $panel_id ),
				(int) $tab_index,
				esc_html( $tab_label )
			);
		}
		echo '</div>';

		echo '<div class="rdcfe-taxonomy-tabs__panels">';
		foreach ( $sections as $tab_index => $section ) {
			$tab_id       = $unique_id . '_tab_' . $tab_index;
			$panel_id     = $unique_id . '_panel_' . $tab_index;
			$is_active    = 0 === $tab_index;
			$active_class = $is_active ? 'rdcfe-taxonomy-tabs__panel--active' : '';
			$hidden       = ! $is_active ? 'hidden' : '';

			printf(
				'<div class="rdcfe-taxonomy-tabs__panel %s" role="tabpanel" id="%s" aria-labelledby="%s" %s>',
				esc_attr( $active_class ),
				esc_attr( $panel_id ),
				esc_attr( $tab_id ),
				esc_attr( $hidden )
			);

			echo '<div class="rdcfe-taxonomy-fields-container">';
			foreach ( $section['fields'] ?? array() as $field ) {
				$this->render_field( $field, $term_id, $context, 'div' );
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
	 * @param int                              $term_id   The term ID.
	 * @param string                           $context   The form context.
	 * @return void
	 */
	private function render_accordions_block( array $sections, string $unique_id, int $term_id, string $context ): void {
		if ( empty( $sections ) ) {
			return;
		}

		echo '<div class="rdcfe-taxonomy-accordions" data-accordion-id="' . esc_attr( $unique_id ) . '">';

		foreach ( $sections as $accordion_index => $section ) {
			$accordion       = $section['accordion'] ?? array();
			$fields          = $section['fields'] ?? array();
			$accordion_label = $accordion['label'] ?? sprintf( '%s %d', __( 'Section', 'rox-dynamic-cpt-fields-engine' ), $accordion_index + 1 );
			$header_id       = $unique_id . '_accordion_header_' . $accordion_index;
			$content_id      = $unique_id . '_accordion_content_' . $accordion_index;
			$is_open         = 0 === $accordion_index;

			echo '<div class="rdcfe-taxonomy-accordion' . ( $is_open ? ' rdcfe-taxonomy-accordion--open' : '' ) . '">';
			printf(
				'<button type="button" class="rdcfe-taxonomy-accordion__header" id="%s" aria-expanded="%s" aria-controls="%s" data-accordion-index="%d">',
				esc_attr( $header_id ),
				$is_open ? 'true' : 'false',
				esc_attr( $content_id ),
				(int) $accordion_index
			);
			echo '<span class="rdcfe-taxonomy-accordion__title">' . esc_html( $accordion_label ) . '</span>';
			echo '<span class="rdcfe-taxonomy-accordion__icon"></span>';
			echo '</button>';

			printf(
				'<div class="rdcfe-taxonomy-accordion__content" id="%s" role="region" aria-labelledby="%s" %s>',
				esc_attr( $content_id ),
				esc_attr( $header_id ),
				esc_attr( ! $is_open ? 'hidden' : '' )
			);
			echo '<div class="rdcfe-taxonomy-fields-container">';
			foreach ( $fields as $field ) {
				$this->render_field( $field, $term_id, $context, 'div' );
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
	 * Supports two render modes:
	 *  - `row`: emits a `<tr><th>label</th><td>input</td></tr>` row to match
	 *    WordPress's native form-table two-column layout. Used on the term
	 *    edit page for simple (non-tab/accordion) layouts so our fields sit
	 *    flush next to the default Name/Slug/Description rows.
	 *  - `div`: emits the existing stacked div layout. Used on the term add
	 *    form (which is div-based) and inside tab/accordion panels.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @param int                  $term_id The term ID (0 for new term).
	 * @param string               $context The form context (add/edit).
	 * @param string               $render_mode Either `'row'` or `'div'`.
	 * @return void
	 */
	private function render_field( array $field, int $term_id, string $context, string $render_mode = 'div' ): void {
		$object_type = $field['object_type'] ?? 'field';

		if ( 'field' !== $object_type ) {
			return;
		}

		$field_type = $field['type'] ?? 'text';

		/*
		 * Field types that this class renders inline via its own
		 * `render_input()` switch. Anything outside this list (e.g.
		 * Pro types like `group`, `repeater`, `gallery`,
		 * `relationship`, `taxonomy`, `user`, `html`) must be
		 * delegated to its `FieldTypeInterface::render()` impl
		 * instead, because the local switch has no `case` for them
		 * and would silently fall through to the `default:` branch —
		 * rendering a plain `<input type="text">` for a Group,
		 * Repeater, etc. (the same bug `CPTMetaFieldsManager` had).
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
			// 'image' is now delegated to ImageField::render() so multi-
			// image mode works on taxonomy term edit screens too.
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
				$meta_key   = $field['name'] ?? '';
				$value      = ( '' !== $meta_key && $term_id > 0 )
					? get_term_meta( $term_id, $meta_key, true )
					: null;
				$is_storable = $registry->is_field_storable( $field );

				if ( ! $is_storable ) {
					$value = null;
				} elseif ( '' === $value || null === $value ) {
					$value = $type_obj->get_default_value( $field );
				}

				// In `row` render mode the surrounding form is a
				// `<table>`, so non-row content must sit inside a
				// `<tr><td colspan="2">` cell to keep the table
				// structure valid (Quick Edit and the term `add`
				// form rely on this).
				if ( 'row' === $render_mode ) {
					echo '<tr class="rdcfe-taxonomy-field rdcfe-taxonomy-field--' . esc_attr( $field_type ) . '-row"><td colspan="2">';
					$type_obj->render( $field, $value, $term_id );
					echo '</td></tr>';
				} else {
					$type_obj->render( $field, $value, $term_id );
				}

				return;
			}
		}

		$field_name  = $field['name'] ?? '';
		$field_label = $field['label'] ?? '';
		$placeholder = $field['placeholder'] ?? '';
		$description = $field['description'] ?? '';
		$required    = $field['required'] ?? false;
		$char_limit  = $field['character_limit'] ?? null;

		if ( empty( $field_name ) ) {
			return;
		}

		// Get current value.
		$value = $term_id > 0 ? get_term_meta( $term_id, $field_name, true ) : '';

		// Use default if no value.
		if ( '' === $value || null === $value ) {
			$value = $field['default_value'] ?? '';
		}

		unset( $context );

		if ( 'row' === $render_mode ) {
			?>
			<tr class="form-field rdcfe-taxonomy-field rdcfe-taxonomy-field--row<?php echo $required ? ' form-required' : ''; ?>" data-field-name="<?php echo esc_attr( $field_name ); ?>">
				<th scope="row">
					<label for="<?php echo esc_attr( $field_name ); ?>">
						<?php echo esc_html( $field_label ); ?>
						<?php if ( $required ) : ?>
							<span class="rdcfe-taxonomy-required">*</span>
						<?php endif; ?>
					</label>
				</th>
				<td>
					<?php $this->render_input( $field_type, $field_name, $value, $placeholder, $field, $char_limit ); ?>
					<?php if ( ! empty( $description ) ) : ?>
						<p class="description rdcfe-taxonomy-field__description"><?php echo esc_html( $description ); ?></p>
					<?php endif; ?>
				</td>
			</tr>
			<?php
			return;
		}

		?>
		<div class="rdcfe-taxonomy-field rdcfe-taxonomy-field--div" data-field-name="<?php echo esc_attr( $field_name ); ?>">
			<div class="rdcfe-taxonomy-field__label">
				<label for="<?php echo esc_attr( $field_name ); ?>">
					<?php echo esc_html( $field_label ); ?>
					<?php if ( $required ) : ?>
						<span class="rdcfe-taxonomy-required">*</span>
					<?php endif; ?>
				</label>
			</div>
			<div class="rdcfe-taxonomy-field__input">
				<?php $this->render_input( $field_type, $field_name, $value, $placeholder, $field, $char_limit ); ?>
			</div>
			<?php if ( ! empty( $description ) ) : ?>
				<div class="rdcfe-taxonomy-field__description"><?php echo esc_html( $description ); ?></div>
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
					class="rdcfe-taxonomy-textarea"
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
					class="rdcfe-taxonomy-input"
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
					class="rdcfe-taxonomy-input"
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
					class="rdcfe-taxonomy-input"
					value="<?php echo esc_attr( (string) $value ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
				/>
				<?php
				break;

			case 'date':
				// Enqueue jQuery UI Datepicker (styles are in rdcfe-taxonomy-layout.css).
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
				<div class="rdcfe-taxonomy-date-wrapper">
					<input
						type="text"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						class="rdcfe-taxonomy-input rdcfe-taxonomy-input--date rdcfe-taxonomy-datepicker"
						value="<?php echo esc_attr( $date_value ); ?>"
						placeholder="<?php echo esc_attr( $placeholder ?: 'YYYY-MM-DD' ); ?>"
						autocomplete="off"
						data-date-format="yy-mm-dd"
					/>
					<span class="rdcfe-taxonomy-date-icon dashicons dashicons-calendar-alt"></span>
				</div>
				<?php
				// Note: Datepicker initialization is handled by rdcfe-fields.js using data attributes.
				break;

			case 'select':
				$options     = $field['options'] ?? array();
				$is_multiple = isset( $field['multiple'] ) && ( true === $field['multiple'] || '1' === $field['multiple'] || 1 === $field['multiple'] );
				$field_name  = $is_multiple ? $name . '[]' : $name;

				if ( $is_multiple ) {
					$selected_values = is_array( $value ) ? $value : ( ! empty( $value ) ? array( $value ) : array() );
				} else {
					$selected_values = is_array( $value ) ? ( $value[0] ?? '' ) : $value;
				}

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
					class="rdcfe-taxonomy-select<?php echo $is_multiple ? ' rdcfe-taxonomy-select--multiple' : ''; ?>"
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

				if ( empty( $values ) ) {
					foreach ( $options as $option ) {
						if ( ! empty( $option['checked'] ) ) {
							$values[] = $option['value'] ?? '';
						}
					}
				}
				?>
				<div class="rdcfe-taxonomy-checkbox-group<?php echo 'horizontal' === $options_layout ? ' rdcfe-taxonomy-checkbox-group--horizontal' : ''; ?>">
					<?php foreach ( $options as $option ) : ?>
						<label class="rdcfe-taxonomy-checkbox-item">
							<input
								type="checkbox"
								name="<?php echo esc_attr( $name ); ?>[]"
								value="<?php echo esc_attr( $option['value'] ?? '' ); ?>"
								<?php checked( in_array( $option['value'] ?? '', $values, true ) ); ?>
							/>
							<span class="rdcfe-taxonomy-checkbox-label"><?php echo esc_html( $option['label'] ?? $option['value'] ?? '' ); ?></span>
						</label>
					<?php endforeach; ?>
				</div>
				<?php
				break;

			case 'radio':
				$options        = $field['options'] ?? array();
				$radio_value    = $value;
				$options_layout = $field['options_layout'] ?? 'vertical';

				if ( empty( $radio_value ) ) {
					foreach ( $options as $option ) {
						if ( ! empty( $option['checked'] ) ) {
							$radio_value = $option['value'] ?? '';
							break;
						}
					}
				}
				?>
				<div class="rdcfe-taxonomy-radio-group<?php echo 'horizontal' === $options_layout ? ' rdcfe-taxonomy-radio-group--horizontal' : ''; ?>">
					<?php foreach ( $options as $option ) : ?>
						<label class="rdcfe-taxonomy-radio-item">
							<input
								type="radio"
								name="<?php echo esc_attr( $name ); ?>"
								value="<?php echo esc_attr( $option['value'] ?? '' ); ?>"
								<?php checked( $radio_value, $option['value'] ?? '' ); ?>
							/>
							<span class="rdcfe-taxonomy-radio-label"><?php echo esc_html( $option['label'] ?? $option['value'] ?? '' ); ?></span>
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
				<label class="rdcfe-taxonomy-toggle">
					<input type="hidden" name="<?php echo esc_attr( $name ); ?>" value="0" />
					<input
						type="checkbox"
						class="rdcfe-taxonomy-toggle__input"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						value="1"
						<?php checked( $is_checked ); ?>
					/>
					<span class="rdcfe-taxonomy-toggle__slider"></span>
					<span class="rdcfe-taxonomy-toggle__labels">
						<span class="rdcfe-taxonomy-toggle__on"><?php echo esc_html( $on_label ); ?></span>
						<span class="rdcfe-taxonomy-toggle__off"><?php echo esc_html( $off_label ); ?></span>
					</span>
				</label>
				<?php
				break;

			case 'image':
				$image_url = $value ? wp_get_attachment_image_url( (int) $value, 'thumbnail' ) : '';
				?>
				<div class="rdcfe-taxonomy-image-field">
					<div class="rdcfe-taxonomy-image-field__preview-wrapper" <?php echo ! $value ? 'style="display:none;"' : ''; ?>>
						<div class="rdcfe-taxonomy-image-field__preview">
							<?php if ( $image_url ) : ?>
								<img src="<?php echo esc_url( $image_url ); ?>" alt="" />
							<?php endif; ?>
						</div>
						<a href="#" class="rdcfe-taxonomy-image-field__remove" title="<?php esc_attr_e( 'Remove', 'rox-dynamic-cpt-fields-engine' ); ?>">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
						</a>
					</div>
					<input
						type="hidden"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						value="<?php echo esc_attr( (string) $value ); ?>"
						class="rdcfe-taxonomy-image-field__input"
					/>
					<a href="#" class="rdcfe-taxonomy-btn rdcfe-taxonomy-image-field__select">
						<?php esc_html_e( 'Select Image', 'rox-dynamic-cpt-fields-engine' ); ?>
					</a>
				</div>
				<?php
				break;

			case 'file':
				$file_url = $value ? wp_get_attachment_url( (int) $value ) : '';
				?>
				<div class="rdcfe-taxonomy-file-field">
					<div class="rdcfe-taxonomy-file-field__info">
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
						class="rdcfe-taxonomy-file-field__input"
					/>
					<div class="rdcfe-taxonomy-file-field__buttons">
						<a href="#" class="rdcfe-taxonomy-btn rdcfe-taxonomy-file-field__select">
							<?php esc_html_e( 'Select File', 'rox-dynamic-cpt-fields-engine' ); ?>
						</a>
						<a href="#" class="rdcfe-taxonomy-btn rdcfe-taxonomy-btn--danger rdcfe-taxonomy-file-field__remove" <?php echo ! $value ? 'style="display:none;"' : ''; ?>>
							<?php esc_html_e( 'Remove', 'rox-dynamic-cpt-fields-engine' ); ?>
						</a>
					</div>
				</div>
				<?php
				break;

			case 'time':
				$time_value = (string) $value;
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
					class="rdcfe-taxonomy-input rdcfe-taxonomy-input--time"
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
				<div class="rdcfe-taxonomy-datetime-wrapper">
					<input
						type="datetime-local"
						id="<?php echo esc_attr( $name ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						class="rdcfe-taxonomy-input rdcfe-taxonomy-input--datetime"
						value="<?php echo esc_attr( $datetime_value ); ?>"
						step="60"
					/>
				</div>
				<?php
				break;

			case 'color':
				wp_enqueue_style( 'wp-color-picker' );
				wp_enqueue_script( 'wp-color-picker' );
				$color_field_id = 'rdcfe_tax_color_' . sanitize_key( $name );
				$default_color  = $field['default_value'] ?? '';
				$current_color  = ! empty( $value ) ? (string) $value : $default_color;
				?>
				<input
					type="text"
					id="<?php echo esc_attr( $color_field_id ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					class="rdcfe-taxonomy-color-field"
					value="<?php echo esc_attr( $current_color ); ?>"
					data-default-color="<?php echo esc_attr( $default_color ); ?>"
				/>
				<?php
				// Note: Color picker initialization is handled by rdcfe-fields.js using data-default-color attribute.
				break;

			case 'wysiwyg':
				$editor_id = 'rdcfe_tax_wysiwyg_' . sanitize_key( $name );
				$rows      = $field['rows'] ?? 8;
				$settings  = array(
					'textarea_name' => $name,
					'textarea_rows' => $rows,
					'media_buttons' => $field['media_upload'] ?? true,
					'teeny'         => ( $field['toolbar'] ?? 'full' ) === 'basic',
					'quicktags'     => $field['quicktags'] ?? true,
					'editor_class'  => 'rdcfe-taxonomy-wysiwyg',
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
					class="rdcfe-taxonomy-input"
					value="<?php echo esc_attr( (string) $value ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
					<?php echo $maxlength; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				/>
				<?php
				break;
		}
	}

	/**
	 * Save term meta.
	 *
	 * @param int $term_id The term ID.
	 * @param int $tt_id The term taxonomy ID.
	 * @return void
	 */
	public function save_term_meta( int $term_id, int $tt_id ): void {
		// Verify nonce.
		if ( ! isset( $_POST['rdcfe_taxonomy_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rdcfe_taxonomy_meta_nonce'] ) ), 'rdcfe_save_taxonomy_meta_fields' ) ) {
			return;
		}

		// Check permissions.
		$term = get_term( $term_id );
		if ( ! $term || is_wp_error( $term ) ) {
			return;
		}

		$taxonomy = $term->taxonomy;

		if ( ! current_user_can( 'edit_term', $term_id ) ) {
			return;
		}

		// Get meta fields for this taxonomy.
		if ( ! isset( $this->taxonomy_meta_fields[ $taxonomy ] ) ) {
			return;
		}

		$meta_fields = $this->taxonomy_meta_fields[ $taxonomy ]['meta_fields'];
		$registry    = FieldTypeRegistry::get_instance();

		// Save each field.
		foreach ( $meta_fields as $field ) {
			// Layout markers and display-only fields don't accept input —
			// skip them so we don't accidentally write `null` over a real
			// field's stored value (or worse, delete a meta key that
			// shares a name with the marker).
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
				delete_term_meta( $term_id, $field_name );
			} else {
				update_term_meta( $term_id, $field_name, $value );
			}
		}

		/**
		 * Fires after taxonomy meta fields are saved.
		 *
		 * @since 1.0.0
		 *
		 * @param int    $term_id The term ID.
		 * @param string $taxonomy The taxonomy slug.
		 * @param array  $meta_fields The meta fields configuration.
		 */
		do_action( 'rdcfe_taxonomy_meta_fields_saved', $term_id, $taxonomy, $meta_fields );
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
		$registry = FieldTypeRegistry::get_instance();
		$type_obj = $registry->get( 'image' );

		if ( null !== $type_obj && method_exists( $type_obj, 'sanitize' ) ) {
			$sanitized = $type_obj->sanitize( $value, $field );
			return is_int( $sanitized ) || is_string( $sanitized ) ? $sanitized : 0;
		}

		return absint( $value );
	}

	/**
	 * Register term meta for REST API.
	 *
	 * @param string                       $taxonomy The taxonomy slug.
	 * @param array<array<string, mixed>>  $meta_fields The meta fields.
	 * @return void
	 */
	private function register_term_meta_for_rest( string $taxonomy, array $meta_fields ): void {
		$registry = FieldTypeRegistry::get_instance();

		foreach ( $meta_fields as $field ) {
			// Don't register termmeta for layout markers or display-only
			// fields — they have no storage backing.
			if ( ! $registry->is_field_storable( $field ) ) {
				continue;
			}

			$field_name   = $field['name'] ?? '';
			$show_in_rest = $field['show_in_rest'] ?? false;
			$meta_type    = $this->get_rest_type( $field['type'] ?? 'text', $field );

			if ( empty( $field_name ) ) {
				continue;
			}

			register_term_meta(
				$taxonomy,
				$field_name,
				array(
					'type'          => $meta_type,
					'single'        => true,
					'show_in_rest'  => MetaRegistration::normalize_show_in_rest( $show_in_rest, $meta_type ),
					'auth_callback' => fn() => current_user_can( 'edit_terms' ),
				)
			);
		}
	}

	/**
	 * Get REST API type for a field type.
	 *
	 * @param string              $field_type The field type.
	 * @param array<string,mixed> $field      The full field configuration.
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

	/* Note: Styles moved to assets/css/rdcfe-taxonomy-layout.css and assets/css/rdcfe-fields.css */
}
