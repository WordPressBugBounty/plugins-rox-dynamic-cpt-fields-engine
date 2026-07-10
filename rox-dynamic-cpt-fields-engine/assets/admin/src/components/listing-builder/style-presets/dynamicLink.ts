/**
 * Dynamic Link style presets.
 *
 * Each preset trades off prominence vs noise — a card may use *Plain*
 * for a tertiary "Read more" and *Solid* for a primary CTA. Padding
 * is set so the chips read as buttons; the *Plain* preset clears it
 * so the link behaves as inline text.
 */

import type { StylePreset } from './index';

export const DYNAMIC_LINK_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'plain',
    label: 'Plain',
    description: 'Inline link — no chrome.',
    style: {
      font_size: '14',
      font_size_unit: 'px',
      font_weight: '500',
      text_decoration: 'none',
      background: '',
      hover_background: '',
      padding: '',
      border_radius: '',
      width: 'auto',
    },
  },
  {
    id: 'pill',
    label: 'Pill',
    description: 'Filled rounded button — primary CTA.',
    style: {
      font_size: '13',
      font_size_unit: 'px',
      font_weight: '600',
      text_decoration: 'none',
      color: '#ffffff',
      hover_color: '#ffffff',
      background: '#675dd8',
      hover_background: '#4f46c1',
      padding: '8px 16px',
      border_radius: '999px',
      width: 'auto',
    },
  },
  {
    id: 'solid',
    label: 'Solid',
    description: 'Filled square button — high-emphasis CTA.',
    style: {
      font_size: '13',
      font_size_unit: 'px',
      font_weight: '600',
      text_decoration: 'none',
      color: '#ffffff',
      hover_color: '#ffffff',
      background: '#1f2937',
      hover_background: '#111827',
      padding: '8px 14px',
      border_radius: '6px',
      width: 'auto',
    },
  },
  {
    id: 'outline',
    label: 'Outline',
    description: 'Bordered button — secondary CTA.',
    style: {
      font_size: '13',
      font_size_unit: 'px',
      font_weight: '600',
      text_decoration: 'none',
      color: '#1f2937',
      hover_color: '#675dd8',
      background: 'transparent',
      hover_background: '',
      padding: '7px 14px',
      border_radius: '6px',
      width: 'auto',
    },
  },
];
