import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { ImportDiffItem, ImportResolutionPayload } from '../../services/api';

export type ConflictAction = 'overwrite' | 'skip' | 'rename';

interface ConflictModalProps {
  item: ImportDiffItem | null;
  initial: ImportResolutionPayload | undefined;
  onClose: () => void;
  onSave: (key: string, resolution: ImportResolutionPayload) => void;
}

export function ConflictModal({ item, initial, onClose, onSave }: ConflictModalProps) {
  const [action, setAction] = useState<ConflictAction>('overwrite');
  const [newSlug, setNewSlug] = useState('');

  useEffect(() => {
    if (!item) return;
    const a = initial?.action;
    if (a === 'skip' || a === 'keep') setAction('skip');
    else if (a === 'rename') {
      setAction('rename');
      setNewSlug(initial?.new_slug ?? `${item.slug}-imported`);
    } else {
      setAction('overwrite');
      setNewSlug('');
    }
  }, [item, initial]);

  if (!item) return null;

  const handleSave = () => {
    if (action === 'rename') {
      const s = newSlug.trim().toLowerCase().replace(/\s+/g, '-');
      onSave(item.key, { action: 'rename', new_slug: s });
    } else if (action === 'skip') {
      onSave(item.key, { action: 'skip' });
    } else {
      onSave(item.key, { action: 'overwrite' });
    }
    onClose();
  };

  return (
    <div className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-50 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-bg-black/40 rdcfe-p-4">
      <div
        className="rdcfe-relative rdcfe-w-full rdcfe-max-w-md rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdcfe-conflict-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="rdcfe-absolute rdcfe-right-3 rdcfe-top-3 rdcfe-rounded-lg rdcfe-p-1 rdcfe-text-gray-400 hover:rdcfe-bg-gray-100 hover:rdcfe-text-gray-600"
          aria-label="Close"
        >
          <X className="rdcfe-h-5 rdcfe-w-5" />
        </button>

        <div className="rdcfe-border-b rdcfe-border-gray-100 rdcfe-px-5 rdcfe-py-4">
          <h3 id="rdcfe-conflict-title" className="rdcfe-pr-8 rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900">
            Resolve import: {typeLabel(item.type)} “{item.slug}”
          </h3>
          <p className="rdcfe-mt-1 rdcfe-text-xs rdcfe-text-gray-500">
            An item with this slug already exists. Choose how to merge the import.
          </p>
        </div>

        <div className="rdcfe-space-y-3 rdcfe-px-5 rdcfe-py-4">
          <label className="rdcfe-flex rdcfe-cursor-pointer rdcfe-items-start rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-p-3 hover:rdcfe-bg-gray-50">
            <input
              type="radio"
              name="rdcfe-conflict-action"
              className="rdcfe-mt-0.5"
              checked={action === 'overwrite'}
              onChange={() => setAction('overwrite')}
            />
            <span>
              <span className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-800">Overwrite existing</span>
              <span className="rdcfe-mt-0.5 rdcfe-block rdcfe-text-xs rdcfe-text-gray-500">
                Replace the current configuration with values from the file.
              </span>
            </span>
          </label>

          <label className="rdcfe-flex rdcfe-cursor-pointer rdcfe-items-start rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-p-3 hover:rdcfe-bg-gray-50">
            <input
              type="radio"
              name="rdcfe-conflict-action"
              className="rdcfe-mt-0.5"
              checked={action === 'skip'}
              onChange={() => setAction('skip')}
            />
            <span>
              <span className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-800">Keep existing</span>
              <span className="rdcfe-mt-0.5 rdcfe-block rdcfe-text-xs rdcfe-text-gray-500">
                Skip this row; nothing from the file is applied for this slug.
              </span>
            </span>
          </label>

          <label className="rdcfe-flex rdcfe-cursor-pointer rdcfe-items-start rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-p-3 hover:rdcfe-bg-gray-50">
            <input
              type="radio"
              name="rdcfe-conflict-action"
              className="rdcfe-mt-0.5"
              checked={action === 'rename'}
              onChange={() => {
                setAction('rename');
                if (!newSlug) setNewSlug(`${item.slug}-imported`);
              }}
            />
            <span className="rdcfe-min-w-0 rdcfe-flex-1">
              <span className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-800">Import as new slug</span>
              <span className="rdcfe-mt-0.5 rdcfe-block rdcfe-text-xs rdcfe-text-gray-500">
                Creates a separate configuration using the slug below.
              </span>
              {action === 'rename' && (
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="rdcfe-mt-2 rdcfe-w-full rdcfe-rounded-md rdcfe-border rdcfe-border-gray-200 rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-sm"
                  placeholder="new-slug"
                  autoComplete="off"
                />
              )}
            </span>
          </label>
        </div>

        <div className="rdcfe-flex rdcfe-justify-end rdcfe-gap-2 rdcfe-border-t rdcfe-border-gray-100 rdcfe-px-5 rdcfe-py-3">
          <button
            type="button"
            onClick={onClose}
            className="rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={action === 'rename' && !newSlug.trim()}
            className="rdcfe-rounded-lg rdcfe-bg-indigo-600 rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-indigo-700 disabled:rdcfe-opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    post_type: 'Post Type',
    taxonomy: 'Taxonomy',
    field_group: 'Field Group',
    options_page: 'Options Page',
  };
  return map[t] ?? t;
}
