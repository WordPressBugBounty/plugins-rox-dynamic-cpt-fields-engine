import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RotateCcw, Eye, Camera } from 'lucide-react';
import { toolsApi, type SnapshotListEntry } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

export function RollbackPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [retention, setRetention] = useState(5);
  const [snapshots, setSnapshots] = useState<SnapshotListEntry[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savingRetention, setSavingRetention] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await toolsApi.listSnapshots();
      setRetention(res.data.retention);
      setSnapshots(res.data.snapshots);
    } catch (e) {
      toast({
        title: 'Could not load snapshots',
        description: e instanceof Error ? e.message : 'Request failed.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRetention = async () => {
    setSavingRetention(true);
    try {
      const res = await toolsApi.setSnapshotRetention(retention);
      setRetention(res.data.retention);
      setSnapshots(res.data.snapshots);
      toast({ title: 'Retention updated', description: 'Older snapshots were removed if needed.' });
    } catch (e) {
      toast({
        title: 'Failed to update retention',
        description: e instanceof Error ? e.message : 'Request failed.',
        variant: 'destructive',
      });
    } finally {
      setSavingRetention(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!window.confirm('Restore this snapshot? Configurations not in the snapshot will be removed.')) return;
    setRestoringId(id);
    try {
      const res = await toolsApi.restoreSnapshot(id);
      if (res.data.success) {
        toast({ title: 'Snapshot restored', description: res.data.message });
        window.location.reload();
      } else {
        toast({
          title: 'Restore incomplete',
          description: res.data.message,
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: 'Restore failed',
        description: e instanceof Error ? e.message : 'Request failed.',
        variant: 'destructive',
      });
    } finally {
      setRestoringId(null);
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await toolsApi.getSnapshot(id);
      setPreview(JSON.stringify(res.data.export, null, 2));
    } catch (e) {
      toast({
        title: 'Preview failed',
        description: e instanceof Error ? e.message : 'Request failed.',
        variant: 'destructive',
      });
    }
  };

  const handleManualSnapshot = async () => {
    setCreating(true);
    try {
      await toolsApi.createSnapshot({ label: 'Manual snapshot' });
      await load();
      toast({ title: 'Snapshot saved', description: 'Current configuration export was stored.' });
    } catch (e) {
      toast({
        title: 'Snapshot failed',
        description: e instanceof Error ? e.message : 'Request failed.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-py-12 rdcfe-text-sm rdcfe-text-gray-600">
        <Loader2 className="rdcfe-h-5 rdcfe-w-5 rdcfe-animate-spin" />
        Loading snapshots…
      </div>
    );
  }

  return (
    <div className="rdcfe-space-y-4 rdcfe-rounded-xl rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-p-6">
      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-center rdcfe-justify-between rdcfe-gap-4">
        <div className="rdcfe-flex rdcfe-items-center rdcfe-gap-3">
          <div className="rdcfe-flex rdcfe-h-10 rdcfe-w-10 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-lg rdcfe-bg-violet-50">
            <History className="rdcfe-h-5 rdcfe-w-5 rdcfe-text-violet-600" />
          </div>
          <div>
            <h3 className="rdcfe-text-sm rdcfe-font-semibold rdcfe-text-gray-900 rdcfe-flex rdcfe-items-center rdcfe-gap-2">
              Rollback snapshots
              <span className="rdcfe-inline-flex rdcfe-items-center rdcfe-rounded rdcfe-bg-indigo-600 rdcfe-px-1.5 rdcfe-py-0.5 rdcfe-text-[10px] rdcfe-font-semibold rdcfe-uppercase rdcfe-text-white">
                Pro
              </span>
            </h3>
            <p className="rdcfe-text-xs rdcfe-text-gray-500">Automatic backups before Pro imports, plus manual captures.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleManualSnapshot()}
          disabled={creating}
          className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-2 rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50 disabled:rdcfe-opacity-50"
        >
          {creating ? <Loader2 className="rdcfe-h-4 rdcfe-w-4 rdcfe-animate-spin" /> : <Camera className="rdcfe-h-4 rdcfe-w-4" />}
          Save snapshot now
        </button>
      </div>

      <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-end rdcfe-gap-3">
        <div>
          <label htmlFor="rdcfe-snap-retention" className="rdcfe-block rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-600">
            Keep last N snapshots
          </label>
          <input
            id="rdcfe-snap-retention"
            type="number"
            min={1}
            max={50}
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
            className="rdcfe-mt-1 rdcfe-w-24 rdcfe-rounded-md rdcfe-border rdcfe-border-gray-200 rdcfe-px-2 rdcfe-py-1.5 rdcfe-text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void saveRetention()}
          disabled={savingRetention}
          className="rdcfe-rounded-lg rdcfe-bg-gray-800 rdcfe-px-4 rdcfe-py-2 rdcfe-text-sm rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-gray-900 disabled:rdcfe-opacity-50"
        >
          {savingRetention ? 'Saving…' : 'Apply limit'}
        </button>
      </div>

      {snapshots.length === 0 ? (
        <p className="rdcfe-text-sm rdcfe-text-gray-500">No snapshots yet. Enable “Create rollback snapshot” on your next Pro import, or save one manually.</p>
      ) : (
        <ul className="rdcfe-space-y-2">
          {snapshots.map((s) => (
            <li
              key={s.id}
              className="rdcfe-rounded-lg rdcfe-border rdcfe-border-gray-100 rdcfe-bg-gray-50 rdcfe-p-4"
            >
              <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-items-start rdcfe-justify-between rdcfe-gap-2">
                <div>
                  <p className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">{s.label || 'Snapshot'}</p>
                  <p className="rdcfe-text-xs rdcfe-text-gray-500">
                    {new Date(s.created_at).toLocaleString()}
                    {s.source ? ` · ${s.source}` : ''}
                  </p>
                  <SummaryLine summary={s.summary} />
                </div>
                <div className="rdcfe-flex rdcfe-flex-wrap rdcfe-gap-2">
                  <button
                    type="button"
                    onClick={() => void handlePreview(s.id)}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-rounded-md rdcfe-border rdcfe-border-gray-200 rdcfe-bg-white rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-xs rdcfe-font-medium rdcfe-text-gray-700 hover:rdcfe-bg-gray-50"
                  >
                    <Eye className="rdcfe-h-3.5 rdcfe-w-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRestore(s.id)}
                    disabled={restoringId === s.id}
                    className="rdcfe-inline-flex rdcfe-items-center rdcfe-gap-1 rdcfe-rounded-md rdcfe-bg-violet-600 rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-xs rdcfe-font-medium rdcfe-text-white hover:rdcfe-bg-violet-700 disabled:rdcfe-opacity-50"
                  >
                    {restoringId === s.id ? (
                      <Loader2 className="rdcfe-h-3.5 rdcfe-w-3.5 rdcfe-animate-spin" />
                    ) : (
                      <RotateCcw className="rdcfe-h-3.5 rdcfe-w-3.5" />
                    )}
                    Restore
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview !== null && (
        <div className="rdcfe-fixed rdcfe-inset-0 rdcfe-z-50 rdcfe-flex rdcfe-items-center rdcfe-justify-center rdcfe-bg-black/40 rdcfe-p-4">
          <div className="rdcfe-flex rdcfe-h-full rdcfe-max-h-[85vh] rdcfe-w-full rdcfe-max-w-3xl rdcfe-flex-col rdcfe-rounded-xl rdcfe-bg-white rdcfe-shadow-xl">
            <div className="rdcfe-flex rdcfe-items-center rdcfe-justify-between rdcfe-border-b rdcfe-border-gray-200 rdcfe-px-4 rdcfe-py-3">
              <span className="rdcfe-text-sm rdcfe-font-medium rdcfe-text-gray-900">Snapshot JSON</span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rdcfe-text-sm rdcfe-text-indigo-600 hover:rdcfe-text-indigo-800"
              >
                Close
              </button>
            </div>
            <pre className="rdcfe-flex-1 rdcfe-overflow-auto rdcfe-p-4 rdcfe-text-xs rdcfe-leading-relaxed">{preview}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryLine({ summary }: { summary: Record<string, unknown> }) {
  if (!summary || typeof summary !== 'object') return null;
  const parts: string[] = [];
  const pt = summary.post_types ?? summary.post_type;
  const tx = summary.taxonomies ?? summary.taxonomy;
  const fg = summary.field_groups;
  const op = summary.options_pages;
  if (typeof pt === 'number') parts.push(`${pt} CPTs`);
  if (typeof tx === 'number') parts.push(`${tx} taxonomies`);
  if (typeof fg === 'number') parts.push(`${fg} field groups`);
  if (typeof op === 'number') parts.push(`${op} options pages`);
  if (typeof summary.total === 'number' && parts.length === 0) parts.push(`${summary.total} items`);
  if (parts.length === 0) return null;
  return <p className="rdcfe-mt-1 rdcfe-text-xs rdcfe-text-gray-600">{parts.join(' · ')}</p>;
}
