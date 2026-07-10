/**
 * Public surface for card-preset infra. One import path keeps the
 * gallery component, the empty-canvas hint, and any future "presets
 * picker" entry point in lockstep.
 */

export type { CardPreset, CardPresetNode, AppliedPresetNodes } from './types';
export { applyPreset, applyAIComponents, replaceComponents } from './applyPreset';
export { CARD_PRESETS } from './cards';
