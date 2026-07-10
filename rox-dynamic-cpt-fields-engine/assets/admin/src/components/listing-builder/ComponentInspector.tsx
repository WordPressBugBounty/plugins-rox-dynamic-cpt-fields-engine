/**
 * Component Inspector.
 *
 * Right-rail panel that dispatches to the per-type settings component
 * based on the currently-selected layer. Lifts the boilerplate
 * (no-selection state, header with type+remove button, wiring of the
 * `onChange` patcher) out of every settings panel so each one can
 * focus on its own controls.
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Sliders, Palette, Copy, ClipboardPaste } from 'lucide-react';
import { findComponent, removeComponent, updateComponentSettings, updateComponentVisibility, type BuilderProps } from './shared';
import { DynamicTextSettings } from './components/DynamicTextSettings';
import { DynamicImageSettings } from './components/DynamicImageSettings';
import { DynamicLinkSettings } from './components/DynamicLinkSettings';
import { DynamicMetaSettings } from './components/DynamicMetaSettings';
import { DynamicFieldsInlineSettings } from './components/DynamicFieldsInlineSettings';
import { TermBadgesSettings } from './components/TermBadgesSettings';
import { RepeaterOutputSettings } from './components/RepeaterOutputSettings';
import { StyleControls, type ListingComponentStyle } from './components/StyleControls';
import { StylePresetStrip } from './style-presets/StylePresetStrip';
import { copyStyle, getPastableStyle } from './style-presets/clipboard';
import { CardAppearancePanel } from './components/CardAppearancePanel';
import { VisibilityRulesBuilder } from './visibility/VisibilityRulesBuilder';
import { useQueryMetaKeys } from '../../hooks/useQueries';
import { useRelations } from '../../hooks/useRelations';
import type { ListingComponentType } from '../../services/api';

const TYPE_LABEL: Partial<Record<ListingComponentType, string>> = {
  dynamic_text: 'Dynamic Text',
  dynamic_image: 'Dynamic Image',
  dynamic_link: 'Dynamic Link',
  dynamic_meta: 'Dynamic Meta',
  dynamic_fields_inline: 'Inline Fields',
  term_badges: 'Term Badges',
  repeater_output: 'Repeater Output',
  post_content: 'Post Content',
  breadcrumbs: 'Breadcrumbs',
  post_nav: 'Post Navigation',
  comments: 'Comments Section',
  author_box: 'Author Box',
  share_buttons: 'Share Buttons',
  related_posts: 'Related Posts',
  archive_title: 'Archive Title',
  archive_description: 'Archive Description',
  pagination: 'Pagination',
  posts_count: 'Posts Count',
};

/**
 * Components that have a styled wrapper element on the rendered output.
 * The Style tab is hidden for the rest (e.g. `dynamic_image`,
 * `repeater_output` — their typography knobs aren't meaningful at the
 * wrapper level). Add a type here once its PHP renderer routes through
 * `AbstractComponent::build_attrs()`.
 */
const STYLE_ENABLED_TYPES = new Set<ListingComponentType>([
  'dynamic_text',
  'dynamic_link',
  'dynamic_meta',
  'dynamic_fields_inline',
  'term_badges',
]);

type InspectorTab = 'default' | 'style';

export function ComponentInspector({
  data,
  setData,
  selectedComponentId,
  setSelectedComponentId,
}: BuilderProps) {
  // ALL hook calls live at the top of the component — never inside or
  // after a conditional / early-return — so React always sees the
  // same count of hooks per render. Violating that yields the
  // "Rendered fewer hooks than expected" runtime error (#310 / #318
  // minified) the moment the user toggles the early-return branch.
  const [activeTab, setActiveTab] = useState<InspectorTab>('default');
  // Copy/Paste style — re-checks `sessionStorage` whenever the
  // selected type changes so the Paste button only lights up when the
  // clipboard holds a same-type style. We bump a tick on copy so the
  // header reflects "clipboard now holds something" without needing a
  // full re-render of the parent.
  const [clipboardTick, setClipboardTick] = useState(0);
  const [justCopied, setJustCopied] = useState(false);
  useEffect(() => {
    if (!justCopied) return;
    const handle = window.setTimeout(() => setJustCopied(false), 1100);
    return () => window.clearTimeout(handle);
  }, [justCopied]);

  const { data: relations = [] } = useRelations('publish');
  const { data: metaKeysResponse } = useQueryMetaKeys();
  const relationOptions = useMemo(
    () =>
      relations.map((r) => ({
        value: r.data.slug,
        label: r.title || r.data.slug,
      })),
    [relations]
  );
  const metaKeyOptions = useMemo(
    () => (metaKeysResponse?.meta_keys ?? []).map((k) => ({ value: k, label: k })),
    [metaKeysResponse?.meta_keys]
  );

  const component = selectedComponentId ? findComponent(data, selectedComponentId) : undefined;

  if (!component) {
    return <CardAppearancePanel data={data} setData={setData} />;
  }

  const onChange = (patch: Record<string, unknown>) => {
    setData((prev) => updateComponentSettings(prev, component.id, patch));
  };

  // Patch deep into `settings.style.*` so the parent ListingConfig still
  // has one canonical settings object — render() walks the same blob on
  // both PHP and TS sides.
  const onStyleChange = (patch: Partial<ListingComponentStyle>) => {
    const currentStyle = (component.settings?.style as ListingComponentStyle | undefined) ?? {};
    onChange({ style: { ...currentStyle, ...patch } });
  };

  const componentStyle =
    (component.settings?.style as ListingComponentStyle | undefined) ?? {};

  const handleRemove = () => {
    if (!window.confirm('Remove this component from the layout?')) return;
    setData((prev) => removeComponent(prev, component.id));
    setSelectedComponentId(null);
  };

  const showStyleTab = STYLE_ENABLED_TYPES.has(component.type);
  // If the user navigates from a style-enabled component to one that
  // doesn't expose styling, snap back to the Default tab so they aren't
  // staring at an empty panel.
  const tab: InspectorTab = !showStyleTab && activeTab === 'style' ? 'default' : activeTab;

  // The reads are intentionally tied to `clipboardTick` so the buttons
  // refresh without a global subscription. Re-read on selection change.
  void clipboardTick;
  const pastableStyle = showStyleTab ? getPastableStyle(component.type) : null;

  const handleCopyStyle = () => {
    copyStyle(component.type, componentStyle);
    setClipboardTick((n) => n + 1);
    setJustCopied(true);
  };

  const handlePasteStyle = () => {
    if (!pastableStyle) return;
    // Replace, don't merge — paste is "make this look exactly like the
    // source" (see clipboard.ts). Empty strings in the clipboard reset
    // matching keys on the target.
    onChange({ style: { ...pastableStyle } });
  };

  const handlePresetApply = (preset: { style: ListingComponentStyle }) => {
    onStyleChange(preset.style);
  };

  return (
    <div className="rdcfe-card rdcfe-overflow-visible">
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-5 rdcfe-py-3 rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-primary)/0.08)] rdcfe-to-transparent rdcfe-rounded-t-xl">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-min-w-0">
          <span className="rdcfe-text-[10px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Settings
          </span>
          <span className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-truncate">
            {TYPE_LABEL[component.type] ?? component.type}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedComponentId(null)}
          title="Close inspector"
          className="rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-white rdcfe-transition-colors"
        >
          <X className="rdcfe-w-4 rdcfe-h-4" />
        </button>
      </div>

      {showStyleTab && (
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1 rdcfe-px-3 rdcfe-pt-3 rdcfe-pb-0 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
          <TabButton
            active={tab === 'default'}
            onClick={() => setActiveTab('default')}
            icon={<Sliders className="rdcfe-w-3.5 rdcfe-h-3.5" />}
            label="Default"
          />
          <TabButton
            active={tab === 'style'}
            onClick={() => setActiveTab('style')}
            icon={<Palette className="rdcfe-w-3.5 rdcfe-h-3.5" />}
            label="Style"
          />
          <div className="rdcfe-ml-auto rdcfe-flex rdcfe-items-center rdcfe-gap-1">
            <button
              type="button"
              onClick={handleCopyStyle}
              title="Copy style"
              className="rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-white rdcfe-transition-colors"
            >
              <Copy className="rdcfe-w-3.5 rdcfe-h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePasteStyle}
              disabled={!pastableStyle}
              title={
                pastableStyle
                  ? 'Paste style from clipboard'
                  : 'Clipboard is empty or holds a different component type'
              }
              className={`rdcfe-w-7 rdcfe-h-7 rdcfe-rounded-md rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-transition-colors ${
                pastableStyle
                  ? 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-primary))] hover:rdcfe-bg-white'
                  : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground)/0.4)] rdcfe-cursor-not-allowed'
              }`}
            >
              <ClipboardPaste className="rdcfe-w-3.5 rdcfe-h-3.5" />
            </button>
            {justCopied && (
              <span className="rdcfe-text-[10px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-pl-1">
                Copied
              </span>
            )}
          </div>
        </div>
      )}

      <div
        className={`rdcfe-px-5 rdcfe-py-3 ${
          showStyleTab ? '' : 'rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]'
        }`}
      >
        {tab === 'default' && (
          <>
            {component.type === 'dynamic_text' && (
              <DynamicTextSettings component={component} data={data} onChange={onChange} />
            )}
            {component.type === 'dynamic_image' && (
              <DynamicImageSettings component={component} data={data} onChange={onChange} />
            )}
            {component.type === 'dynamic_link' && (
              <DynamicLinkSettings component={component} data={data} onChange={onChange} />
            )}
            {component.type === 'dynamic_meta' && (
              <DynamicMetaSettings component={component} onChange={onChange} />
            )}
            {component.type === 'dynamic_fields_inline' && (
              <DynamicFieldsInlineSettings component={component} data={data} onChange={onChange} />
            )}
            {component.type === 'term_badges' && (
              <TermBadgesSettings component={component} onChange={onChange} />
            )}
            {component.type === 'repeater_output' && (
              <RepeaterOutputSettings component={component} onChange={onChange} />
            )}
          </>
        )}

        {tab === 'style' && showStyleTab && (
          <>
            <StylePresetStrip
              type={component.type}
              style={componentStyle}
              onApply={handlePresetApply}
            />
            <StyleControls
              style={componentStyle}
              onChange={onStyleChange}
              showMetaFlow={component.type === 'dynamic_meta'}
            />
          </>
        )}
      </div>

      <div className="rdcfe-px-5 rdcfe-py-3 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
        <VisibilityRulesBuilder
          title="Visibility"
          hint="Hide this component for the current listing row when rules match. Evaluated on the server — hidden nodes emit no HTML."
          value={component.visibility}
          onChange={(next) =>
            setData((prev) => updateComponentVisibility(prev, component.id, next))
          }
          metaKeyOptions={metaKeyOptions}
          relationOptions={relationOptions}
        />
      </div>

      <div className="rdcfe-px-5 rdcfe-py-3 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-rounded-b-xl">
        <button
          type="button"
          onClick={handleRemove}
          className="rdcfe-w-full rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-text-[hsl(var(--rdcfe-destructive))] hover:rdcfe-bg-[hsl(0_84%_96%)] rdcfe-transition-colors"
        >
          Remove component
        </button>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-font-semibold rdcfe-rounded-md rdcfe-transition-colors ${
        active
          ? 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-shadow-sm rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))]'
          : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
