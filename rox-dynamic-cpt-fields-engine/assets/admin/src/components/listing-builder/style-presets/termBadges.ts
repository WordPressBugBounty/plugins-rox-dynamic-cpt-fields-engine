/**
 * Term Badges style presets.
 *
 * The component exposes a separate `render_mode` setting (chip vs
 * inline list) — presets here only set typography + box styles. The
 * mode stays an explicit choice in the Default tab.
 */

import type { StylePreset } from './index';

export const TERM_BADGES_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'soft',
    label: 'Soft',
    description: 'Default chip — neutral fill, subtle.',
    style: {
      font_size: '12',
      font_size_unit: 'px',
      font_weight: '500',
      line_height: '1.4',
      text_transform: 'none',
      letter_spacing: '0',
    },
  },
  {
    id: 'pill',
    label: 'Pill',
    description: 'Pill chip — accent fill, more prominence.',
    style: {
      font_size: '12',
      font_size_unit: 'px',
      font_weight: '600',
      line_height: '1.2',
      text_transform: 'none',
      letter_spacing: '0',
      background: '#ede9fe',
      color: '#4c1d95',
      padding: '3px 10px',
      border_radius: '999px',
    },
  },
  {
    id: 'uppercase',
    label: 'Uppercase',
    description: 'Loud label — uppercase, tracked.',
    style: {
      font_size: '11',
      font_size_unit: 'px',
      font_weight: '700',
      line_height: '1.2',
      text_transform: 'uppercase',
      letter_spacing: '1px',
    },
  },
];
