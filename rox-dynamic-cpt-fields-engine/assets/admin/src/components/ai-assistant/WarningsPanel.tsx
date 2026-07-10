/**
 * WarningsPanel - Errors / warnings / info bag with code grouping.
 *
 * Renders the validation bags returned by `aiApi.generate()` and
 * `aiApi.validate()`. Codes that the backend treats as gating
 * (`slug_conflict`, `unknown_reference`) appear in the "needs
 * acknowledgement" section with a checkbox the user must tick before
 * the Apply button enables.
 *
 * @package DynamicCPTFieldsEngine
 */

import { AlertTriangle, AlertCircle, Info, CheckCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WarningsPanelEntry {
  type?: 'info' | 'warning' | 'error' | 'success';
  message: string;
  code?: string;
  path?: string;
}

interface WarningsPanelProps {
  errors?: WarningsPanelEntry[];
  warnings?: WarningsPanelEntry[];
  /** Codes the backend insists must be explicitly acknowledged (slug_conflict, unknown_reference). */
  gatingCodes?: string[];
  acknowledgedCodes?: string[];
  onAcknowledgeChange?: (codes: string[]) => void;
}

const SEVERITY_PRESETS: Record<
  NonNullable<WarningsPanelEntry['type']>,
  { iconClass: string; rowClass: string; chipClass: string; Icon: typeof AlertTriangle }
> = {
  error: {
    iconClass: 'rdcfe-text-red-500',
    rowClass: 'rdcfe-border-red-100 rdcfe-bg-red-50/60',
    chipClass: 'rdcfe-bg-red-100 rdcfe-text-red-700',
    Icon: AlertCircle,
  },
  warning: {
    iconClass: 'rdcfe-text-amber-500',
    rowClass: 'rdcfe-border-amber-100 rdcfe-bg-amber-50/60',
    chipClass: 'rdcfe-bg-amber-100 rdcfe-text-amber-700',
    Icon: AlertTriangle,
  },
  info: {
    iconClass: 'rdcfe-text-blue-500',
    rowClass: 'rdcfe-border-blue-100 rdcfe-bg-blue-50/60',
    chipClass: 'rdcfe-bg-blue-100 rdcfe-text-blue-700',
    Icon: Info,
  },
  success: {
    iconClass: 'rdcfe-text-emerald-500',
    rowClass: 'rdcfe-border-emerald-100 rdcfe-bg-emerald-50/60',
    chipClass: 'rdcfe-bg-emerald-100 rdcfe-text-emerald-700',
    Icon: CheckCircle,
  },
};

function EntryRow({ entry, isError }: { entry: WarningsPanelEntry; isError?: boolean }) {
  const severity: NonNullable<WarningsPanelEntry['type']> = isError ? 'error' : entry.type ?? 'warning';
  const preset = SEVERITY_PRESETS[severity];
  const Icon = preset.Icon;
  return (
    <li className={cn('rdcfe-flex rdcfe-gap-2.5 rdcfe-rounded-lg rdcfe-border rdcfe-px-3 rdcfe-py-2 rdcfe-text-sm', preset.rowClass)}>
      <Icon className={cn('rdcfe-mt-0.5 rdcfe-h-4 rdcfe-w-4 rdcfe-flex-shrink-0', preset.iconClass)} />
      <div className="rdcfe-min-w-0 rdcfe-flex-1">
        <p className="rdcfe-text-gray-900">{entry.message}</p>
        {(entry.path || entry.code) && (
          <p className="rdcfe-mt-0.5 rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-gap-2 rdcfe-text-[11px] rdcfe-text-gray-500">
            {entry.path && (
              <span className="rdcfe-font-mono rdcfe-text-gray-500">{entry.path}</span>
            )}
            {entry.code && (
              <span className={cn('rdcfe-rounded rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[10px] rdcfe-font-medium', preset.chipClass)}>
                {entry.code}
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

export function WarningsPanel({
  errors = [],
  warnings = [],
  gatingCodes = [],
  acknowledgedCodes = [],
  onAcknowledgeChange,
}: WarningsPanelProps) {
  const gatingWarnings = warnings.filter((w) => w.code && gatingCodes.includes(w.code));
  const otherWarnings = warnings.filter((w) => !w.code || !gatingCodes.includes(w.code));
  const ackedSet = new Set(acknowledgedCodes);
  const uniqueGatingCodes = Array.from(new Set(gatingWarnings.map((w) => w.code ?? '')));

  const toggleAcknowledge = (code: string) => {
    if (!onAcknowledgeChange) return;
    if (ackedSet.has(code)) {
      onAcknowledgeChange(acknowledgedCodes.filter((c) => c !== code));
    } else {
      onAcknowledgeChange([...acknowledgedCodes, code]);
    }
  };

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-xl rdcfe-border rdcfe-border-emerald-100 rdcfe-bg-emerald-50/60 rdcfe-px-4 rdcfe-py-3 rdcfe-text-sm rdcfe-text-emerald-800">
        <CheckCircle className="rdcfe-h-4 rdcfe-w-4 rdcfe-text-emerald-500" />
        Schema is valid. No warnings.
      </div>
    );
  }

  return (
    <div className="rdcfe-space-y-3">
      {errors.length > 0 && (
        <div>
          <div className="rdcfe-mb-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-red-700">
            <AlertCircle className="rdcfe-h-3.5 rdcfe-w-3.5" />
            Errors ({errors.length})
          </div>
          <ul className="rdcfe-space-y-2">
            {errors.map((entry, idx) => (
              <EntryRow key={`err-${idx}`} entry={entry} isError />
            ))}
          </ul>
        </div>
      )}

      {gatingWarnings.length > 0 && (
        <div>
          <div className="rdcfe-mb-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-amber-700">
            <ShieldAlert className="rdcfe-h-3.5 rdcfe-w-3.5" />
            Needs your acknowledgement ({gatingWarnings.length})
          </div>
          <ul className="rdcfe-space-y-2">
            {gatingWarnings.map((entry, idx) => (
              <EntryRow key={`gating-${idx}`} entry={entry} />
            ))}
          </ul>
          {uniqueGatingCodes.length > 0 && onAcknowledgeChange && (
            <div className="rdcfe-mt-3 rdcfe-space-y-1.5 rdcfe-rounded-lg rdcfe-border rdcfe-border-amber-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-2.5">
              {uniqueGatingCodes.map((code) => (
                <label key={code} className="rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-sm rdcfe-text-gray-800">
                  <input
                    type="checkbox"
                    checked={ackedSet.has(code)}
                    onChange={() => toggleAcknowledge(code)}
                    className="rdcfe-h-4 rdcfe-w-4 rdcfe-rounded rdcfe-border-gray-300 rdcfe-text-indigo-500 focus:rdcfe-ring-indigo-500/30"
                  />
                  <span>
                    I acknowledge <code className="rdcfe-rounded rdcfe-bg-amber-100 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-font-mono rdcfe-text-[11px] rdcfe-text-amber-800">{code}</code>{' '}
                    and want to apply anyway.
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {otherWarnings.length > 0 && (
        <div>
          <div className="rdcfe-mb-2 rdcfe-flex rdcfe-items-center rdcfe-gap-2 rdcfe-text-xs rdcfe-font-semibold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-gray-600">
            <Info className="rdcfe-h-3.5 rdcfe-w-3.5" />
            Notes ({otherWarnings.length})
          </div>
          <ul className="rdcfe-space-y-2">
            {otherWarnings.map((entry, idx) => (
              <EntryRow key={`info-${idx}`} entry={entry} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default WarningsPanel;
