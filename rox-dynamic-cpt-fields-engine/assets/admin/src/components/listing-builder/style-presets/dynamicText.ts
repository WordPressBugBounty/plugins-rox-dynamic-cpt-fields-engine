/**
 * Dynamic Text style presets.
 *
 * Size + weight track the predefined tag styles in
 * `rdcfe-pro-listings.css` so the preset and HTML tag combine
 * naturally (e.g. *Title H2* on an `<h2>` looks correct out of the
 * box). Letter spacing is authored in `px` (not `em`) so values
 * round-trip cleanly through the px-locked SpacingControl /
 * NumberSliderInput in the Style tab — `1px` ≈ `0.06em` at 16px,
 * which is the visual effect we want for eyebrow tracking.
 */

import type { StylePreset } from './index';

export const DYNAMIC_TEXT_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'title-h1',
    label: 'Title H1',
    description: 'Large hero title — bold, tight tracking.',
    style: {
      font_size: '28',
      font_size_unit: 'px',
      font_weight: '700',
      line_height: '1.15',
      letter_spacing: '-0.5px',
      text_transform: 'none',
      font_style: 'normal',
      text_decoration: 'none',
    },
  },
  {
    id: 'title-h2',
    label: 'Title H2',
    description: 'Section title — pairs well with a meta line below.',
    style: {
      font_size: '22',
      font_size_unit: 'px',
      font_weight: '700',
      line_height: '1.2',
      letter_spacing: '-0.3px',
      text_transform: 'none',
      font_style: 'normal',
      text_decoration: 'none',
    },
  },
  {
    id: 'title-h3',
    label: 'Title H3',
    description: 'Card title — readable, compact.',
    style: {
      font_size: '18',
      font_size_unit: 'px',
      font_weight: '600',
      line_height: '1.3',
      letter_spacing: '0',
      text_transform: 'none',
      font_style: 'normal',
      text_decoration: 'none',
    },
  },
  {
    id: 'body',
    label: 'Body',
    description: 'Paragraph copy — comfortable line height.',
    style: {
      font_size: '14',
      font_size_unit: 'px',
      font_weight: '400',
      line_height: '1.55',
      letter_spacing: '0',
      text_transform: 'none',
      font_style: 'normal',
      text_decoration: 'none',
    },
  },
  {
    id: 'caption',
    label: 'Caption',
    description: 'Muted small text for footnotes / hints.',
    style: {
      font_size: '12',
      font_size_unit: 'px',
      font_weight: '400',
      line_height: '1.45',
      letter_spacing: '0',
      text_transform: 'none',
      font_style: 'normal',
      text_decoration: 'none',
    },
  },
  {
    id: 'eyebrow',
    label: 'Eyebrow',
    description: 'Small uppercase label that sits above a title.',
    style: {
      font_size: '11',
      font_size_unit: 'px',
      font_weight: '700',
      line_height: '1.2',
      letter_spacing: '1.2px',
      text_transform: 'uppercase',
      font_style: 'normal',
      text_decoration: 'none',
    },
  },
];
