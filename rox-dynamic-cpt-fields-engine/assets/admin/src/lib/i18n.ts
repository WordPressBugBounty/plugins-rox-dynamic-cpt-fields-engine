/**
 * WordPress i18n helpers for the React admin app.
 *
 * Uses the global `wp.i18n` object enqueued by WordPress so
 * `wp_set_script_translations()` can inject locale JSON at runtime.
 *
 * Always pass the text domain as the second argument so `wp i18n make-pot`
 * can extract strings from TypeScript/TSX sources:
 *
 *   __( 'Save', TEXT_DOMAIN )
 */

/** Must match the Text Domain in rox-dynamic-cpt-fields-engine.php */
export const TEXT_DOMAIN = 'rox-dynamic-cpt-fields-engine';

type WpI18n = {
  __: (text: string, domain?: string) => string;
  _n: (single: string, plural: string, number: number, domain?: string) => string;
  _x: (text: string, context: string, domain?: string) => string;
  _nx: (
    single: string,
    plural: string,
    number: number,
    context: string,
    domain?: string,
  ) => string;
  sprintf: (format: string, ...args: unknown[]) => string;
};

function getI18n(): WpI18n {
  if (typeof window !== 'undefined' && window.wp?.i18n) {
    return window.wp.i18n;
  }

  // Vite dev fallback when wp.i18n is not available.
  return {
    __: (text: string) => text,
    _n: (single: string, plural: string, number: number) =>
      number === 1 ? single : plural,
    _x: (text: string) => text,
    _nx: (single: string, plural: string, number: number) =>
      number === 1 ? single : plural,
    sprintf: (format: string, ...args: unknown[]) => {
      let i = 0;
      return format.replace(/%s/g, () => String(args[i++] ?? ''));
    },
  };
}

export function __(text: string, domain: string = TEXT_DOMAIN): string {
  return getI18n().__(text, domain);
}

export function _n(
  single: string,
  plural: string,
  number: number,
  domain: string = TEXT_DOMAIN,
): string {
  return getI18n()._n(single, plural, number, domain);
}

export function _x(
  text: string,
  context: string,
  domain: string = TEXT_DOMAIN,
): string {
  return getI18n()._x(text, context, domain);
}

export function _nx(
  single: string,
  plural: string,
  number: number,
  context: string,
  domain: string = TEXT_DOMAIN,
): string {
  return getI18n()._nx(single, plural, number, context, domain);
}

export function sprintf(format: string, ...args: unknown[]): string {
  return getI18n().sprintf(format, ...args);
}
