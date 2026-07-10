/**
 * Listing builder undo / redo stack.
 *
 * Wraps `setFormData` from `useState` with a simple linear history so
 * authors can roll back accidental drops, deletes, and inspector
 * changes via `Cmd+Z` / `Cmd+Shift+Z`. Modeled after a Memento
 * pattern — each "commit" pushes a snapshot onto the past stack and
 * clears the future stack; undo pops past → present → future, redo
 * does the reverse.
 *
 * Snapshots are debounced (180ms) so rapid keystrokes inside an
 * inspector text input collapse into a single undo step. This is the
 * same heuristic the WordPress core block editor uses internally.
 *
 * Memory ceiling is 30 snapshots — listing configs are tiny (<5KB
 * per snapshot for a typical card) so we burn ~150KB at the absolute
 * worst case. Cheap.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface HistoryControls<T> {
  /** Current state (the canonical value rendered by the form). */
  state: T;
  /** Drop-in replacement for a `useState` setter. Pushes onto the past stack on flush. */
  setState: (updater: T | ((prev: T) => T)) => void;
  /**
   * Force a snapshot commit immediately, bypassing the debounce.
   * Useful for "atomic" actions like drag-drop or duplicate where
   * the change is one logical step but spans multiple state updates.
   */
  commit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Reset the history (after a successful save, for instance). */
  reset: (next: T) => void;
}

export interface UseListingHistoryOptions {
  /** Max snapshots kept in the past stack. Defaults to 30. */
  limit?: number;
  /** Debounce window before a setState collapses into a snapshot. Defaults to 180ms. */
  debounceMs?: number;
}

export function useListingHistory<T>(
  initial: T,
  options: UseListingHistoryOptions = {}
): HistoryControls<T> {
  const { limit = 30, debounceMs = 180 } = options;

  const [state, setStateRaw] = useState<T>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const lastCommittedRef = useRef<T>(initial);
  const debounceTimerRef = useRef<number | null>(null);
  const [, force] = useState(0);

  const triggerRerender = () => force((n) => n + 1);

  const flush = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setStateRaw((current) => {
      if (current === lastCommittedRef.current) {
        return current;
      }
      pastRef.current = [...pastRef.current, lastCommittedRef.current].slice(-limit);
      futureRef.current = [];
      lastCommittedRef.current = current;
      triggerRerender();
      return current;
    });
  }, [limit]);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
          if (next !== lastCommittedRef.current) {
            pastRef.current = [...pastRef.current, lastCommittedRef.current].slice(-limit);
            futureRef.current = [];
            lastCommittedRef.current = next;
            triggerRerender();
          }
        }, debounceMs);
        return next;
      });
    },
    [debounceMs, limit]
  );

  const undo = useCallback(() => {
    flush();
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    setStateRaw((current) => {
      futureRef.current = [current, ...futureRef.current].slice(0, limit);
      lastCommittedRef.current = previous;
      return previous;
    });
    triggerRerender();
  }, [flush, limit]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    setStateRaw((current) => {
      pastRef.current = [...pastRef.current, current].slice(-limit);
      lastCommittedRef.current = next;
      return next;
    });
    triggerRerender();
  }, [limit]);

  const reset = useCallback((next: T) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pastRef.current = [];
    futureRef.current = [];
    lastCommittedRef.current = next;
    setStateRaw(next);
    triggerRerender();
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    setState,
    commit: flush,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    reset,
  };
}
