/**
 * useProStatus Hook
 *
 * Hook for checking Pro license status and feature availability.
 * This is the primary hook for Pro feature gating in the UI.
 *
 * @package DynamicCPTFieldsEngine
 */

import { useMemo, useState, useCallback } from 'react';
import { useProContext } from '@/contexts/ProContext';
import {
  isProFieldType,
  isProModule,
  isProSetting,
  isProLocationRule,
  getFeatureDescription,
  type FeatureCategory,
} from '@/lib/pro-features';

/**
 * useProStatus return type
 */
interface UseProStatusReturn {
  /** Whether Pro license is active */
  isPro: boolean;
  /** URL to upgrade to Pro */
  upgradeUrl: string;
  /** Check if a feature is Pro-only */
  isProFeature: (feature: string, category: FeatureCategory) => boolean;
  /** Check if user can use a feature */
  canUseFeature: (feature: string, category: FeatureCategory) => boolean;
  /** Check if a field type is Pro-only */
  isProFieldType: (type: string) => boolean;
  /** Check if a module is Pro-only */
  isProModule: (module: string) => boolean;
  /** Check if a setting is Pro-only */
  isProSetting: (setting: string) => boolean;
  /** Check if a location rule is Pro-only */
  isProLocationRule: (rule: string) => boolean;
  /** Get feature description for upgrade modal */
  getFeatureDescription: (feature: string) => string;
}

/**
 * Hook for Pro status and feature checking
 *
 * @returns Object with isPro status and feature checking functions
 *
 * @example
 * ```tsx
 * function FieldTypePicker() {
 *   const { isPro, isProFieldType, canUseFeature } = useProStatus();
 *
 *   return (
 *     <div>
 *       {fieldTypes.map(type => (
 *         <button
 *           key={type}
 *           disabled={!canUseFeature(type, 'field_type')}
 *         >
 *           {type}
 *           {isProFieldType(type) && !isPro && <ProBadge />}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProStatus(): UseProStatusReturn {
  const { isPro, upgradeUrl, isProFeature, canUseFeature } = useProContext();

  return useMemo(
    () => ({
      isPro,
      upgradeUrl,
      isProFeature,
      canUseFeature,
      isProFieldType,
      isProModule,
      isProSetting,
      isProLocationRule,
      getFeatureDescription,
    }),
    [isPro, upgradeUrl, isProFeature, canUseFeature]
  );
}

/**
 * Hook for managing upgrade modal state
 *
 * @returns Object with modal state and handlers
 *
 * @example
 * ```tsx
 * function ProFeatureButton() {
 *   const { showModal, openModal, closeModal, feature, setFeature } = useUpgradeModal();
 *
 *   return (
 *     <>
 *       <button onClick={() => { setFeature('repeater'); openModal(); }}>
 *         Add Repeater
 *       </button>
 *       <UpgradeModal
 *         open={showModal}
 *         onOpenChange={closeModal}
 *         feature={feature}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useUpgradeModal() {
  const [showModal, setShowModal] = useState(false);
  const [feature, setFeature] = useState<string>('');
  const [featureCategory, setFeatureCategory] = useState<FeatureCategory>('field_type');

  const openModal = useCallback((
    featureName?: string,
    category?: FeatureCategory
  ) => {
    if (featureName) setFeature(featureName);
    if (category) setFeatureCategory(category);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return {
    showModal,
    openModal,
    closeModal,
    feature,
    setFeature,
    featureCategory,
    setFeatureCategory,
  };
}

/**
 * Hook to gate a Pro feature
 * Returns handlers for Pro-gated interactions
 *
 * @param feature - Feature identifier
 * @param category - Feature category
 * @returns Object with isLocked status and click handler
 *
 * @example
 * ```tsx
 * function RepeaterButton() {
 *   const { isLocked, handleClick, Modal } = useProGate('repeater', 'field_type');
 *
 *   return (
 *     <>
 *       <button onClick={handleClick} disabled={isLocked}>
 *         Add Repeater {isLocked && <ProBadge />}
 *       </button>
 *       {Modal}
 *     </>
 *   );
 * }
 * ```
 */
export function useProGate(feature: string, category: FeatureCategory) {
  const { isPro, canUseFeature } = useProStatus();
  const { showModal, openModal, closeModal } = useUpgradeModal();

  const isLocked = !canUseFeature(feature, category);

  const handleClick = useCallback(
    (callback?: () => void) => {
      if (isLocked) {
        openModal(feature, category);
        return;
      }
      callback?.();
    },
    [isLocked, feature, category, openModal]
  );

  return {
    isPro,
    isLocked,
    handleClick,
    showModal,
    closeModal,
    feature,
    category,
  };
}

export default useProStatus;
