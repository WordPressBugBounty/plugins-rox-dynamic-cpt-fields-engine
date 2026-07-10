/**
 * Slider + number input combo (Elementor-style).
 *
 * Used by typography knobs that benefit from "drag to find the right
 * value, then fine-tune by typing" — line-height, letter-spacing,
 * potentially future controls like opacity or letter-width. A tiny
 * shared component keeps the visual language consistent across the
 * Style tab.
 *
 * Two reasons to NOT mirror Elementor's full unit picker here:
 *   1. The author already asked for a px-only / unitless model.
 *   2. CSS values that look right at one unit rarely look right at
 *      another (`1.4` line-height vs `24px` line-height target very
 *      different visual rhythms) — keeping each property locked to
 *      one canonical unit removes a footgun.
 *
 * The component is **string-in / string-out** so the parent's
 * `style.<key>` storage shape doesn't change. Empty input emits the
 * empty string (so the renderer doesn't paint an inline style at
 * all). When `unit` is set, we always serialise with the unit
 * appended; when `unit` is `''` (line-height), we serialise as a
 * bare number.
 */

import { useId, useMemo } from 'react';

interface NumberSliderInputProps {
  /** Current value as a CSS string (e.g. `"1.4"`, `"24px"`, `""`). */
  value: string;
  /** Emits the new CSS string. Empty string when the field is cleared. */
  onChange: (next: string) => void;
  /** Slider/track minimum. */
  min: number;
  /** Slider/track maximum. */
  max: number;
  /** Slider step + number-input step. */
  step: number;
  /**
   * Unit suffix to append to the emitted string. `''` (default) means
   * a bare number is emitted — this is what `line-height` wants
   * because CSS treats a unitless line-height as a multiplier of the
   * font-size (almost always the right behaviour).
   */
  unit?: string;
  /**
   * Placeholder shown when the value is empty — also doubles as the
   * slider's resting position when nothing is set, so the thumb sits
   * at a sensible spot rather than at `min`.
   */
  placeholder?: number;
}

/**
 * Strip any trailing unit and return the numeric portion. Tolerates
 * `"1.4"`, `"24px"`, `"0.05em"`, `""`. Returns `null` when the input
 * is empty or unparsable so the caller can decide whether to show a
 * placeholder or a real number.
 */
function parseNumeric(input: string): number | null {
  const trimmed = (input ?? '').trim();
  if (trimmed === '') return null;
  const match = trimmed.match(/^(-?\d*\.?\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function NumberSliderInput({
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  placeholder,
}: NumberSliderInputProps) {
  const inputId = useId();
  const parsed = useMemo(() => parseNumeric(value), [value]);

  // Slider always needs a position. When the field is empty we drop
  // the thumb on the placeholder (or the midpoint as a final
  // fallback) without committing that as a real value.
  const sliderValue = parsed ?? placeholder ?? (min + max) / 2;

  const emit = (raw: number | null) => {
    if (raw === null) {
      onChange('');
      return;
    }
    const clamped = Math.min(max, Math.max(min, raw));
    onChange(`${clamped}${unit}`);
  };

  return (
    <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-2">
      <input
        id={`${inputId}-slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(event) => emit(Number(event.target.value))}
        className="rdcfe-flex-1 rdcfe-min-w-0 rdcfe-h-1.5 rdcfe-cursor-pointer rdcfe-accent-[hsl(var(--rdcfe-primary))]"
      />
      <div className="rdcfe-relative rdcfe-flex-shrink-0">
        <input
          id={`${inputId}-number`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={parsed ?? ''}
          placeholder={placeholder !== undefined ? String(placeholder) : ''}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              onChange('');
              return;
            }
            const num = Number(raw);
            emit(Number.isFinite(num) ? num : null);
          }}
          className={`rdcfe-w-[78px] rdcfe-px-2 rdcfe-py-1.5 rdcfe-text-[12px] rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white focus:rdcfe-outline-none focus:rdcfe-border-[hsl(var(--rdcfe-primary))] focus:rdcfe-ring-1 focus:rdcfe-ring-[hsl(var(--rdcfe-primary)/0.2)] rdcfe-tabular-nums rdcfe-spin-none ${
            unit !== '' ? 'rdcfe-pr-7' : ''
          }`}
        />
        {unit !== '' && (
          <span className="rdcfe-absolute rdcfe-right-2 rdcfe-top-1/2 -rdcfe-translate-y-1/2 rdcfe-text-[10px] rdcfe-font-semibold rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
