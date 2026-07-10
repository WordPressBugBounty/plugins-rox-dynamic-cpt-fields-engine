/**
 * Pro Context
 *
 * React Context provider for Pro license status.
 * Provides isPro status and helper functions to all child components.
 *
 * @package DynamicCPTFieldsEngine
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  DEFAULT_PRO_FEATURES,
  isProFeature as checkIsProFeature,
  type ProFeaturesConfig,
  type FeatureCategory,
} from '@/lib/pro-features';

/**
 * Extended rdcfeSettings interface (accessed via window.rdcfeSettings)
 * Note: Base type is declared in Layout.tsx, we access extended properties here
 */
interface DcfeSettingsExtended {
  restUrl: string;
  nonce: string;
  version: string;
  debugMode: boolean;
  isPro?: boolean;
  proFeatures?: ProFeaturesConfig;
  upgradeUrl?: string;
}

/**
 * Get rdcfeSettings from window with extended type
 */
const getDcfeSettings = (): DcfeSettingsExtended | undefined => {
  return (window as { rdcfeSettings?: DcfeSettingsExtended }).rdcfeSettings;
};

/**
 * Pro Context value interface
 */
interface ProContextValue {
  /** Whether Pro license is active */
  isPro: boolean;
  /** List of Pro-only features from server */
  proFeatures: ProFeaturesConfig;
  /** URL to upgrade to Pro */
  upgradeUrl: string;
  /** Check if a specific feature is Pro-only */
  isProFeature: (feature: string, category: FeatureCategory) => boolean;
  /** Check if user can use a feature (Pro active OR feature is not Pro-only) */
  canUseFeature: (feature: string, category: FeatureCategory) => boolean;
}

/**
 * Default context value (Free version)
 */
const defaultContextValue: ProContextValue = {
  isPro: false,
  proFeatures: DEFAULT_PRO_FEATURES,
  upgradeUrl: 'https://wpmet.com/plugin/dynamic-engine/pricing/',
  isProFeature: checkIsProFeature,
  canUseFeature: (feature, category) => !checkIsProFeature(feature, category),
};

/**
 * Pro Context
 */
const ProContext = createContext<ProContextValue>(defaultContextValue);

/**
 * Pro Provider Props
 */
interface ProProviderProps {
  children: ReactNode;
}

/**
 * Pro Provider Component
 *
 * Wraps the application and provides Pro status to all children.
 * Reads from window.rdcfeSettings which is set by PHP.
 *
 * @example
 * ```tsx
 * <ProProvider>
 *   <App />
 * </ProProvider>
 * ```
 */
export function ProProvider({ children }: ProProviderProps) {
  const value = useMemo<ProContextValue>(() => {
    const settings = getDcfeSettings();

    const isPro = settings?.isPro === true;
    const proFeatures = settings?.proFeatures || DEFAULT_PRO_FEATURES;
    const upgradeUrl = settings?.upgradeUrl || defaultContextValue.upgradeUrl;

    /**
     * Check if a feature is Pro-only
     * Uses server-provided list if available, falls back to defaults
     */
    const isProFeature = (feature: string, category: FeatureCategory): boolean => {
      const featureKey = `${category}s` as keyof ProFeaturesConfig;
      const features = proFeatures[featureKey] || [];
      return features.includes(feature.toLowerCase());
    };

    /**
     * Check if user can use a feature
     * Returns true if:
     * - Pro license is active, OR
     * - Feature is not Pro-only
     */
    const canUseFeature = (feature: string, category: FeatureCategory): boolean => {
      return isPro || !isProFeature(feature, category);
    };

    return {
      isPro,
      proFeatures,
      upgradeUrl,
      isProFeature,
      canUseFeature,
    };
  }, []);

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

/**
 * Hook to access Pro context
 *
 * @returns Pro context value with isPro status and helper functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPro, canUseFeature } = useProContext();
 *
 *   if (!canUseFeature('repeater', 'field_type')) {
 *     return <UpgradePrompt />;
 *   }
 *
 *   return <RepeaterField />;
 * }
 * ```
 */
export function useProContext(): ProContextValue {
  const context = useContext(ProContext);

  if (context === undefined) {
    throw new Error('useProContext must be used within a ProProvider');
  }

  return context;
}

/**
 * Export context for advanced usage
 */
export { ProContext };

export default ProProvider;
