declare global {
  interface Window {
    wp?: {
      i18n?: {
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
        setLocaleData: (data: Record<string, unknown>, domain?: string) => void;
      };
      media?: (options: Record<string, unknown>) => {
        on: (event: string, callback: () => void) => void;
        open: () => void;
        state: () => {
          get: (key: string) => {
            first: () => {
              toJSON: () => { id?: number; url?: string };
            };
          };
        };
      };
    };
    rdcfeSettings?: {
      restUrl: string;
      nonce: string;
      ajaxUrl?: string;
      restNonceUrl?: string;
      version: string;
      debugMode: boolean;
      isPro?: boolean;
      proFeatures?: {
        field_types: string[];
        modules: string[];
        settings: string[];
        location_rules: string[];
      };
      upgradeUrl?: string;
      adminMenus?: Array<{ value: string; label: string }>;
      userRoles?: Array<{ value: string; label: string }>;
      elementorActive?: boolean;
      registeredPostTypes?: Array<{ value: string; label: string }>;
      adminUrl?: string;
    };
  }
}

export {};
