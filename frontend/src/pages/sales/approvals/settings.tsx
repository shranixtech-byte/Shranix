import { Loader2, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import {
  getApprovalMatrices,
  updateApprovalMatrix,
  type ApprovalMatrix,
} from '@/services/sales-approval.service';

export function ApprovalSettings() {
  const [matrices, setMatrices] = useState<ApprovalMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedMatrices, setEditedMatrices] = useState<Record<string, Partial<ApprovalMatrix>>>({});

  const fetchMatrices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getApprovalMatrices();
      setMatrices(result || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrices();
  }, [fetchMatrices]);

  const handleSave = async (id: string) => {
    setSaving(id);
    try {
      const updates = editedMatrices[id];
      if (updates) {
        await updateApprovalMatrix(id, updates);
        setEditedMatrices((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const updateMatrix = (id: string, field: string, value: any) => {
    setEditedMatrices((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approval Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure approval matrices, levels, and approvers
          </p>
        </div>
        <button
          onClick={fetchMatrices}
          disabled={loading}
          className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {matrices.length === 0 ? (
            <div className="bg-card text-muted-foreground rounded-lg border p-8 text-center text-sm">
              No approval matrices configured. Contact admin to set up.
            </div>
          ) : (
            matrices.map((matrix) => {
              const edited = editedMatrices[matrix.id];
              const currentName = edited?.name ?? matrix.name;
              const currentActive = edited?.isActive ?? matrix.isActive;
              const currentLevels = edited?.levels ?? matrix.levels;
              const hasChanges = !!editedMatrices[matrix.id];

              return (
                <div key={matrix.id} className="bg-card rounded-lg border shadow-sm">
                  <div className="border-b px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={currentName}
                          onChange={(e) => updateMatrix(matrix.id, 'name', e.target.value)}
                          className="hover:border-primary/30 focus:border-primary/50 border-b border-transparent bg-transparent px-1 text-sm font-semibold focus:outline-none"
                        />
                        <span className="text-muted-foreground text-xs capitalize">
                          {matrix.documentType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={currentActive}
                            onChange={(e) => updateMatrix(matrix.id, 'isActive', e.target.checked)}
                            className="rounded"
                          />
                          Active
                        </label>
                        {hasChanges && (
                          <button
                            onClick={() => handleSave(matrix.id)}
                            disabled={saving === matrix.id}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {saving === matrix.id ? 'Saving...' : 'Save'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Levels:</span>
                      <select
                        value={currentLevels}
                        onChange={(e) => updateMatrix(matrix.id, 'levels', e.target.value)}
                        className="bg-background focus:ring-primary/50 rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2"
                      >
                        <option value="single">Single Level</option>
                        <option value="two_level">Two Level</option>
                        <option value="three_level">Three Level</option>
                        <option value="unlimited">Multi Level</option>
                      </select>
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({matrix.levelCount} level{matrix.levelCount > 1 ? 's' : ''})
                      </span>
                    </div>

                    {/* Approvers */}
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium">Approvers</p>
                      {(matrix.approvers || []).map((approver, i) => (
                        <div
                          key={i}
                          className="bg-muted/30 flex items-center gap-3 rounded-md p-2 text-xs"
                        >
                          <span className="font-medium">L{approver.level}</span>
                          <span className="text-muted-foreground">Role:</span>
                          <span className="capitalize">{approver.role}</span>
                          {approver.minAmount !== undefined && (
                            <>
                              <span className="text-muted-foreground">Min:</span>
                              <span className="tabular-nums">
                                ₹{approver.minAmount.toLocaleString('en-IN')}
                              </span>
                            </>
                          )}
                          {approver.maxAmount !== undefined && (
                            <>
                              <span className="text-muted-foreground">Max:</span>
                              <span className="tabular-nums">
                                ₹{approver.maxAmount.toLocaleString('en-IN')}
                              </span>
                            </>
                          )}
                          <span
                            className={`text-[10px] ${approver.canOverride ? 'text-amber-600' : 'text-muted-foreground'}`}
                          >
                            {approver.canOverride ? 'Can Override' : 'No Override'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
