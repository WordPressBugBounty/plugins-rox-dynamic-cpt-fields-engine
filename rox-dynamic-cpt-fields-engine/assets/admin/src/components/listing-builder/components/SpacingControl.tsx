/**
 * SpacingControl — Elementor-style 4-side spacing input.
 *
 * Four `<input type="number">` steppers plus a "lock" chain toggle.
 * Used for **padding**, **margin**, and **border-radius**. All three
 * properties share the same `[a, b, c, d]` CSS shorthand collapse
 * rules (1/2/3/4 token forms expand identically), so a single
 * parser/serializer covers all of them — only the per-side labels
 * change (`TOP/RIGHT/BOTTOM/LEFT` vs `TL/TR/BR/BL`).
 *
 * All values are in `px`; the unit is fixed because the renderer only
 * needs simple shorthand and authors have asked for the simpler
 * control. Existing strings using `em` / `rem` / `%` (legacy
 * border-radius values such as `50%`) parse out their numeric portion
 * so saved templates round-trip without surprises — lossy on the unit
 * but predictable.
 *
 * Public contract: `value` is the same CSS shorthand string the parent
 * already stored (e.g. `"3px 10px"`, `"0 0 12px 0"`, `""`). The
 * control parses it on render and emits the canonical shorthand on
 * every change — all-equal values collapse to a single token, and an
 * all-zero state collapses to `""` so the renderer's "no inline
 * style" path keeps working.
 *
 * The local 4-tuple is recomputed from `value` via `useMemo` so the
 * parent stays the source of truth. We do not mirror it in
 * component state — that would risk drift across history (undo/redo)
 * snapshots.
 */

import { useMemo, useState } from 'react';
import { Link2, Link2Off } from 'lucide-react';

interface SpacingControlProps {
  /** CSS shorthand string. Empty / malformed → `[0,0,0,0]`. */
  value: string;
  /** Always emits a CSS shorthand — empty string when all sides are 0. */
  onChange: (next: string) => void;
  /** Allow negative numbers (margin yes, padding no). Defaults to `false`. */
  allowNegative?: boolean;
  /**
   * Per-side labels shown under each stepper, in this exact array
   * order: `[idx0, idx1, idx2, idx3]`. Padding/margin and
   * border-radius share the same `[a, b, c, d]` shorthand collapse
   * rules but use different conceptual side names — pass
   * `['TL','TR','BR','BL']` for border-radius. Defaults to padding's
   * `['TOP','RIGHT','BOTTOM','LEFT']`.
   */
  sideLabels?: [string, string, string, string];
}

/** Parsed sides — `[top, right, bottom, left]`. */
type Sides = [number, number, number, number];

const ZERO_SIDES: Sides = [0, 0, 0, 0];

/**
 * Parse a CSS shorthand string into a 4-tuple. Tolerant of:
 *
 *   - Empty / whitespace → `[0,0,0,0]`.
 *   - Non-px units (`em`, `rem`, `%`) → numeric part kept, unit
 *     dropped. Lossy but matches the "px-only" decision.
 *   - Negative values, decimals, missing values.
 *   - The four CSS shorthand forms (1, 2, 3, 4 tokens).
 */
function parseShorthand(input: string): Sides {
  const trimmed = (input ?? '').trim();
  if (trimmed === '') return [...ZERO_SIDES];

  const tokens = trimmed.split(/\s+/).map((token) => {
    const match = token.match(/^(-?\d*\.?\d+)/);
    return match ? Number(match[1]) : 0;
  });

  switch (tokens.length) {
    case 1:
      return [tokens[0], tokens[0], tokens[0], tokens[0]];
    case 2:
      return [tokens[0], tokens[1], tokens[0], tokens[1]];
    case 3:
      return [tokens[0], tokens[1], tokens[2], tokens[1]];
    default:
      return [tokens[0] ?? 0, tokens[1] ?? 0, tokens[2] ?? 0, tokens[3] ?? 0];
  }
}

/**
 * Serialize a 4-tuple back to the canonical shorthand. Tries to use
 * the shortest equivalent form so saved templates stay readable:
 *
 *   - All four equal & zero    → `""` (no inline style emitted).
 *   - All four equal           → `"4px"`.
 *   - Top===Bottom & L===R     → `"4px 8px"`.
 *   - Otherwise                → `"4px 8px 12px 8px"`.
 */
function formatShorthand(sides: Sides): string {
  const [t, r, b, l] = sides;
  if (t === 0 && r === 0 && b === 0 && l === 0) return '';
  if (t === r && r === b && b === l) return `${t}px`;
  if (t === b && r === l) return `${t}px ${r}px`;
  return `${t}px ${r}px ${b}px ${l}px`;
}

const DEFAULT_SIDE_LABELS: [string, string, string, string] = ['TOP', 'RIGHT', 'BOTTOM', 'LEFT'];

export function SpacingControl({
  value,
  onChange,
  allowNegative = false,
  sideLabels = DEFAULT_SIDE_LABELS,
}: SpacingControlProps) {
  const sides: Sides = useMemo(() => parseShorthand(value), [value]);

  // "Unset" means: parent stored an empty string AND the parsed
  // sides are all zero. In that state we render blank inputs (with a
  // `0` placeholder) instead of literally writing `0` four times —
  // the box defaults already give the renderer "no spacing", so the
  // UI shouldn't pretend the author has dialled in zeros on purpose.
  // The moment any side is non-zero, we drop the placeholder
  // treatment and show real numbers (including the other sides at
  // 0, because at that point those zeros _are_ meaningful).
  const isUnset =
    (value ?? '').trim() === '' && sides.every((n) => n === 0);

  // The lock defaults to "linked" only when every side already
  // matches — that way symmetrical existing values feel intentional
  // and editing one stepper updates them all in lockstep. Asymmetric
  // values default to unlinked so authors can keep them so.
  const [linked, setLinked] = useState<boolean>(() => {
    const [t, r, b, l] = parseShorthand(value);
    return t === r && r === b && b === l;
  });

  const update = (idx: 0 | 1 | 2 | 3, raw: number) => {
    const clamped = allowNegative ? raw : Math.max(0, raw);
    const next: Sides = linked
      ? [clamped, clamped, clamped, clamped]
      : [
          idx === 0 ? clamped : sides[0],
          idx === 1 ? clamped : sides[1],
          idx === 2 ? clamped : sides[2],
          idx === 3 ? clamped : sides[3],
        ];
    onChange(formatShorthand(next));
  };

  return (
    // `items-center` — inputs have labels underneath; `stretch` made the
    // link button as tall as the full column (awkward). Center keeps
    // the lock control compact next to the input row only.
    <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-1.5">
      <div className="rdcfe-flex rdcfe-items-stretch rdcfe-gap-1.5 rdcfe-flex-1 rdcfe-min-w-0">
        {sideLabels.map((label, i) => {
          const idx = i as 0 | 1 | 2 | 3;
          return (
            <SideInput
              key={`${idx}-${label}`}
              label={label}
              value={sides[idx]}
              showBlank={isUnset}
              onChange={(n) => update(idx, n)}
              allowNegative={allowNegative}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setLinked((prev) => !prev)}
        title={linked ? 'Unlink sides' : 'Link sides — edit one, update all'}
        className={`rdcfe-h-8 rdcfe-w-8 rdcfe-min-h-0 rdcfe-flex-shrink-0 rdcfe-rounded-md rdcfe-border rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-p-0 rdcfe-transition-colors ${
          linked
            ? 'rdcfe-bg-[hsl(var(--rdcfe-primary)/0.12)] rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-border-[hsl(var(--rdcfe-primary)/0.4)]'
            : 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-border-[hsl(var(--rdcfe-border))] hover:rdcfe-text-[hsl(var(--rdcfe-foreground))]'
        }`}
      >
        {linked ? (
          <Link2 className="rdcfe-w-3 rdcfe-h-3" />
        ) : (
          <Link2Off className="rdcfe-w-3 rdcfe-h-3" />
        )}
      </button>
    </div>
  );
}

interface SideInputProps {
  label: string;
  value: number;
  /** Render the input as blank with a `0` placeholder (unset state). */
  showBlank: boolean;
  onChange: (next: number) => void;
  allowNegative: boolean;
}

function SideInput({ label, value, showBlank, onChange, allowNegative }: SideInputProps) {
  // When the parent value is unset, show a placeholder rather than
  // literally writing `0` — the empty input clearly signals "no
  // spacing applied". An empty input event still resolves to `0` so
  // the lock behaviour and clamping continue to work.
  const displayValue = showBlank ? '' : Number.isFinite(value) ? value : 0;

  return (
    <div className="rdcfe-flex rdcfe-flex-col rdcfe-items-center rdcfe-gap-0.5 rdcfe-flex-1 rdcfe-min-w-0">
      <input
        type="number"
        value={displayValue}
        placeholder="0"
        min={allowNegative ? undefined : 0}
        step={1}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === '') {
            onChange(0);
            return;
          }
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        // `px-0` removes the inner horizontal padding so two/three-digit
        // values aren't clipped by the centred-text overflow. Spinner
        // controls hidden via `rdcfe-spin-none` (defined in the admin
        // CSS layer) — the steppers add a column of arrows that
        // double-clip wide values; the input still accepts up/down
        // keys for keyboard nudges.
        className="rdcfe-w-full rdcfe-min-w-0 rdcfe-px-0 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-text-center rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white focus:rdcfe-outline-none focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-1 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)] rdcfe-tabular-nums rdcfe-spin-none"
      />
      <span className="rdcfe-text-[9px] rdcfe-font-bold rdcfe-uppercase rdcfe-tracking-wider rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]">
        {label}
      </span>
    </div>
  );
}
