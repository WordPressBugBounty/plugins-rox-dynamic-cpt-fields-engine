<?php
/**
 * Meta Box Renderer
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields;

/**
 * Class MetaBoxRenderer
 *
 * Renders field groups as meta boxes on post edit screens.
 *
 * Honors the metabox builder's `tab` / `accordion` / `endpoint` markers in
 * the flat `fields` array exactly the way CPT meta fields, taxonomy meta
 * fields, and options pages do, so a field group can use horizontal tabs,
 * vertical tabs, or accordions to organise fields. Falls back to a simple
 * flat layout when no tabs/accordions are present. Markup, JS hooks
 * (`.rdcfe-tabs`, `.rdcfe-accordions`), and CSS are all reused from the
 * CPT layout, so the same JS that drives tabs and accordions everywhere
 * else picks these up automatically without any extra wiring.
 */
class MetaBoxRenderer {

	/**
	 * Field type registry.
	 *
	 * @var FieldTypeRegistry
	 */
	private FieldTypeRegistry $registry;

	/**
	 * Constructor.
	 *
	 * @param FieldTypeRegistry|null $registry Field type registry.
	 */
	public function __construct( ?FieldTypeRegistry $registry = null ) {
		$this->registry = $registry ?? FieldTypeRegistry::get_instance();
	}

	/**
	 * Render a meta box for a field group.
	 *
	 * @param \WP_Post             $post The post object.
	 * @param array<string, mixed> $metabox The metabox arguments.
	 * @return void
	 */
	public function render_meta_box( \WP_Post $post, array $metabox ): void {
		$field_group = $metabox['args']['field_group'] ?? array();
		$fields      = $field_group['fields'] ?? array();

		if ( empty( $fields ) ) {
			echo '<p>' . esc_html__( 'No fields configured for this group.', 'rox-dynamic-cpt-fields-engine' ) . '</p>';
			return;
		}

		// Enqueue field assets (CSS/JS) - only loads on pages with our fields.
		// Also enqueue the CPT layout CSS so Metabox fields share the same flex
		// grid, borders, and spacing already used by CPT meta fields.
		$assets = FieldAssetsManager::get_instance();
		$assets->enqueue_assets();
		$assets->enqueue_cpt_layout();

		// Nonce field.
		wp_nonce_field( 'rdcfe_save_fields', 'rdcfe_fields_nonce' );

		// Resolve presentation settings. These map directly to CSS modifier
		// classes on the meta-box wrapper:
		//   - label_placement       : 'top' (default) | 'left'
		//   - instruction_placement : 'label' | 'field' (default)
		$label_placement = ( ( $field_group['label_placement'] ?? 'top' ) === 'left' )
			? 'left'
			: 'top';

		$instruction_placement = ( ( $field_group['instruction_placement'] ?? 'field' ) === 'label' )
			? 'label'
			: 'field';

		/**
		 * Filters instruction/description placement for field-group metaboxes on post screens.
		 *
		 * @since 1.0.0
		 *
		 * @param string               $placement   `field` or `label`.
		 * @param array<string, mixed> $field_group Field group configuration.
		 */
		$instruction_placement = apply_filters(
			'rdcfe_metabox_instruction_placement',
			$instruction_placement,
			$field_group
		);
		$instruction_placement = ( 'label' === $instruction_placement ) ? 'label' : 'field';

		$wrapper_classes = array(
			'rdcfe-meta-box',
			'rdcfe-cpt-meta-fields',
			'rdcfe-meta-box--label-' . $label_placement,
			'rdcfe-meta-box--instructions-' . $instruction_placement,
		);

		$layout    = $this->parse_field_layout( $fields );
		$sections  = $layout['sections'] ?? array();
		$tab_type  = $layout['tab_type'] ?? 'horizontal';
		$unique_id = 'rdcfe_metabox_' . sanitize_key( (string) ( $metabox['id'] ?? $field_group['id'] ?? 'group' ) );

		// Reuses the CPT meta-fields wrapper classes so all width rules,
		// borders, and spacing from rdcfe-cpt-layout.css apply automatically.
		echo '<div class="' . esc_attr( implode( ' ', $wrapper_classes ) ) . '">';
		$this->render_section_blocks( $sections, $tab_type, $unique_id, $post->ID );
		echo '</div>';
	}

	/**
	 * Parse a flat fields array into a structured layout.
	 *
	 * Walks the fields once and converts the metabox builder's `tab` /
	 * `accordion` / `endpoint` markers into a sequence of "sections",
	 * each carrying the marker (if any) plus the field children that
	 * follow it. The returned layout is rendered by `render_section_blocks`.
	 *
	 * @param array<array<string, mixed>> $fields Flat field list.
	 * @return array{type:string, tab_type:string, sections:array<int,array<string,mixed>>}
	 */
	private function parse_field_layout( array $fields ): array {
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

		foreach ( $fields as $field ) {
			$object_type = $field['object_type'] ?? 'field';

			switch ( $object_type ) {
				case 'tab':
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
					// the accordion content silently flattened above it.
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
	 * Walk parsed sections in order and emit each consecutive run as a
	 * block (tabs strip / accordions list / standalone fields).
	 *
	 * Splitting into runs (rather than re-grouping all tabs together,
	 * then all accordions, etc.) preserves the author's intended ordering
	 * — e.g. `tab → endpoint → accordion → accordion` renders one tab
	 * strip followed by one accordion list with two items, exactly as
	 * configured in the metabox builder.
	 *
	 * @param array<int, array<string, mixed>> $sections  Parsed sections in document order.
	 * @param string                           $tab_type  'horizontal'|'vertical' (applies to tab blocks only).
	 * @param string                           $unique_id DOM-safe ID prefix.
	 * @param int                              $post_id   The post ID.
	 * @return void
	 */
	private function render_section_blocks( array $sections, string $tab_type, string $unique_id, int $post_id ): void {
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
				$this->render_tabs_block( $run, $tab_type, $unique_id . '_b' . $block_index, $post_id );
			} elseif ( 'accordion' === $section_type ) {
				$run = array();
				while ( $index < $count && 'accordion' === ( $sections[ $index ]['type'] ?? '' ) ) {
					$run[] = $sections[ $index ];
					++$index;
				}
				$this->render_accordions_block( $run, $unique_id . '_b' . $block_index, $post_id );
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
	 * @param int                  $object_id The object ID.
	 * @return void
	 */
	public function render_field( array $field, int $object_id ): void {
		// Defensive: layout markers (tab/accordion/endpoint) must never fall
		// through to the field type registry — they have no input UI and
		// no meta key, so rendering them as text would produce stray
		// "Tab"/"End"/etc. inputs (the bug this class previously had).
		$object_type = $field['object_type'] ?? 'field';
		if ( 'field' !== $object_type ) {
			return;
		}

		$type       = $field['type'] ?? 'text';
		$field_type = $this->registry->get( $type );

		if ( ! $field_type ) {
			$field_type = $this->registry->get( 'text' );
		}

		// Get current value.
		$meta_key = $field['name'] ?? '';
		$value    = get_post_meta( $object_id, $meta_key, true );

		// Use default if no value.
		if ( '' === $value || null === $value ) {
			$value = $field_type->get_default_value( $field );
		}

		// Render the field.
		$field_type->render( $field, $value, $object_id );
	}

	/**
	 * Save field values.
	 *
	 * @param int                  $post_id The post ID.
	 * @param array<string, mixed> $field_group The field group configuration.
	 * @return void
	 */
	public function save_fields( int $post_id, array $field_group ): void {
		$fields = $field_group['fields'] ?? array();

		foreach ( $fields as $field ) {
			$this->save_field( $post_id, $field );
		}
	}


	/**
	 * Save a single field value.
	 *
	 * @param int                  $post_id The post ID.
	 * @param array<string, mixed> $field The field configuration.
	 * @return void
	 */
	private function save_field( int $post_id, array $field ): void {
		// Skip layout markers AND display-only field types (e.g. `html`)
		// — neither has an input control or a meta key to write. Saving
		// them would create junk post_meta rows like `_rdcfe_meta_tab` or
		// overwrite real user data with the marker's label string when
		// the form payload happens to contain a key that matches the
		// marker's `name`.
		if ( ! $this->registry->is_field_storable( $field ) ) {
			return;
		}

		$type       = $field['type'] ?? 'text';
		$field_type = $this->registry->get( $type );

		if ( ! $field_type ) {
			$field_type = $this->registry->get( 'text' );
		}

		$meta_key = $field['name'] ?? '';

		if ( empty( $meta_key ) ) {
			return;
		}

		// Get value from POST.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce verified in save_post handler, sanitization happens below.
		$value = isset( $_POST[ $meta_key ] ) ? wp_unslash( $_POST[ $meta_key ] ) : null;

		// Sanitize value.
		$value = $field_type->sanitize( $value, $field );

		// Validate value.
		$validation = $field_type->validate( $value, $field );

		if ( is_wp_error( $validation ) ) {
			// Store validation error for display.
			set_transient(
				'rdcfe_field_error_' . $post_id . '_' . $meta_key,
				$validation->get_error_message(),
				60
			);
			return;
		}

		// Save value.
		if ( '' === $value || null === $value || ( is_array( $value ) && empty( $value ) ) ) {
			delete_post_meta( $post_id, $meta_key );
		} else {
			update_post_meta( $post_id, $meta_key, $value );
		}

		/**
		 * Fires after a field value is saved.
		 *
		 * @since 1.0.0
		 *
		 * @param string $meta_key The meta key.
		 * @param mixed  $value The saved value.
		 * @param int    $post_id The post ID.
		 * @param array  $field The field configuration.
		 */
		do_action( 'rdcfe_field_saved', $meta_key, $value, $post_id, $field );
	}
}
