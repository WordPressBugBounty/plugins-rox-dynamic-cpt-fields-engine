<?php
/**
 * Field Type Registry
 *
 * @package RoxDynamicCPTFieldsEngine
 */

declare(strict_types=1);

namespace RDCFE\Fields;

use RDCFE\Fields\FieldTypes\FieldTypeInterface;
use RDCFE\Fields\FieldTypes\TextField;
use RDCFE\Fields\FieldTypes\TextareaField;
use RDCFE\Fields\FieldTypes\NumberField;
use RDCFE\Fields\FieldTypes\EmailField;
use RDCFE\Fields\FieldTypes\UrlField;
use RDCFE\Fields\FieldTypes\DateField;
use RDCFE\Fields\FieldTypes\TimeField;
use RDCFE\Fields\FieldTypes\DateTimeField;
use RDCFE\Fields\FieldTypes\ColorField;
use RDCFE\Fields\FieldTypes\WysiwygField;
use RDCFE\Fields\FieldTypes\SelectField;
use RDCFE\Fields\FieldTypes\CheckboxField;
use RDCFE\Fields\FieldTypes\RadioField;
use RDCFE\Fields\FieldTypes\ToggleField;
use RDCFE\Fields\FieldTypes\ImageField;
use RDCFE\Fields\FieldTypes\FileField;

/**
 * Class FieldTypeRegistry
 *
 * Registry for field types.
 */
class FieldTypeRegistry {

	/**
	 * Registered field types.
	 *
	 * @var array<string, FieldTypeInterface>
	 */
	private array $types = array();

	/**
	 * Singleton instance.
	 *
	 * @var FieldTypeRegistry|null
	 */
	private static ?FieldTypeRegistry $instance = null;

	/**
	 * Get singleton instance.
	 *
	 * @return FieldTypeRegistry
	 */
	public static function get_instance(): FieldTypeRegistry {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->register_default_types();
	}

	/**
	 * Register default field types.
	 *
	 * @return void
	 */
	private function register_default_types(): void {
		// Basic fields.
		$this->register( new TextField() );
		$this->register( new TextareaField() );
		$this->register( new NumberField() );
		$this->register( new EmailField() );
		$this->register( new UrlField() );
		$this->register( new DateField() );
		$this->register( new TimeField() );
		$this->register( new DateTimeField() );
		$this->register( new ColorField() );

		// Content fields.
		$this->register( new WysiwygField() );

		// Choice fields.
		$this->register( new SelectField() );
		$this->register( new CheckboxField() );
		$this->register( new RadioField() );
		$this->register( new ToggleField() );

		// Media fields.
		$this->register( new ImageField() );
		$this->register( new FileField() );

		/**
		 * Fires after default field types are registered.
		 *
		 * Pro field types (Group, Repeater, Gallery, etc.) are registered
		 * by the Pro plugin via this hook.
		 *
		 * @since 1.0.0
		 *
		 * @param FieldTypeRegistry $registry The field type registry.
		 */
		do_action( 'rdcfe_register_field_types', $this );
	}

	/**
	 * Register a field type.
	 *
	 * @param FieldTypeInterface $field_type The field type instance.
	 * @return void
	 */
	public function register( FieldTypeInterface $field_type ): void {
		$this->types[ $field_type->get_type() ] = $field_type;
	}

	/**
	 * Get a field type by identifier.
	 *
	 * @param string $type The field type identifier.
	 * @return FieldTypeInterface|null
	 */
	public function get( string $type ): ?FieldTypeInterface {
		return $this->types[ $type ] ?? null;
	}

	/**
	 * Check if a field type is registered.
	 *
	 * @param string $type The field type identifier.
	 * @return bool
	 */
	public function has( string $type ): bool {
		return isset( $this->types[ $type ] );
	}

	/**
	 * Get all registered field types.
	 *
	 * @return array<string, FieldTypeInterface>
	 */
	public function get_all(): array {
		return $this->types;
	}

	/**
	 * Get field types by category.
	 *
	 * @param string $category The category name.
	 * @return array<string, FieldTypeInterface>
	 */
	public function get_by_category( string $category ): array {
		return array_filter(
			$this->types,
			fn( FieldTypeInterface $type ) => $type->get_category() === $category
		);
	}

	/**
	 * Determine whether a given field config should be persisted to the
	 * database by the meta-saving / meta-registration loops.
	 *
	 * Returns false for layout markers (`object_type !== 'field'`) and
	 * for storable=false field types like `html`. Used by every renderer
	 * (`MetaBoxRenderer`, `CPTMetaFieldsManager`, `TaxonomyMetaFieldsManager`,
	 * `OptionsPageRegistrar`) to keep the skip rules in one place.
	 *
	 * @param array<string, mixed> $field The field configuration.
	 * @return bool
	 */
	public function is_field_storable( array $field ): bool {
		$object_type = $field['object_type'] ?? 'field';
		if ( 'field' !== $object_type ) {
			return false;
		}

		$type       = (string) ( $field['type'] ?? 'text' );
		$field_type = $this->get( $type );

		if ( null === $field_type ) {
			return true;
		}

		if ( method_exists( $field_type, 'is_storable' ) ) {
			return (bool) $field_type->is_storable();
		}

		return true;
	}

	/**
	 * Get all categories with their field types.
	 *
	 * @return array<string, array<string, FieldTypeInterface>>
	 */
	public function get_categorized(): array {
		$categorized = array();

		foreach ( $this->types as $type => $field_type ) {
			$category = $field_type->get_category();

			if ( ! isset( $categorized[ $category ] ) ) {
				$categorized[ $category ] = array();
			}

			$categorized[ $category ][ $type ] = $field_type;
		}

		return $categorized;
	}
}
