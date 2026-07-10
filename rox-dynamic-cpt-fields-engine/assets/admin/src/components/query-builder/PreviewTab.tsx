import { useState } from 'react';
import { Play, Loader2, AlertTriangle, Info, AlertCircle, ExternalLink } from 'lucide-react';
import { Input } from '../ui';
import { CollapsibleSection, FieldRow, type TabContentProps } from './shared';
import { usePreviewDraftQuery } from '../../hooks/useQueries';
import type { QueryHealthWarning, QueryPreviewResult, QueryPreviewContext } from '../../services/api';

const LEVEL_META: Record<
  QueryHealthWarning['level'],
  { tone: string; bg: string; icon: typeof Info }
> = {
  info: { tone: 'hsl(217 91% 50%)', bg: 'hsl(217 91% 96%)', icon: Info },
  warning: { tone: 'hsl(38 92% 40%)', bg: 'hsl(38 92% 96%)', icon: AlertTriangle },
  error: { tone: 'hsl(0 84% 50%)', bg: 'hsl(0 84% 96%)', icon: AlertCircle },
};

function ResultsTable({ result }: { result: QueryPreviewResult }) {
  if (!result.results.length) {
    return (
      <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-p-8 rdcfe-text-center">
        <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
          No results — your filters might be too narrow, or the source set is empty.
        </p>
      </div>
    );
  }

  if (result.query_type === 'posts') {
    return (
      <div className="rdcfe-card">
        <div className="rdcfe-table-wrapper">
          <table className="rdcfe-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Title</th>
                <th style={{ width: '120px' }}>Type</th>
                <th style={{ width: '120px' }}>Date</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((row, i) => {
                const post = row as Record<string, unknown>;
                return (
                  <tr key={String(post.id ?? i)}>
                    <td className="rdcfe-font-mono rdcfe-text-[12px]">{String(post.id ?? '—')}</td>
                    <td className="rdcfe-font-medium">{String(post.title ?? '(no title)')}</td>
                    <td className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      {String(post.post_type ?? '—')}
                    </td>
                    <td className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      {String(post.date ?? '').slice(0, 10)}
                    </td>
                    <td className="rdcfe-text-[13px]">{String(post.status ?? '—')}</td>
                    <td>
                      {Boolean(post.permalink) && (
                        <a
                          href={String(post.permalink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rdcfe-btn rdcfe-btn-ghost rdcfe-btn-icon"
                          title="View post"
                        >
                          <ExternalLink className="rdcfe-h-3.5 rdcfe-w-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (result.query_type === 'terms') {
    return (
      <div className="rdcfe-card">
        <div className="rdcfe-table-wrapper">
          <table className="rdcfe-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th style={{ width: '120px' }}>Taxonomy</th>
                <th style={{ width: '80px' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((row, i) => {
                const term = row as Record<string, unknown>;
                return (
                  <tr key={String(term.id ?? i)}>
                    <td className="rdcfe-font-mono rdcfe-text-[12px]">{String(term.id ?? '—')}</td>
                    <td className="rdcfe-font-medium">{String(term.name ?? '(no name)')}</td>
                    <td className="rdcfe-font-mono rdcfe-text-[12px]">{String(term.slug ?? '—')}</td>
                    <td className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                      {String(term.taxonomy ?? '—')}
                    </td>
                    <td className="rdcfe-text-[13px]">{String(term.count ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // users
  return (
    <div className="rdcfe-card">
      <div className="rdcfe-table-wrapper">
        <table className="rdcfe-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Display Name</th>
              <th>Login</th>
              <th>Email</th>
              <th>Roles</th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((row, i) => {
              const user = row as Record<string, unknown>;
              const roles = Array.isArray(user.roles) ? user.roles.join(', ') : '—';
              return (
                <tr key={String(user.id ?? i)}>
                  <td className="rdcfe-font-mono rdcfe-text-[12px]">{String(user.id ?? '—')}</td>
                  <td className="rdcfe-font-medium">{String(user.display_name ?? '—')}</td>
                  <td className="rdcfe-font-mono rdcfe-text-[12px]">{String(user.login ?? '—')}</td>
                  <td className="rdcfe-text-[13px]">{String(user.email ?? '—')}</td>
                  <td className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">{roles}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PreviewTab({ data }: TabContentProps) {
  const [contextPostId, setContextPostId] = useState('');
  const [contextUserId, setContextUserId] = useState('');
  const [contextTermId, setContextTermId] = useState('');
  const [urlParamsRaw, setUrlParamsRaw] = useState('');

  const previewMutation = usePreviewDraftQuery();
  const result = previewMutation.data;
  const error = previewMutation.error;
  const isRunning = previewMutation.isPending;

  const buildContext = (): QueryPreviewContext => {
    const ctx: QueryPreviewContext = {};
    if (contextPostId.trim()) {
      const n = Number(contextPostId);
      if (Number.isFinite(n)) ctx.current_post_id = n;
    }
    if (contextTermId.trim()) {
      const n = Number(contextTermId);
      if (Number.isFinite(n)) ctx.current_term_id = n;
    }
    if (contextUserId.trim()) {
      const n = Number(contextUserId);
      if (Number.isFinite(n)) ctx.current_user_id = n;
    }
    if (urlParamsRaw.trim()) {
      const params: Record<string, string> = {};
      // Accept either "k=v&k2=v2" or "k: v, k2: v2" — be forgiving.
      urlParamsRaw
        .split(/[&\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((pair) => {
          const [rawKey, ...rest] = pair.split(/[=:]/);
          const key = rawKey?.trim();
          const value = rest.join('=').trim();
          if (key) params[key] = value;
        });
      if (Object.keys(params).length) ctx.url_params = params;
    }
    return ctx;
  };

  const runPreview = async () => {
    try {
      await previewMutation.mutateAsync({
        config: data,
        limit: 50,
        context: buildContext(),
      });
    } catch {
      // Mutation already exposes error state — nothing to do here.
    }
  };

  return (
    <div className="rdcfe-space-y-6">
      <CollapsibleSection
        title="Preview Context"
        icon={<Info className="rdcfe-w-5 rdcfe-h-5" />}
        defaultOpen={false}
      >
        <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
          Optional. Override what macros resolve to during preview — useful for testing how this query
          would behave on a specific post / term / user / URL.
        </p>
        <FieldRow label="current_post_id" hint="Override for {{current_post_id}}">
          <Input
            type="number"
            value={contextPostId}
            onChange={(e) => setContextPostId(e.target.value)}
            placeholder="e.g. 42"
            className="rdcfe-w-40"
          />
        </FieldRow>
        <FieldRow label="current_term_id" hint="Override for {{current_term_id}}">
          <Input
            type="number"
            value={contextTermId}
            onChange={(e) => setContextTermId(e.target.value)}
            placeholder="e.g. 12"
            className="rdcfe-w-40"
          />
        </FieldRow>
        <FieldRow label="current_user_id" hint="Override for {{current_user_id}} (defaults to logged-in user).">
          <Input
            type="number"
            value={contextUserId}
            onChange={(e) => setContextUserId(e.target.value)}
            placeholder="e.g. 5"
            className="rdcfe-w-40"
          />
        </FieldRow>
        <FieldRow
          label="URL Parameters"
          hint='Format: "key=value&key2=value2" — drives every {{url_param:...}} macro.'
        >
          <Input
            value={urlParamsRaw}
            onChange={(e) => setUrlParamsRaw(e.target.value)}
            placeholder="city=dhaka&min_price=50000"
          />
        </FieldRow>
      </CollapsibleSection>

      <div className="rdcfe-card rdcfe-p-6">
        <div className="rdcfe-mb-5">
          <div className="rdcfe-mb-2 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-gap-4">
            <h3 className="rdcfe-text-[16px] rdcfe-font-bold rdcfe-text-[hsl(var(--rdcfe-foreground))]">
              Live Preview
            </h3>
            <button
              type="button"
              onClick={runPreview}
              disabled={isRunning}
              className="rdcfe-btn rdcfe-btn-primary rdcfe-shrink-0 rdcfe-whitespace-nowrap"
            >
              {isRunning ? (
                <>
                  <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="rdcfe-h-4 rdcfe-w-4" />
                  Run Preview
                </>
              )}
            </button>
          </div>
          <p className="rdcfe-text-[13px] rdcfe-leading-relaxed rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
            Runs the current draft against your live database. Uses your Items Per Page (and offset)
            settings; each preview run is capped at 50 rows for safety.
          </p>
        </div>

        {error && (
          <div className="rdcfe-p-4 rdcfe-rounded-xl rdcfe-bg-[hsl(0_84%_96%)] rdcfe-border rdcfe-border-[hsl(0_84%_60%/0.3)] rdcfe-text-[hsl(0_84%_45%)] rdcfe-text-[14px] rdcfe-mb-4">
            {error instanceof Error ? error.message : 'Preview failed.'}
          </div>
        )}

        {result && (
          <>
            <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-3 rdcfe-mb-5">
              <span className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-text-[13px] rdcfe-font-semibold">
                {result.total} total
              </span>
              <span className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-text-[13px]">
                Showing {result.returned} row{result.returned === 1 ? '' : 's'}
              </span>
              <span className="rdcfe-px-3 rdcfe-py-1.5 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-muted))] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-text-[13px]">
                Type: <strong>{result.query_type}</strong>
              </span>
            </div>

            {result.warnings.length > 0 && (
              <div className="rdcfe-space-y-2 rdcfe-mb-5">
                {result.warnings.map((warning, i) => {
                  const meta = LEVEL_META[warning.level] ?? LEVEL_META.warning;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={`${warning.code}-${i}`}
                      className="rdcfe-flex rdcfe-items-start rdcfe-gap-3 rdcfe-p-3 rdcfe-rounded-lg"
                      style={{ background: meta.bg }}
                    >
                      <Icon
                        className="rdcfe-w-4 rdcfe-h-4 rdcfe-flex-shrink-0 rdcfe-mt-0.5"
                        style={{ color: meta.tone }}
                      />
                      <div className="rdcfe-flex-1">
                        <div
                          className="rdcfe-text-[13px] rdcfe-font-semibold"
                          style={{ color: meta.tone }}
                        >
                          {warning.code}
                        </div>
                        <div className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
                          {warning.message}
                        </div>
                        {warning.path && (
                          <code className="rdcfe-text-[11px] rdcfe-font-mono rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
                            path: {warning.path}
                          </code>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <ResultsTable result={result} />
          </>
        )}

        {!result && !error && !isRunning && (
          <div className="rdcfe-rounded-xl rdcfe-border rdcfe-border-dashed rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-[hsl(var(--rdcfe-muted)/0.3)] rdcfe-p-12 rdcfe-text-center">
            <Play className="rdcfe-w-10 rdcfe-h-10 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mx-auto rdcfe-mb-3" />
            <p className="rdcfe-text-[14px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
              Click <strong>Run Preview</strong> to test your query against the live database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
