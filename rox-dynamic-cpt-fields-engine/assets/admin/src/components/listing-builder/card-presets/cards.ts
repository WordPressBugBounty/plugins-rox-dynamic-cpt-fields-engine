/**
 * Starter card-preset library — refreshed for the new inspector.
 *
 * Six layouts that cover ~80% of the "I just need a card that looks
 * like X" requests we've seen during sprint testing:
 *
 *   - Blog Card        — featured image, eyebrow tags, title, byline,
 *                        excerpt, "Read more" link.
 *   - Product Card     — image, title, prominent price, pill CTA.
 *   - Property Card    — wide image, big price, address, outline CTA.
 *   - Author Card      — avatar, name, role eyebrow, profile link.
 *   - Event Card       — date eyebrow, title, location, RSVP solid CTA.
 *   - Minimal List     — title + tiny meta, no image (sidebars).
 *
 * Authoring rules — re-applied to every node here:
 *
 *   1. **px-only `letter_spacing`.** The Style-tab slider is locked to
 *      px so values like `"0.06em"` parse to `0.06px` (essentially
 *      zero) the moment an author re-opens the inspector. We bake
 *      eyebrow tracking as `"1px"` / `"1.2px"` instead — same visual
 *      effect at 11–13px font sizes.
 *   2. **No `style` block on `dynamic_image`** — that component
 *      doesn't expose typography/box settings; anything in there is
 *      silently ignored. The image's own `size` / `link_to` settings
 *      do all the work.
 *   3. **`border_radius` uses CSS shorthand** so the new
 *      SpacingControl can round-trip every preset value into its
 *      4-corner UI without surprises (`"12px"` for uniform,
 *      `"12px 12px 0 0"` for top-only).
 *   4. **CTAs declare both colors and hover colors** — the inspector
 *      now has a Default | Hover sub-tab, so a preset that doesn't
 *      ship with a hover state looks half-finished there.
 *
 * `applyPreset()` deep-merges this `style` object on top of each
 * descriptor's defaults, so any key we omit falls back to the
 * component's resting state. That keeps these recipes short and lets
 * future style additions (e.g. a future shadow control) light up
 * automatically.
 */

import type { CardPreset } from './types';

export const CARD_PRESETS: CardPreset[] = [
  // ── 1. Blog Card ────────────────────────────────────────────────
  {
    id: 'blog-card',
    label: 'Blog Card',
    description: 'Image, category eyebrow, title, byline, excerpt, read-more.',
    audience: ['blog', 'general'],
    tags: ['blog', 'magazine'],
    nodes: [
      {
        type: 'dynamic_image',
        settings: {
          source: 'featured_image',
          size: 'medium_large',
          link_to: 'post',
        },
      },
      {
        type: 'term_badges',
        settings: {
          taxonomy: 'category',
          render_mode: 'chip',
          limit: 2,
          style: {
            font_size: '11',
            font_size_unit: 'px',
            font_weight: '700',
            text_transform: 'uppercase',
            letter_spacing: '1px',
            color: '#675dd8',
            margin: '14px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'title',
          tag: 'h3',
          style: {
            font_size: '22',
            font_size_unit: 'px',
            font_weight: '700',
            line_height: '1.25',
            letter_spacing: '0',
            color: '#111827',
            margin: '10px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_meta',
        settings: {
          meta_type: 'date',
          iconType: 'dashicon',
          icon: 'dashicons-calendar-alt',
          style: {
            meta_flow: 'inline',
            font_size: '12',
            font_size_unit: 'px',
            color: '#6b7280',
            margin: '8px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_meta',
        settings: {
          meta_type: 'author',
          iconType: 'dashicon',
          icon: 'dashicons-admin-users',
          link_author: true,
          style: {
            meta_flow: 'inline',
            font_size: '12',
            font_size_unit: 'px',
            color: '#6b7280',
          },
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'excerpt',
          tag: 'p',
          format: 'html',
          style: {
            font_size: '14',
            font_size_unit: 'px',
            font_weight: '400',
            line_height: '1.6',
            color: '#4b5563',
            margin: '12px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_link',
        settings: {
          url_source: 'permalink',
          label_text: 'Read more',
          target: '_self',
          style: {
            font_size: '13',
            font_size_unit: 'px',
            font_weight: '600',
            text_decoration: 'none',
            color: '#675dd8',
            hover_color: '#4f46c1',
            margin: '14px 0 0 0',
          },
        },
      },
    ],
  },

  // ── 2. Product Card ─────────────────────────────────────────────
  {
    id: 'product-card',
    label: 'Product Card',
    description: 'Image, title, prominent price, pill "View product" CTA.',
    audience: ['product', 'general'],
    tags: ['shop', 'ecommerce'],
    nodes: [
      {
        type: 'dynamic_image',
        settings: {
          source: 'featured_image',
          size: 'medium',
          link_to: 'post',
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'title',
          tag: 'h3',
          style: {
            font_size: '16',
            font_size_unit: 'px',
            font_weight: '600',
            line_height: '1.3',
            color: '#111827',
            margin: '12px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'meta:_price',
          tag: 'span',
          format: 'currency',
          before: '$',
          style: {
            font_size: '22',
            font_size_unit: 'px',
            font_weight: '800',
            line_height: '1.1',
            color: '#111827',
            margin: '6px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_link',
        settings: {
          url_source: 'permalink',
          label_text: 'View product',
          target: '_self',
          style: {
            font_size: '13',
            font_size_unit: 'px',
            font_weight: '600',
            text_decoration: 'none',
            color: '#ffffff',
            hover_color: '#ffffff',
            background: '#675dd8',
            hover_background: '#4f46c1',
            padding: '10px 22px',
            border_radius: '999px',
            margin: '14px 0 0 0',
            width: 'auto',
          },
        },
      },
    ],
  },

  // ── 3. Property Card ────────────────────────────────────────────
  {
    id: 'property-card',
    label: 'Property Card',
    description: 'Hero image, big price, address, location meta, outline CTA.',
    audience: ['real-estate', 'general'],
    tags: ['real-estate', 'rental'],
    nodes: [
      {
        type: 'dynamic_image',
        settings: {
          source: 'featured_image',
          size: 'large',
          link_to: 'post',
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'meta:_price',
          tag: 'span',
          format: 'currency',
          before: '$',
          style: {
            font_size: '26',
            font_size_unit: 'px',
            font_weight: '800',
            line_height: '1.1',
            letter_spacing: '0',
            color: '#111827',
            margin: '14px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'title',
          tag: 'h3',
          style: {
            font_size: '16',
            font_size_unit: 'px',
            font_weight: '600',
            line_height: '1.35',
            color: '#374151',
            margin: '4px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_meta',
        settings: {
          meta_type: 'meta',
          iconType: 'dashicon',
          icon: 'dashicons-location',
          style: {
            meta_flow: 'inline',
            font_size: '12',
            font_size_unit: 'px',
            color: '#6b7280',
            margin: '8px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_link',
        settings: {
          url_source: 'permalink',
          label_text: 'View listing',
          target: '_self',
          style: {
            font_size: '13',
            font_size_unit: 'px',
            font_weight: '600',
            text_decoration: 'none',
            color: '#1f2937',
            hover_color: '#675dd8',
            background: 'transparent',
            hover_background: 'rgba(103, 93, 216, 0.08)',
            padding: '9px 20px',
            border_radius: '8px',
            margin: '16px 0 0 0',
            width: 'auto',
          },
        },
      },
    ],
  },

  // ── 4. Author Card ──────────────────────────────────────────────
  {
    id: 'author-card',
    label: 'Author Card',
    description: 'Avatar, name, role eyebrow, profile link — for team grids.',
    audience: ['people', 'general'],
    tags: ['team', 'directory'],
    nodes: [
      {
        type: 'dynamic_image',
        settings: {
          source: 'meta:avatar',
          size: 'thumbnail',
          link_to: 'post',
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'title',
          tag: 'h3',
          style: {
            font_size: '18',
            font_size_unit: 'px',
            font_weight: '700',
            line_height: '1.25',
            text_align: 'center',
            color: '#111827',
            margin: '12px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'meta:role',
          tag: 'p',
          style: {
            font_size: '11',
            font_size_unit: 'px',
            font_weight: '700',
            line_height: '1.2',
            text_transform: 'uppercase',
            letter_spacing: '1px',
            text_align: 'center',
            color: '#6b7280',
            margin: '4px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_link',
        settings: {
          url_source: 'permalink',
          label_text: 'View profile',
          target: '_self',
          style: {
            font_size: '13',
            font_size_unit: 'px',
            font_weight: '600',
            text_decoration: 'none',
            text_align: 'center',
            color: '#675dd8',
            hover_color: '#4f46c1',
            margin: '12px 0 0 0',
          },
        },
      },
    ],
  },

  // ── 5. Event Card ───────────────────────────────────────────────
  {
    id: 'event-card',
    label: 'Event Card',
    description: 'Date eyebrow, title, location meta, solid RSVP button.',
    audience: ['event', 'general'],
    tags: ['event', 'calendar'],
    nodes: [
      {
        type: 'dynamic_meta',
        settings: {
          meta_type: 'date',
          style: {
            font_size: '11',
            font_size_unit: 'px',
            font_weight: '700',
            line_height: '1.2',
            text_transform: 'uppercase',
            letter_spacing: '1.2px',
            color: '#675dd8',
          },
        },
      },
      {
        type: 'dynamic_text',
        settings: {
          source: 'title',
          tag: 'h3',
          style: {
            font_size: '22',
            font_size_unit: 'px',
            font_weight: '700',
            line_height: '1.2',
            color: '#111827',
            margin: '6px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_meta',
        settings: {
          meta_type: 'meta',
          iconType: 'dashicon',
          icon: 'dashicons-location-alt',
          style: {
            meta_flow: 'inline',
            font_size: '12',
            font_size_unit: 'px',
            color: '#6b7280',
            margin: '8px 0 0 0',
          },
        },
      },
      {
        type: 'dynamic_link',
        settings: {
          url_source: 'permalink',
          label_text: 'RSVP',
          target: '_self',
          style: {
            font_size: '13',
            font_size_unit: 'px',
            font_weight: '600',
            text_decoration: 'none',
            color: '#ffffff',
            hover_color: '#ffffff',
            background: '#1f2937',
            hover_background: '#111827',
            padding: '10px 20px',
            border_radius: '8px',
            margin: '16px 0 0 0',
            width: 'auto',
          },
        },
      },
    ],
  },

  // ── 6. Minimal List ─────────────────────────────────────────────
  {
    id: 'minimal-list',
    label: 'Minimal List',
    description: 'Title + tiny date meta, no image — perfect for sidebars.',
    audience: ['blog', 'general'],
    tags: ['sidebar', 'compact'],
    nodes: [
      {
        type: 'dynamic_text',
        settings: {
          source: 'title',
          tag: 'h4',
          style: {
            font_size: '15',
            font_size_unit: 'px',
            font_weight: '600',
            line_height: '1.35',
            color: '#111827',
          },
        },
      },
      {
        type: 'dynamic_meta',
        settings: {
          meta_type: 'date',
          style: {
            font_size: '11',
            font_size_unit: 'px',
            font_weight: '500',
            line_height: '1.4',
            color: '#9ca3af',
            margin: '4px 0 0 0',
          },
        },
      },
    ],
  },
];
