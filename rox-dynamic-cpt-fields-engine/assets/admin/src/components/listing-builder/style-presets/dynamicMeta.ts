/**
 * Dynamic Meta style presets.
 *
 * Note: presets do NOT touch `meta_flow` — that's a layout decision
 * the author makes per row. Mixing it into a preset would surprise
 * authors who toggle layout independently of typography.
 */

import type { StylePreset } from './index';

export const DYNAMIC_META_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'muted',
    label: 'Muted',
    description: 'Default byline tone — small, low contrast.',
    style: {
      font_size: '13',
      font_size_unit: 'px',
      font_weight: '400',
      line_height: '1.4',
      text_transform: 'none',
      letter_spacing: '0',
      color: '',
    },
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Tiny meta — good for dense card grids.',
    style: {
      font_size: '11',
      font_size_unit: 'px',
      font_weight: '500',
      line_height: '1.4',
      text_transform: 'none',
      letter_spacing: '0',
    },
  },
  {
    id: 'eyebrow',
    label: 'Eyebrow',
    description: 'Uppercase tracked label — sits above a title.',
    style: {
      font_size: '11',
      font_size_unit: 'px',
      font_weight: '700',
      line_height: '1.2',
      letter_spacing: '1.2px',
      text_transform: 'uppercase',
    },
  },
  {
    id: 'badge',
    label: 'Badge',
    description: 'Pill-shaped meta — pairs well with inline rows.',
    style: {
      font_size: '11',
      font_size_unit: 'px',
      font_weight: '600',
      line_height: '1.2',
      text_transform: 'uppercase',
      letter_spacing: '0.5px',
      background: '#f3f4f6',
      padding: '3px 8px',
      border_radius: '999px',
    },
  },
];
