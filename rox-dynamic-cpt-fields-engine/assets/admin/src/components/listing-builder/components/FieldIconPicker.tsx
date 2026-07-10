/**
 * Optional dashicon or media image for a listing field item.
 *
 * Persists the same keys the Gutenberg block / Elementor widget use so
 * `BlockIconRenderer::merge_item_icon_settings()` picks them up on render.
 */

import { ImageIcon, Sparkles, X } from 'lucide-react';
import { IconPicker } from '../../ui/icon-picker';
import { InspectorRow } from '../shared';

export type FieldIconMode = '' | 'dashicon' | 'media';

export interface FieldIconValue {
  iconType?: FieldIconMode | string;
  icon?: string;
  iconMediaId?: number;
  iconMediaUrl?: string;
}

declare global {
  interface Window {
    wp?: {
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
  }
}

export function getEffectiveFieldIconMode(item: FieldIconValue): FieldIconMode {
  const explicit = String(item.iconType ?? '').trim();
  if (explicit === 'dashicon' || explicit === 'media') {
    return explicit;
  }
  return '';
}

function openMediaLibrary(onSelect: (id: number, url: string) => void): void {
  if (typeof window.wp === 'undefined' || !window.wp.media) {
    window.alert('WordPress media library is not available on this screen.');
    return;
  }

  const frame = window.wp.media({
    title: 'Select icon image',
    button: { text: 'Use this image' },
    library: { type: 'image' },
    multiple: false,
  });

  frame.on('select', () => {
    const attachment = frame.state().get('selection').first()?.toJSON();
    if (attachment?.id && attachment.url) {
      onSelect(attachment.id, attachment.url);
    }
  });

  frame.open();
}

interface FieldIconPickerProps {
  value: FieldIconValue;
  onChange: (patch: Partial<FieldIconValue>) => void;
}

export function FieldIconPicker({ value, onChange }: FieldIconPickerProps) {
  const mode = getEffectiveFieldIconMode(value);

  const setMode = (next: FieldIconMode) => {
    if (next === '') {
      onChange({
        iconType: '',
        icon: '',
        iconMediaId: 0,
        iconMediaUrl: '',
      });
      return;
    }
    if (next === 'dashicon') {
      onChange({
        iconType: 'dashicon',
        iconMediaId: 0,
        iconMediaUrl: '',
        icon: value.icon || 'dashicons-admin-generic',
      });
      return;
    }
    onChange({
      iconType: 'media',
      icon: '',
    });
  };

  const chipClass = (active: boolean) =>
    `rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-border rdcfe-transition-colors ${
      active
        ? 'rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white rdcfe-border-[hsl(var(--rdcfe-primary))]'
        : 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.4)]'
    }`;

  return (
    <InspectorRow
      label="Icon / Image"
      hint="Optional icon or small image shown before the field value."
    >
      <div className="rdcfe-space-y-3">
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-1.5">
          <button type="button" className={chipClass(mode === '')} onClick={() => setMode('')}>
            None
          </button>
          <button
            type="button"
            className={chipClass(mode === 'dashicon')}
            onClick={() => setMode('dashicon')}
          >
            <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1">
              <Sparkles className="rdcfe-w-3 rdcfe-h-3" />
              Icon
            </span>
          </button>
          <button
            type="button"
            className={chipClass(mode === 'media')}
            onClick={() => setMode('media')}
          >
            <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1">
              <ImageIcon className="rdcfe-w-3 rdcfe-h-3" />
              Image
            </span>
          </button>
        </div>

        {mode === 'dashicon' && (
          <IconPicker
            value={value.icon || 'dashicons-admin-generic'}
            onChange={(icon) =>
              onChange({
                iconType: 'dashicon',
                icon,
                iconMediaId: 0,
                iconMediaUrl: '',
              })
            }
            portal
            compact
          />
        )}

        {mode === 'media' && (
          <div className="rdcfe-space-y-2">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
              <button
                type="button"
                onClick={() =>
                  openMediaLibrary((id, url) =>
                    onChange({
                      iconType: 'media',
                      icon: '',
                      iconMediaId: id,
                      iconMediaUrl: url,
                    })
                  )
                }
                className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-3 rdcfe-py-2 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[hsl(var(--rdcfe-primary)/0.5)] rdcfe-transition-colors"
              >
                <ImageIcon className="rdcfe-w-4 rdcfe-h-4" />
                {value.iconMediaId ? 'Change image' : 'Select image'}
              </button>
              {value.iconMediaId ? (
                <button
                  type="button"
                  title="Remove image"
                  onClick={() =>
                    onChange({
                      iconType: '',
                      iconMediaId: 0,
                      iconMediaUrl: '',
                    })
                  }
                  className="rdcfe-w-8 rdcfe-h-8 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)]"
                >
                  <X className="rdcfe-w-4 rdcfe-h-4" />
                </button>
              ) : null}
            </div>
            {value.iconMediaUrl ? (
              <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-p-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white">
                <img
                  src={value.iconMediaUrl}
                  alt=""
                  className="rdcfe-w-8 rdcfe-h-8 rdcfe-object-contain rdcfe-rounded"
                />
                <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Attachment #{value.iconMediaId}
                </span>
              </div>
            ) : (
              <p className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                PNG, JPG, GIF, or SVG — shown at inline icon size on the card.
              </p>
            )}
          </div>
        )}
      </div>
    </InspectorRow>
  );
}
