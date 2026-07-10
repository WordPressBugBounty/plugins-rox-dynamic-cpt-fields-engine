import type { MetaField, MetaFieldOption } from '../hooks/usePostTypes';

function optionsToChoices(options: MetaFieldOption[] | undefined): Record<string, string> {
  const choicesObject: Record<string, string> = {};
  if (options && Array.isArray(options)) {
    options.forEach((opt) => {
      if (typeof opt === 'object' && opt.value !== undefined) {
        choicesObject[opt.value] = opt.label || opt.value;
      }
    });
  }
  return choicesObject;
}

/**
 * Normalize a meta_fields payload from the API into a flat array.
 * Handles legacy double-encoded JSON strings and object maps.
 */
export function coerceMetaFieldsArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      return coerceMetaFieldsArray(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  if (raw && typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>);
  }

  return [];
}

/**
 * Transform a single meta field for REST persistence.
 * Strips UI-only keys and normalizes choice fields for the PHP backend.
 */
export function transformMetaFieldForApi(field: MetaField): Record<string, unknown> {
  const isChoiceType = ['select', 'multiselect', 'checkbox', 'radio'].includes(field.type);
  const { _bulkOptionsText, _expanded, ...cleanField } = field;

  const baseField: Record<string, unknown> = { ...cleanField };

  if (field.sub_fields?.length) {
    baseField.sub_fields = field.sub_fields.map((subField) => transformMetaFieldForApi(subField));
  }

  const pattern = typeof field.validation_pattern === 'string' ? field.validation_pattern.trim() : '';
  if (pattern !== '') {
    baseField.validation_pattern = pattern;
  } else {
    delete baseField.validation_pattern;
  }

  const message = typeof field.validation_message === 'string' ? field.validation_message.trim() : '';
  if (message !== '') {
    baseField.validation_message = message;
  } else {
    delete baseField.validation_message;
  }

  if (isChoiceType) {
    baseField.choices = optionsToChoices(field.options);
    baseField.options = field.options || [];
  }

  return baseField;
}

export function transformMetaFieldsForApi(fields: MetaField[]): Record<string, unknown>[] {
  return fields.map((field) => transformMetaFieldForApi(field));
}
