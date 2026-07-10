/**
 * Per-module "Generate with AI" button + mini-prompt modal.
 *
 * Renders a compact button that opens a modal where the user describes
 * what they want. On "Generate" the modal hits
 * `POST /rdcfe/v1/ai/module-generate` with the module type + prompt,
 * then surfaces the suggestion so the parent form can accept it into
 * its local state.
 *
 * @package DynamicCPTFieldsEngine
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Loader2,
  Sparkles,
  X,
  Check,
  AlertTriangle,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModuleGenerate } from '../../hooks/useModuleAI';
import { useAISettings } from '../../hooks/useAI';
import { useProContext } from '../../contexts/ProContext';
import type { AIModuleType, AIWarning } from '../../services/api';

/* ------------------------------------------------------------------ */
/*  AI field → MetaField mapper                                        */
/* ------------------------------------------------------------------ */

const WIDTH_MAP: Record<number, '100%' | '75%' | '66.6%' | '50%' | '33.3%' | '25%'> = {
  100: '100%',
  75: '75%',
  66: '66.6%',
  50: '50%',
  33: '33.3%',
  25: '25%',
};

/**
 * Convert a raw AI suggestion field into a full MetaField shape.
 * Exported so form pages can reuse it without duplicating the mapping.
 */
export function mapAIFieldToMetaField(
  f: Record<string, unknown>,
  index: number,
): import('../../hooks/usePostTypes').MetaField {
  const rawWidth = Number(f.width || 100);
  const closest = Object.keys(WIDTH_MAP)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - rawWidth) < Math.abs(prev - rawWidth) ? curr : prev));

  return {
    id: `ai_${Date.now()}_${index}`,
    object_type: 'field',
    type: String(f.type || 'text'),
    name: String(f.name || `field_${index}`),
    label: String(f.label || ''),
    description: String(f.instructions || ''),
    placeholder: String(f.placeholder || ''),
    default_value: String(f.default || f.default_value || ''),
    field_width: WIDTH_MAP[closest] ?? '100%',
    character_limit: null,
    required: !!f.required,
    quick_edit: false,
    revision_support: false,
    show_in_rest: true,
    conditional_logic: null,
    options: Array.isArray(f.choices)
      ? (f.choices as unknown[]).map((c) => {
          if (typeof c === 'string') return { label: c, value: c };
          const choice = c as Record<string, string>;
          return { label: choice.label || '', value: choice.value || '' };
        })
      : [],
  };
}

/* ------------------------------------------------------------------ */
/*  Module metadata (labels, placeholders, presets)                    */
/* ------------------------------------------------------------------ */

interface PromptPreset {
  /** Short title shown on the chip (4-6 words). */
  title: string;
  /** Optional emoji / icon char displayed before the title. */
  icon: string;
  /** Full prompt that gets dropped into the textarea on click. */
  prompt: string;
}

const MODULE_META: Record<
  AIModuleType,
  {
    label: string;
    placeholder: string;
    isPro: boolean;
    presets: PromptPreset[];
  }
> = {
  post_type: {
    label: 'Post Type',
    placeholder: 'e.g., Real estate properties with price, location, images',
    isPro: false,
    presets: [
      {
        icon: '🏠',
        title: 'Real Estate Property',
        prompt:
          'A real estate property post type with fields for price, bedrooms, bathrooms, square footage, address, gallery images, and property status (for sale/sold/rented).',
      },
      {
        icon: '🍔',
        title: 'Restaurant Menu',
        prompt:
          'A restaurant menu item post type with fields for description, price, ingredients, dietary tags (vegan/gluten-free/spicy), preparation time, calories, and featured image.',
      },
      {
        icon: '📅',
        title: 'Event / Workshop',
        prompt:
          'An event post type with fields for start date, end date, venue name, address, ticket price, capacity, organizer name, registration link, and featured image.',
      },
      {
        icon: '👥',
        title: 'Team Member',
        prompt:
          'A team member post type with fields for full name, job title, department, bio, profile photo, email, phone, and social media links (LinkedIn, Twitter).',
      },
      {
        icon: '📚',
        title: 'Online Course',
        prompt:
          'An online course post type with fields for short description, instructor, duration, price, difficulty level (beginner/intermediate/advanced), course image, and syllabus.',
      },
    ],
  },
  taxonomy: {
    label: 'Taxonomy',
    placeholder: 'e.g., Property types like apartment, villa, land',
    isPro: false,
    presets: [
      {
        icon: '🏷️',
        title: 'Product Categories',
        prompt:
          'A hierarchical product category taxonomy (electronics, clothing, furniture, books) attached to the products post type, with a description meta field per term.',
      },
      {
        icon: '📍',
        title: 'Locations / Cities',
        prompt:
          'A flat city taxonomy attached to property and event post types, with example terms like Dhaka, Chittagong, Sylhet, Khulna.',
      },
      {
        icon: '🎓',
        title: 'Skill Levels',
        prompt:
          'A flat skill level taxonomy attached to courses, with terms beginner, intermediate, advanced, expert.',
      },
      {
        icon: '🏢',
        title: 'Departments',
        prompt:
          'A hierarchical department taxonomy attached to team members, with terms like Engineering, Marketing, Sales, HR, Operations.',
      },
    ],
  },
  metabox: {
    label: 'Field Group',
    placeholder: 'e.g., Product details with price, color, size and stock fields',
    isPro: false,
    presets: [
      {
        icon: '💰',
        title: 'Pricing Details',
        prompt:
          'A pricing details field group with regular price (number), sale price (number), tax rate (number), currency (select: USD/EUR/BDT), and stock status (select: in stock/out of stock/preorder).',
      },
      {
        icon: '📱',
        title: 'Contact Information',
        prompt:
          'A contact information field group with email, phone number, alternate phone, address (textarea), city, country (select), and Google Maps URL.',
      },
      {
        icon: '🎨',
        title: 'Design Settings',
        prompt:
          'A design settings field group with primary color (color picker), secondary color (color picker), logo (image), favicon (image), and font family (select).',
      },
      {
        icon: '📊',
        title: 'SEO Meta',
        prompt:
          'An SEO meta field group with meta title, meta description (textarea, max 160 chars), focus keyword, OG image, and noindex toggle.',
      },
    ],
  },
  options_page: {
    label: 'Options Page',
    placeholder: 'e.g., Theme settings with logo, colors, footer text',
    isPro: false,
    presets: [
      {
        icon: '🎨',
        title: 'Theme Settings',
        prompt:
          'A theme settings options page with logo (image), favicon (image), primary color, secondary color, footer text, and copyright notice.',
      },
      {
        icon: '🔗',
        title: 'Social Media Links',
        prompt:
          'A social media settings page with URLs for Facebook, Twitter, Instagram, LinkedIn, YouTube, TikTok, and a toggle to show/hide social icons in the header.',
      },
      {
        icon: '📞',
        title: 'Contact Info',
        prompt:
          'A site contact info options page with company name, email, phone, address (textarea), business hours, and an embedded map URL.',
      },
      {
        icon: '🔌',
        title: 'API Integrations',
        prompt:
          'An API integrations options page with fields for Google Maps API key, Mailchimp API key, Stripe publishable key, and a webhook URL.',
      },
    ],
  },
  query: {
    label: 'Query',
    placeholder: 'e.g., Show featured properties in Dhaka under 50 lakh',
    isPro: true,
    presets: [
      {
        icon: '⭐',
        title: 'Featured Properties',
        prompt:
          'A query that returns featured properties in Dhaka, ordered by price descending, 6 per page, only published posts.',
      },
      {
        icon: '📅',
        title: 'Upcoming Events',
        prompt:
          'A query for events with a start date >= today, ordered by start date ascending, 10 per page.',
      },
      {
        icon: '🔥',
        title: 'Latest Blog Posts',
        prompt:
          'A query for the latest 8 published blog posts, ordered by date descending, excluding sticky posts.',
      },
      {
        icon: '🛒',
        title: 'On-Sale Products',
        prompt:
          'A query for products where sale_price is not empty, ordered by sale price ascending, 12 per page.',
      },
    ],
  },
  listing: {
    label: 'Listing',
    placeholder: 'e.g., Property card layout showing image, title, price, and location',
    isPro: true,
    presets: [
      {
        icon: '🏘️',
        title: 'Property Card Grid',
        prompt:
          'A property card grid layout with featured image at top, title, price, bedroom/bathroom counts, location badge, and a "View Details" link.',
      },
      {
        icon: '🎉',
        title: 'Event Listing',
        prompt:
          'An event listing card with event image, date badge, title, venue, time, ticket price, and a "Register" button.',
      },
      {
        icon: '👤',
        title: 'Team Member Card',
        prompt:
          'A team member card with circular profile photo, name, job title, department badge, and social media icon links.',
      },
      {
        icon: '📰',
        title: 'Blog Post List',
        prompt:
          'A blog post list with thumbnail on the left, title, excerpt, author, publish date, and category badges on the right.',
      },
    ],
  },
  relation: {
    label: 'Relation',
    placeholder: 'e.g., Properties are managed by Agents',
    isPro: true,
    presets: [
      {
        icon: '🏠',
        title: 'Property → Agent',
        prompt:
          'A many-to-one relation where each property is managed by one agent, but each agent can manage multiple properties. Bidirectional.',
      },
      {
        icon: '✍️',
        title: 'Author → Books',
        prompt:
          'A one-to-many relation where each author can have multiple books, and each book belongs to a single author.',
      },
      {
        icon: '🎓',
        title: 'Course → Students',
        prompt:
          'A many-to-many relation where courses can have multiple enrolled students, and students can be enrolled in multiple courses.',
      },
      {
        icon: '🎬',
        title: 'Movie → Actors',
        prompt:
          'A many-to-many bidirectional relation where movies have multiple actors, and actors appear in multiple movies.',
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AIGenerateButtonProps {
  module: AIModuleType;
  /** Existing entity context passed to the backend (e.g. { existing_slug: 'property' }). */
  context?: Record<string, unknown>;
  /** Called with the suggestion when the user clicks "Accept". */
  onAccept: (suggestion: Record<string, unknown>) => void;
  /** Optional className applied to the trigger button. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIGenerateButton({
  module,
  context,
  onAccept,
  className = '',
}: AIGenerateButtonProps) {
  const navigate = useNavigate();
  const { isPro } = useProContext();
  const meta = MODULE_META[module];

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState<Record<string, unknown> | null>(null);
  const [summaryLines, setSummaryLines] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<AIWarning[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const generateMutation = useModuleGenerate();
  const { data: aiSettings } = useAISettings(isPro);

  const isConfigured = aiSettings?.enabled && aiSettings?.has_api_key;

  const handleOpen = useCallback(() => {
    if (!isPro) return;
    setOpen(true);
    setSuggestion(null);
    setSummaryLines([]);
    setWarnings([]);
    setPrompt('');
  }, [isPro]);

  const handleClose = useCallback(() => {
    setOpen(false);
    generateMutation.reset();
  }, [generateMutation]);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, handleClose]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    generateMutation.mutate(
      { module, prompt: prompt.trim(), context },
      {
        onSuccess: (data) => {
          setSuggestion(data.suggestion);
          setSummaryLines(data.summary ?? []);
          setWarnings(data.warnings ?? []);
        },
      }
    );
  }, [module, prompt, context, generateMutation]);

  const handleAccept = useCallback(() => {
    if (!suggestion) return;
    onAccept(suggestion);
    handleClose();
  }, [suggestion, onAccept, handleClose]);

  const handleOpenFullAssistant = useCallback(() => {
    const params = new URLSearchParams();
    if (context?.existing_slug) {
      params.set('context', String(context.existing_slug));
    }
    params.set('module', module);
    navigate(`/ai-assistant?${params.toString()}`);
  }, [navigate, module, context]);

  /* ----- Trigger button (minimal / secondary so it doesn't compete
        with the page's primary Save action) ------------------------ */

  const triggerButton = (
    <button
      type="button"
      onClick={handleOpen}
      disabled={!isPro}
      title={!isPro ? 'Upgrade to Pro to use AI generation' : `Generate ${meta.label} with AI`}
      className={`rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-2.5 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-font-medium rdcfe-rounded-md rdcfe-transition-colors rdcfe-duration-150 rdcfe-border ${
        isPro
          ? 'rdcfe-bg-white rdcfe-border-[#a78bfa]/40 rdcfe-text-[#6d28d9] hover:rdcfe-bg-[#f5f3ff] hover:rdcfe-border-[#7c3aed]/60'
          : 'rdcfe-bg-white rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-cursor-not-allowed rdcfe-opacity-70'
      } ${className}`}
    >
      <Sparkles className="rdcfe-w-3.5 rdcfe-h-3.5" />
      AI Generate
      {!isPro && (
        <span className="rdcfe-px-1 rdcfe-py-px rdcfe-text-[9px] rdcfe-font-bold rdcfe-rounded rdcfe-bg-amber-100 rdcfe-text-amber-700 rdcfe-leading-none">
          PRO
        </span>
      )}
    </button>
  );

  if (!open) return triggerButton;

  /* ----- Modal ---------------------------------------------------- */

  return (
    <>
      {triggerButton}

      {/* Backdrop */}
      <div
        className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-[99999] rdcfe-bg-black/40 rdcfe-backdrop-blur-sm rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          ref={modalRef}
          className="rdcfe-bg-white rdcfe-rounded-2xl rdcfe-shadow-2xl rdcfe-w-full rdcfe-max-w-lg rdcfe-max-h-[85vh] rdcfe-overflow-hidden rdcfe-animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-6 rdcfe-py-4 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border))]">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
              <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-gradient-to-br rdcfe-from-[#7c3aed] rdcfe-to-[#6d28d9] rdcfe-flex rdcfe-items-center rdcfe-justify-center">
                <Sparkles className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-white" />
              </div>
              <div>
                <h3 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                  Generate {meta.label}
                </h3>
                <p className="rdcfe-text-[12px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                  Describe what you need and AI will suggest settings
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rdcfe-w-8 rdcfe-h-8 rdcfe-rounded-lg rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors"
            >
              <X className="rdcfe-w-4 rdcfe-h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="rdcfe-px-6 rdcfe-py-5 rdcfe-overflow-y-auto rdcfe-max-h-[calc(85vh-140px)]">
            {/* Not configured banner */}
            {!isConfigured && (
              <div className="rdcfe-mb-4 rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-p-3 rdcfe-rounded-xl rdcfe-bg-amber-50 rdcfe-border rdcfe-border-amber-200">
                <AlertTriangle className="rdcfe-w-5 rdcfe-h-5 rdcfe-text-amber-600 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
                <div className="rdcfe-text-[13px] rdcfe-text-amber-800">
                  <p className="rdcfe-font-semibold">OpenAI is not configured</p>
                  <p className="rdcfe-mt-0.5">
                    Add an API key in{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/settings')}
                      className="rdcfe-underline rdcfe-font-medium"
                    >
                      Settings
                    </button>{' '}
                    to enable AI generation.
                  </p>
                </div>
              </div>
            )}

            {/* Prompt input */}
            {!suggestion && (
              <>
                <label className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2 rdcfe-block">
                  Describe your {meta.label.toLowerCase()}
                </label>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={meta.placeholder}
                  rows={4}
                  maxLength={2000}
                  className="rdcfe-w-full rdcfe-rounded-xl rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-px-4 rdcfe-py-3 rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-placeholder-[hsl(var(--rdcfe-muted-foreground)/0.5)] focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[#7c3aed]/30 focus:rdcfe-border-[#7c3aed]/50 rdcfe-resize-none rdcfe-transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
                <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-mt-2">
                  <span className={`rdcfe-text-[11px] ${prompt.length > 1800 ? 'rdcfe-text-amber-600' : 'rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]'}`}>
                    {prompt.length}/2000
                  </span>
                  <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to generate
                  </span>
                </div>

                {/* Preset prompt templates — quick-start examples */}
                {meta.presets.length > 0 && (
                  <div className="rdcfe-mt-4 rdcfe-pt-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))]">
                    <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-mb-2.5">
                      <Lightbulb className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-text-amber-500" />
                      <span className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                        Quick examples
                      </span>
                      <span className="rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                        — click to insert
                      </span>
                    </div>
                    <div className="rdcfe-grid rdcfe-grid-cols-2 rdcfe-gap-2">
                      {meta.presets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPrompt(preset.prompt);
                            textareaRef.current?.focus();
                          }}
                          className="rdcfe-group rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-px-3 rdcfe-py-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white hover:rdcfe-border-[#7c3aed]/40 hover:rdcfe-bg-[#faf5ff] rdcfe-text-left rdcfe-transition-all"
                          title={preset.prompt}
                        >
                          <span className="rdcfe-text-[15px] rdcfe-leading-none rdcfe-mt-0.5">
                            {preset.icon}
                          </span>
                          <span className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-foreground))] group-hover:rdcfe-text-[#6d28d9] rdcfe-leading-tight">
                            {preset.title}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="rdcfe-mt-2 rdcfe-text-[11px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-italic">
                      Tip: examples include suggested fields — feel free to edit before generating.
                    </p>
                  </div>
                )}

                {/* Error display */}
                {generateMutation.isError && (
                  <div className="rdcfe-mt-3 rdcfe-p-3 rdcfe-rounded-lg rdcfe-bg-red-50 rdcfe-border rdcfe-border-red-200 rdcfe-text-[13px] rdcfe-text-red-700">
                    {generateMutation.error?.message || 'Generation failed. Please try again.'}
                  </div>
                )}
              </>
            )}

            {/* Suggestion preview */}
            {suggestion && (
              <div className="rdcfe-space-y-4">
                {/* Summary */}
                <div>
                  <h4 className="rdcfe-text-[13px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-mb-2">
                    AI Suggestions
                  </h4>
                  {summaryLines.length > 0 && (
                    <ul className="rdcfe-space-y-1.5">
                      {summaryLines.map((line, i) => (
                        <li
                          key={i}
                          className="rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]"
                        >
                          <Check className="rdcfe-w-4 rdcfe-h-4 rdcfe-text-emerald-500 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="rdcfe-p-3 rdcfe-rounded-lg rdcfe-bg-amber-50 rdcfe-border rdcfe-border-amber-200">
                    <h5 className="rdcfe-text-[12px] rdcfe-font-semibold rdcfe-text-amber-800 rdcfe-mb-1.5">
                      Warnings
                    </h5>
                    <ul className="rdcfe-space-y-1">
                      {warnings.map((w, i) => (
                        <li
                          key={i}
                          className="rdcfe-text-[12px] rdcfe-text-amber-700 rdcfe-flex rdcfe-items-start rdcfe-gap-1.5"
                        >
                          <AlertTriangle className="rdcfe-w-3.5 rdcfe-h-3.5 rdcfe-flex-shrink-0 rdcfe-mt-0.5" />
                          {w.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* JSON preview */}
                <details className="rdcfe-group">
                  <summary className="rdcfe-text-[12px] rdcfe-font-medium rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-cursor-pointer hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-select-none">
                    View raw JSON
                  </summary>
                  <pre className="rdcfe-mt-2 rdcfe-p-3 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-text-[11px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-overflow-x-auto rdcfe-max-h-48">
                    {JSON.stringify(suggestion, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-px-6 rdcfe-py-4 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)]">
            <button
              type="button"
              onClick={handleOpenFullAssistant}
              className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-transition-colors"
            >
              <ExternalLink className="rdcfe-w-3.5 rdcfe-h-3.5" />
              Open AI Assistant
            </button>

            <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
              {suggestion ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestion(null);
                      setSummaryLines([]);
                      setWarnings([]);
                      generateMutation.reset();
                    }}
                    className="rdcfe-px-4 rdcfe-py-2 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-lg rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-5 rdcfe-py-2 rdcfe-text-[13px] rdcfe-font-semibold rdcfe-rounded-lg rdcfe-bg-emerald-600 rdcfe-text-white hover:rdcfe-bg-emerald-700 rdcfe-transition-colors rdcfe-shadow-sm"
                  >
                    <Check className="rdcfe-w-4 rdcfe-h-4" />
                    Accept &amp; Fill Form
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rdcfe-px-4 rdcfe-py-2 rdcfe-text-[13px] rdcfe-font-medium rdcfe-rounded-lg rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || generateMutation.isPending || !isConfigured}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-px-5 rdcfe-py-2 rdcfe-text-[13px] rdcfe-font-semibold rdcfe-rounded-lg rdcfe-bg-gradient-to-r rdcfe-from-[#7c3aed] rdcfe-to-[#6d28d9] rdcfe-text-white hover:rdcfe-from-[#6d28d9] hover:rdcfe-to-[#5b21b6] rdcfe-transition-all rdcfe-shadow-sm disabled:rdcfe-opacity-50 disabled:rdcfe-cursor-not-allowed"
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="rdcfe-w-4 rdcfe-h-4 rdcfe-animate-spin" />
                    ) : (
                      <Sparkles className="rdcfe-w-4 rdcfe-h-4" />
                    )}
                    {generateMutation.isPending ? 'Generating…' : 'Generate'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
