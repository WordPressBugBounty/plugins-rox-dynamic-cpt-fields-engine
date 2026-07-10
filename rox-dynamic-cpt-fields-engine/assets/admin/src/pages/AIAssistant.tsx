/**
 * AI Assistant page.
 *
 * Composes the small ai-assistant component bundle into the full
 * generate → review → apply pipeline. The page is gated behind
 * `<ProModuleGate>` and additionally checks the AI settings (`enabled`
 * + `has_api_key`) before letting the user hit Generate. Quick Start
 * presets only preload the **Prompt**; generating still uses OpenAI when configured.
 *
 * Layout reference:
 * ```
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │ Page header                                                 │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │ ModeSelector                                                │
 *  │ ContextSelector (modify_existing only)                      │
 *  │ PromptInput                                                 │
 *  │ [Generate Schema]                          [Reset]          │
 *  ├─────────────────────────┬───────────────────────────────────┤
 *  │ DiffSummary             │ SchemaPreview                     │
 *  ├─────────────────────────┴───────────────────────────────────┤
 *  │ WarningsPanel                                               │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │ Apply / Rollback / Last snapshot info                       │
 *  └─────────────────────────────────────────────────────────────┘
 *  Quick Start presets open from a header button (slide-over panel).
 * ```
 *
 * @package DynamicCPTFieldsEngine
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Undo2,
  CheckCircle2,
  KeyRound,
  LayoutGrid,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProModuleGate } from '@/components/ui/pro-feature-gate';
import { useProContext } from '@/contexts/ProContext';
import { useNotificationToast } from '@/components/ui/notification-toast';
import {
  useAITemplates,
  useAISettings,
  useGenerateAI,
  useValidateAI,
  useApplyAI,
  useRollbackAI,
  countSchemaItems,
} from '@/hooks/useAI';
import {
  ModeSelector,
  PromptInput,
  ContextSelector,
  SchemaPreview,
  DiffSummary,
  WarningsPanel,
  ApplyButton,
  TemplateCards,
  type PromptOptions,
  type WarningsPanelEntry,
} from '@/components/ai-assistant';
import type {
  AIApplyResponse,
  AIGenerateResponse,
  AIMode,
  AISchemaPayload,
  AITemplate,
} from '@/services/api';

/**
 * Codes the backend treats as gating warnings — see
 * `\RDCFE_Pro\AI\AIService::apply()`. Keep in sync with the PHP
 * allow-list.
 */
const GATING_WARNING_CODES = ['slug_conflict', 'unknown_reference'];

interface ContextState {
  selectedCpt: string;
  selectedFieldGroup: string | number;
}

interface ApplyOutcome {
  snapshotId: string;
  summary: AIApplyResponse['summary'];
  templateLabel?: string;
  appliedAt: number;
}

const DEFAULT_OPTIONS: PromptOptions = {
  include_queries: false,
  include_listings: false,
  include_relations: false,
};

const DEFAULT_CONTEXT: ContextState = {
  selectedCpt: '',
  selectedFieldGroup: '',
};

/**
 * Pretty-print a partial schema for the JSON editor. Returns an empty
 * string when there's nothing to show so the textarea looks empty
 * rather than `"{}"`.
 */
function prettyPrint(schema: Partial<AISchemaPayload> | null): string {
  if (!schema) return '';
  return JSON.stringify(schema, null, 2);
}

function buildWarningsPanelInput(
  generation: AIGenerateResponse | null,
  adhocEntries: WarningsPanelEntry[]
): { errors: WarningsPanelEntry[]; warnings: WarningsPanelEntry[] } {
  const errors: WarningsPanelEntry[] = [];
  const warnings: WarningsPanelEntry[] = [];

  if (generation) {
    for (const err of generation.errors ?? []) {
      errors.push({ type: 'error', message: err.message, code: err.code, path: err.path });
    }
    for (const validationErr of generation.validation?.errors ?? []) {
      errors.push({
        type: 'error',
        message: validationErr.message,
        code: validationErr.code,
        path: validationErr.path,
      });
    }
    for (const warning of generation.warnings ?? []) {
      warnings.push({
        type: warning.type ?? 'warning',
        message: warning.message,
        code: warning.code,
        path: warning.path,
      });
    }
    for (const validationWarning of generation.validation?.warnings ?? []) {
      warnings.push({
        type: 'warning',
        message: validationWarning.message,
        code: validationWarning.code,
        path: validationWarning.path,
      });
    }
  }

  return {
    errors: dedupeEntries([...errors, ...adhocEntries.filter((e) => e.type === 'error')]),
    warnings: dedupeEntries([...warnings, ...adhocEntries.filter((e) => e.type !== 'error')]),
  };
}

function dedupeEntries(entries: WarningsPanelEntry[]): WarningsPanelEntry[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.code ?? ''}|${e.path ?? ''}|${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function AIAssistant() {
  const { isPro } = useProContext();

  if (!isPro) {
    return (
      <ProModuleGate module="ai_assistant" moduleName="AI Assistant">
        <AIAssistantShell readonly />
      </ProModuleGate>
    );
  }

  return <AIAssistantShell />;
}

interface AIAssistantShellProps {
  readonly?: boolean;
}

function AIAssistantShell({ readonly = false }: AIAssistantShellProps) {
  const { showToast } = useNotificationToast();

  // Workflow state — reset together by handleReset() so we never leave
  // a half-stale combination (generation result without summary, etc).
  const [mode, setMode] = useState<AIMode>('create_new');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<PromptOptions>(DEFAULT_OPTIONS);
  const [context, setContext] = useState<ContextState>(DEFAULT_CONTEXT);
  const [generation, setGeneration] = useState<AIGenerateResponse | null>(null);
  const [schemaText, setSchemaText] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [acknowledgedCodes, setAcknowledgedCodes] = useState<string[]>([]);
  const [lastApply, setLastApply] = useState<ApplyOutcome | null>(null);
  const [draftTemplateLabel, setDraftTemplateLabel] = useState<string | null>(null);
  /** Slide-over panel for Quick Start templates (header button). */
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  /** Validation responses from manual edits in the JSON editor. */
  const [adhocValidation, setAdhocValidation] = useState<WarningsPanelEntry[]>([]);

  // Server-side state (settings + templates).
  const settingsQuery = useAISettings(!readonly);
  const templatesQuery = useAITemplates(!readonly);

  const generateMutation = useGenerateAI();
  const validateMutation = useValidateAI();
  const applyMutation = useApplyAI();
  const rollbackMutation = useRollbackAI();

  // Parse the editor text → schema object whenever it changes.
  const parsedSchema = useMemo<Partial<AISchemaPayload> | null>(() => {
    if (!schemaText.trim()) {
      return null;
    }
    try {
      const parsed = JSON.parse(schemaText) as Partial<AISchemaPayload>;
      return parsed;
    } catch {
      return null;
    }
  }, [schemaText]);

  useEffect(() => {
    if (!schemaText.trim()) {
      setParseError(null);
      return;
    }
    try {
      JSON.parse(schemaText);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [schemaText]);

  useEffect(() => {
    if (!quickStartOpen) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickStartOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [quickStartOpen]);

  const settings = settingsQuery.data;
  const isAiConfigured = Boolean(settings?.enabled && settings?.has_api_key);
  const itemCount = countSchemaItems(parsedSchema ?? generation?.schema ?? null);
  const isGenerating = generateMutation.isPending;
  const isValidating = validateMutation.isPending;
  const isApplying = applyMutation.isPending;
  const isRollingBack = rollbackMutation.isPending;

  const { errors, warnings } = buildWarningsPanelInput(generation, adhocValidation);
  const gatingWarningCodes = warnings
    .map((w) => w.code)
    .filter((c): c is string => typeof c === 'string' && GATING_WARNING_CODES.includes(c));
  const unacknowledgedGating = gatingWarningCodes.filter((c) => !acknowledgedCodes.includes(c));

  const handleReset = () => {
    setPrompt('');
    setOptions(DEFAULT_OPTIONS);
    setContext(DEFAULT_CONTEXT);
    setGeneration(null);
    setSchemaText('');
    setParseError(null);
    setAcknowledgedCodes([]);
    setAdhocValidation([]);
    setDraftTemplateLabel(null);
  };

  const handleGenerate = async () => {
    if (readonly) return;
    if (!isAiConfigured) {
      showToast('error', 'Add an OpenAI API key in Settings → AI Assistant first.');
      return;
    }
    if (!prompt.trim()) {
      showToast('error', 'Type a prompt before hitting Generate.');
      return;
    }

    if (mode === 'fix_schema') {
      const raw = schemaText.trim();
      if (!raw) {
        showToast('error', 'Paste the broken or partial JSON into the Schema editor (right), then Generate.');
        return;
      }
    }

    try {
      const requestContext: {
        selected_cpt?: string;
        selected_field_group?: string | number;
        existing_schema?: Record<string, unknown> | string;
      } = {
        selected_cpt: context.selectedCpt || undefined,
        selected_field_group: context.selectedFieldGroup || undefined,
      };

      if (mode === 'fix_schema') {
        const raw = schemaText.trim();
        try {
          requestContext.existing_schema = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          requestContext.existing_schema = raw;
        }
      }

      const result = await generateMutation.mutateAsync({
        mode,
        prompt: prompt.trim(),
        context: requestContext,
        options: {
          include_queries: options.include_queries,
          include_listings: options.include_listings,
          include_relations: options.include_relations,
        },
      });
      setGeneration(result);
      setSchemaText(prettyPrint(result.schema));
      setAcknowledgedCodes([]);
      setAdhocValidation([]);
      setDraftTemplateLabel(null);
      if (result.success) {
        showToast('success', 'Schema generated. Review the diff and apply when you\u2019re ready.');
      } else {
        showToast('warning', 'Schema generated with errors \u2014 fix them in the JSON editor before applying.');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'AI generation failed.');
    }
  };

  const handleRevalidate = async () => {
    if (readonly || !parsedSchema) return;
    try {
      const response = await validateMutation.mutateAsync(parsedSchema);
      const newEntries: WarningsPanelEntry[] = [];
      for (const e of response.errors ?? []) {
        newEntries.push({ type: 'error', message: e.message, code: e.code, path: e.path });
      }
      for (const w of response.warnings ?? []) {
        newEntries.push({ type: 'warning', message: w.message, code: w.code, path: w.path });
      }
      setAdhocValidation(newEntries);
      // Mirror the revalidated bag onto the generation snapshot so the
      // panel reflects the live state (rather than the original AI output).
      setGeneration((prev) =>
        prev
          ? {
              ...prev,
              errors: response.errors ?? [],
              validation: {
                valid: response.success,
                errors: response.errors ?? [],
                warnings: response.warnings ?? [],
              },
              warnings: (response.warnings ?? []).map((w) => ({
                type: 'warning' as const,
                message: w.message,
                code: w.code,
                path: w.path,
              })),
            }
          : prev
      );
      showToast(response.success ? 'success' : 'warning', response.success ? 'Schema is valid.' : 'Schema still has errors.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Validation failed.');
    }
  };

  const handleApply = async () => {
    if (readonly) return;
    const schemaToApply = parsedSchema ?? generation?.schema ?? null;
    if (!schemaToApply) {
      showToast('error', 'Generate or paste a schema first.');
      return;
    }
    try {
      const result = await applyMutation.mutateAsync({
        schema: schemaToApply,
        confirmedWarnings: acknowledgedCodes,
      });
      setLastApply({
        snapshotId: result.snapshot_id,
        summary: result.summary,
        appliedAt: Date.now(),
      });
      const summaryLine = `${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed.`;
      showToast(result.success ? 'success' : 'warning', `Schema applied. ${summaryLine}`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Apply failed.');
    }
  };

  const handleLoadTemplateIntoPrompt = (template: AITemplate) => {
    if (readonly) return;
    setMode('create_new');
    setPrompt(
      [
        `Start from the "${template.label}" preset and adapt it.`,
        '',
        ...((template.summary ?? []).map((line) => `- ${line}`)),
        '',
        '<your changes here — e.g. add a "rating" field to Property, drop the Agents CPT>',
      ].join('\n')
    );
    setDraftTemplateLabel(template.label);
    setQuickStartOpen(false);
    showToast('info', `Loaded "${template.label}" into the prompt. Edit it, then Generate Schema.`);
  };

  const handleRollback = async () => {
    if (readonly || !lastApply) return;
    try {
      const result = await rollbackMutation.mutateAsync(lastApply.snapshotId);
      showToast(
        'success',
        `Snapshot rolled back. Restored ${result.restored}${result.missing ? ` (${result.missing} skipped)` : ''}.`
      );
      setLastApply(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Rollback failed.');
    }
  };

  const generateDisabledReason = (() => {
    if (readonly) return 'AI Assistant is a Pro feature.';
    if (!isAiConfigured) return 'Connect OpenAI in Settings before generating.';
    if (mode === 'fix_schema' && !schemaText.trim()) {
      return 'Paste JSON to fix into the Schema editor first.';
    }
    if (!prompt.trim()) return 'Type a prompt to generate.';
    return null;
  })();

  const applyDisabledReason = (() => {
    if (readonly) return 'AI Assistant is a Pro feature.';
    if (!parsedSchema && !generation?.schema) return 'Generate or paste a schema first.';
    if (parseError) return 'Fix the JSON syntax error.';
    if (errors.length > 0) return 'Resolve all errors before applying.';
    if (unacknowledgedGating.length > 0) return 'Acknowledge gating warnings to enable Apply.';
    if (itemCount === 0) return 'Schema has zero items to apply.';
    return null;
  })();

  return (
    <div className="rdcfe-animate-fade-in rdcfe-space-y-6 rdcfe-p-6 rdcfe-mx-auto rdcfe-max-w-[1400px]">
      <header className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-start rdcfe-justify-between rdcfe-gap-4">
        <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3">
          <div className="rdcfe-flex rdcfe-h-12 rdcfe-w-12 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-xl rdcfe-bg-gradient-to-br rdcfe-from-indigo-500 rdcfe-to-purple-500 rdcfe-shadow-md rdcfe-shadow-indigo-500/30">
            <Bot className="rdcfe-h-6 rdcfe-w-6 rdcfe-text-white" />
          </div>
          <div>
            <h1 className="rdcfe-text-2xl rdcfe-font-bold rdcfe-text-gray-900 rdcfe-tracking-tight">AI Assistant</h1>
            <p className="rdcfe-mt-1 rdcfe-text-sm rdcfe-text-gray-500">
              Describe what you want — the assistant generates a schema for post types, taxonomies, fields, queries, listings, and relations.
            </p>
          </div>
        </div>
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-end rdcfe-gap-2">
          <button
            type="button"
            onClick={() => setQuickStartOpen(true)}
            disabled={readonly}
            className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-lg rdcfe-border rdcfe-border-indigo-200 rdcfe-bg-indigo-50 rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-indigo-800 hover:rdcfe-bg-indigo-100 rdcfe-transition-colors disabled:rdcfe-cursor-not-allowed disabled:rdcfe-opacity-50"
          >
            <LayoutGrid className="rdcfe-h-4 rdcfe-w-4" />
            Quick start templates
          </button>
        </div>
      </header>

      {!readonly && settingsQuery.isLoading && (
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-3 rdcfe-text-sm rdcfe-text-gray-600">
          <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
          Checking AI Assistant configuration…
        </div>
      )}

      {!readonly && settingsQuery.data && !isAiConfigured && (
        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-between rdcfe-gap-3 rdcfe-rounded-xl rdcfe-border rdcfe-border-amber-200 rdcfe-bg-amber-50 rdcfe-px-4 rdcfe-py-3">
          <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-2 rdcfe-text-sm rdcfe-text-amber-900">
            <AlertTriangle className="rdcfe-mt-0.5 rdcfe-h-4 rdcfe-w-4 rdcfe-flex-shrink-0 rdcfe-text-amber-600" />
            <div>
              <p className="rdcfe-font-semibold">OpenAI is not configured</p>
              <p className="rdcfe-mt-0.5 rdcfe-text-xs">
                {settingsQuery.data.has_api_key
                  ? 'AI Assistant is disabled — flip the toggle in Settings → AI Assistant to enable it.'
                  : 'Add your API key in Settings → AI Assistant to start generating schemas.'}{' '}
                You can still open Quick start templates and load them into the Prompt — add a key to Generate Schema.
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-lg rdcfe-bg-amber-500 rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-xs rdcfe-font-semibold rdcfe-text-white hover:rdcfe-bg-amber-600 rdcfe-transition-colors"
          >
            <KeyRound className="rdcfe-h-3.5 rdcfe-w-3.5" />
            Open Settings
          </Link>
        </div>
      )}

      <section className="rdcfe-space-y-4 rdcfe-rounded-2xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-p-5 rdcfe-shadow-sm">
        <div>
          <h2 className="rdcfe-mb-2 rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">Mode</h2>
          <ModeSelector value={mode} onChange={setMode} disabled={readonly || isGenerating} />
        </div>

        {mode === 'modify_existing' && (
          <div>
            <h2 className="rdcfe-mb-2 rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">Context</h2>
            <ContextSelector
              selectedCpt={context.selectedCpt}
              selectedFieldGroup={context.selectedFieldGroup}
              onChange={setContext}
              disabled={readonly || isGenerating}
            />
          </div>
        )}

        <div>
          <h2 className="rdcfe-mb-2 rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">
            Prompt
            {draftTemplateLabel && (
              <span className="rdcfe-ml-2 rdcfe-rounded-full rdcfe-bg-indigo-50 rdcfe-px-2 rdcfe-py-0.5 rdcfe-text-[11px] rdcfe-font-medium rdcfe-text-indigo-700">
                Draft from “{draftTemplateLabel}”
              </span>
            )}
          </h2>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            options={options}
            onOptionsChange={setOptions}
            disabled={readonly || isGenerating}
          />
        </div>

        <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-between rdcfe-gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={readonly}
            className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50 rdcfe-transition-colors disabled:rdcfe-opacity-50"
          >
            <RotateCcw className="rdcfe-h-3.5 rdcfe-w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={readonly || isGenerating || Boolean(generateDisabledReason)}
            title={generateDisabledReason ?? undefined}
            className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-xl rdcfe-bg-indigo-500 rdcfe-px-5 rdcfe-py-2.5 rdcfe-text-sm rdcfe-font-semibold rdcfe-text-white rdcfe-shadow-sm hover:rdcfe-bg-indigo-600 rdcfe-transition-colors disabled:rdcfe-cursor-not-allowed disabled:rdcfe-bg-gray-300"
          >
            {isGenerating ? (
              <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
            ) : (
              <Sparkles className="rdcfe-h-4 rdcfe-w-4" />
            )}
            {isGenerating ? 'Generating…' : 'Generate Schema'}
          </button>
        </div>
      </section>

      <section className="rdcfe-grid rdcfe-grid-cols-1 lg:rdcfe-grid-cols-2 rdcfe-gap-4">
        <div className="rdcfe-flex rdcfe-flex-col">
          <h2 className="rdcfe-mb-2 rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">What will be created</h2>
          <div className="rdcfe-flex-1">
            <DiffSummary schema={parsedSchema ?? generation?.schema ?? null} summary={generation?.summary} />
          </div>
        </div>

        <div className="rdcfe-flex rdcfe-flex-col">
          <div className="rdcfe-mb-2 rdcfe-flex rdcfe-items-center rdcfe-justify-between">
            <h2 className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">Schema editor</h2>
            <button
              type="button"
              onClick={handleRevalidate}
              disabled={readonly || !parsedSchema || isValidating}
              className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50 rdcfe-transition-colors disabled:rdcfe-opacity-50"
            >
              {isValidating ? (
                <Loader2 className="rdcfe-h-3 rdcfe-w-3 rdcfe-animate-spin" />
              ) : (
                <CheckCircle2 className="rdcfe-h-3 rdcfe-w-3" />
              )}
              Re-validate
            </button>
          </div>
          <div className="rdcfe-flex-1">
            <SchemaPreview
              schema={parsedSchema}
              text={schemaText}
              onTextChange={(t) => {
                setSchemaText(t);
                setAdhocValidation([]);
              }}
              parseError={parseError}
              editable={!readonly}
            />
          </div>
        </div>
      </section>

      {(generation || errors.length > 0 || warnings.length > 0) && (
        <section>
          <h2 className="rdcfe-mb-2 rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">Validation</h2>
          <WarningsPanel
            errors={errors}
            warnings={warnings}
            gatingCodes={GATING_WARNING_CODES}
            acknowledgedCodes={acknowledgedCodes}
            onAcknowledgeChange={readonly ? undefined : setAcknowledgedCodes}
          />
        </section>
      )}

      <section className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-end rdcfe-justify-between rdcfe-gap-4 rdcfe-rounded-2xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-p-5 rdcfe-shadow-sm">
        <div className="rdcfe-min-w-0 rdcfe-flex-1">
          {lastApply ? (
            <div className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-text-sm">
              <CheckCircle2 className="rdcfe-mt-0.5 rdcfe-h-4 rdcfe-w-4 rdcfe-flex-shrink-0 rdcfe-text-emerald-500" />
              <div className="rdcfe-min-w-0">
                <p className="rdcfe-font-semibold rdcfe-text-gray-900">
                  Last apply succeeded
                  {lastApply.templateLabel ? ` (${lastApply.templateLabel})` : ''}
                </p>
                <p className="rdcfe-mt-0.5 rdcfe-text-xs rdcfe-text-gray-500">
                  Snapshot{' '}
                  <code className="rdcfe-rounded rdcfe-bg-gray-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[11px]">
                    {lastApply.snapshotId}
                  </code>{' '}
                  — created {lastApply.summary.created}, updated {lastApply.summary.updated}, failed {lastApply.summary.failed}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRollback}
                disabled={readonly || isRollingBack}
                className="rdcfe-ml-2 rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1.5 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50 rdcfe-transition-colors disabled:rdcfe-opacity-50"
              >
                {isRollingBack ? (
                  <Loader2 className="rdcfe-h-3 rdcfe-w-3 rdcfe-animate-spin" />
                ) : (
                  <Undo2 className="rdcfe-h-3 rdcfe-w-3" />
                )}
                Roll back
              </button>
            </div>
          ) : (
            <p className="rdcfe-text-sm rdcfe-text-gray-500">
              Once you apply a schema, a snapshot is created here so you can roll back with one click.
            </p>
          )}
        </div>
        <ApplyButton
          onApply={handleApply}
          isApplying={isApplying}
          disabledReason={applyDisabledReason}
          itemCount={itemCount}
        />
      </section>

      {/* Quick Start templates — slide-over panel (header button) */}
      {quickStartOpen && (
        <div className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-[99999]" role="presentation">
          <button
            type="button"
            className="rdcfe-absolute rdcfe-inset-0 rdcfe-bg-black/40 rdcfe-backdrop-blur-[1px]"
            aria-label="Close templates panel"
            onClick={() => setQuickStartOpen(false)}
          />
          <div
            className="rdcfe-absolute rdcfe-inset-y-0 rdcfe-right-0 rdcfe-flex rdcfe-w-full rdcfe-max-w-lg rdcfe-min-w-0 rdcfe-flex-col rdcfe-border-l rdcfe-border-gray-200 rdcfe-bg-white rdcfe-shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rdcfe-quick-start-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rdcfe-flex rdcfe-shrink-0 rdcfe-items-start rdcfe-justify-between rdcfe-gap-3 rdcfe-border-b rdcfe-border-gray-100 rdcfe-px-4 rdcfe-py-3">
              <div className="rdcfe-min-w-0">
                <h2 id="rdcfe-quick-start-title" className="rdcfe-text-base rdcfe-font-semibold rdcfe-text-gray-900">
                  Quick start templates
                </h2>
                <p className="rdcfe-mt-0.5 rdcfe-text-xs rdcfe-text-gray-500">
                  Load a preset into the Prompt, edit it, then Generate Schema (OpenAI).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickStartOpen(false)}
                className="rdcfe-flex rdcfe-h-9 rdcfe-w-9 rdcfe-flex-shrink-0 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-text-gray-500 hover:rdcfe-bg-gray-100"
                aria-label="Close"
              >
                <X className="rdcfe-h-5 rdcfe-w-5" />
              </button>
            </div>
            <div className="rdcfe-min-h-0 rdcfe-min-w-0 rdcfe-flex-1 rdcfe-overflow-y-auto rdcfe-p-4">
              <TemplateCards
                layout="stack"
                templates={templatesQuery.data ?? []}
                isLoading={templatesQuery.isLoading}
                onUseInPrompt={handleLoadTemplateIntoPrompt}
                disabled={readonly}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
