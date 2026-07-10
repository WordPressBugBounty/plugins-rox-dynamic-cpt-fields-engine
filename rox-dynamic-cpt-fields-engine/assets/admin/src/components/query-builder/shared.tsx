/**
 * Shared building blocks for the Query Builder tabs.
 *
 * `CollapsibleSection` + `FieldRow` mirror the same visual primitives
 * used in `MetaboxForm.tsx` so every Pro module reads the same
 * structurally — gradient-headed cards with chevron toggles plus a
 * 220px-label / fluid-input two-column row layout.
 *
 * `TabContentProps` is the shape every tab consumes — the parent
 * `QueryForm` owns the entire `QueryConfigData` blob and pushes
 * mutations down through `setData`.
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { QueryConfigData } from '../../services/api';

export interface TabContentProps {
  data: QueryConfigData;
  setData: (updater: (prev: QueryConfigData) => QueryConfigData) => void;
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rdcfe-card rdcfe-overflow-visible">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rdcfe-w-full rdcfe-px-6 rdcfe-py-4 rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-bg-gradient-to-r rdcfe-from-[hsl(var(--rdcfe-muted)/0.5)] rdcfe-to-transparent hover:rdcfe-from-[hsl(var(--rdcfe-muted)/0.7)] rdcfe-transition-all rdcfe-rounded-t-xl"
      >
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
          <div className="rdcfe-w-9 rdcfe-h-9 rdcfe-rounded-lg rdcfe-bg-[hsl(var(--rdcfe-accent))] rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-text-[hsl(var(--rdcfe-primary))]">
            {icon}
          </div>
          <span className="rdcfe-font-semibold rdcfe-text-[15px] rdcfe-text-[hsl(var(--rdcfe-foreground))]">
            {title}
          </span>
          {badge && (
            <span className="rdcfe-px-2.5 rdcfe-py-1 rdcfe-text-[11px] rdcfe-font-semibold rdcfe-rounded-full rdcfe-bg-[hsl(var(--rdcfe-primary)/0.1)] rdcfe-text-[hsl(var(--rdcfe-primary))]">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight
          className={`rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200 ${
            isOpen ? 'rdcfe-rotate-90' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="rdcfe-p-6 rdcfe-border-t rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export function FieldRow({
  label,
  hint,
  required,
  children,
  error,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="rdcfe-grid rdcfe-grid-cols-1 md:rdcfe-grid-cols-[220px_1fr] rdcfe-gap-4 rdcfe-items-start rdcfe-py-5 rdcfe-border-b rdcfe-border-[hsl(var(--rdcfe-border)/0.5)] last:rdcfe-border-b-0 last:rdcfe-pb-0 first:rdcfe-pt-0">
      <div className="rdcfe-flex rdcfe-flex-col rdcfe-gap-1">
        <label className="rdcfe-text-[14px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
          {label}
          {required && <span className="rdcfe-text-[hsl(var(--rdcfe-destructive))]">*</span>}
        </label>
        {hint && (
          <span className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-leading-relaxed">
            {hint}
          </span>
        )}
      </div>
      <div>
        {children}
        {error && (
          <p className="rdcfe-mt-2 rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-destructive))] rdcfe-flex rdcfe-items-center rdcfe-gap-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** Convert a comma/space-separated string of integers into an array. */
export function parseIdList(value: string): number[] {
  return value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Inverse of `parseIdList`. */
export function formatIdList(ids?: number[] | null): string {
  return Array.isArray(ids) ? ids.join(', ') : '';
}
