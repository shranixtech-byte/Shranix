import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  changeLeadStatus,
  getLeads,
  LEAD_STATUSES,
  STATUS_LABELS,
  type Lead,
} from '@/services/crm.service';

const COLUMN_STYLES: Record<string, string> = {
  new: 'border-t-indigo-400',
  contacted: 'border-t-cyan-400',
  qualified: 'border-t-violet-400',
  interested: 'border-t-amber-400',
  quotation_sent: 'border-t-pink-400',
  negotiation: 'border-t-orange-400',
  won: 'border-t-emerald-400',
  lost: 'border-t-red-400',
};

export function CrmPipelinePage() {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getLeads({ pageSize: 500 });
      const cols: Record<string, Lead[]> = {};
      for (const s of LEAD_STATUSES) {
        cols[s] = [];
      }
      for (const l of all.data) {
        const st = l.status || 'other';
        if (cols[st]) {
          cols[st].push(l);
        } else {
          cols.other = [...(cols.other || []), l];
        }
      }
      setColumns(cols);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading pipeline…
      </div>
    );
  }

  const move = async (lead: Lead, to: string) => {
    if (lead.status === to) {
      return;
    }
    await changeLeadStatus(lead.id, to);
    void load();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Drag leads across stages — every move is logged to the timeline
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LEAD_STATUSES.map((status) => {
          const leads = columns[status] || [];
          const totalValue = leads.reduce((s, l) => s + Number(l.expectedValue || 0), 0);
          return (
            <div
              key={status}
              className={`bg-card rounded-lg border border-t-4 shadow-sm ${COLUMN_STYLES[status] || 'border-t-slate-400'}`}
            >
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <p className="text-sm font-semibold">{STATUS_LABELS[status] || status}</p>
                <span className="bg-muted rounded-full px-2 py-0.5 text-xs">
                  {leads.length} · ₹{totalValue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="min-h-[12rem] space-y-2 p-2">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    className="bg-card cursor-pointer rounded-lg border p-2.5 text-sm shadow-sm transition-shadow hover:shadow-md"
                  >
                    <p className="font-medium">{lead.leadName}</p>
                    {lead.companyName && (
                      <p className="text-muted-foreground text-xs">{lead.companyName}</p>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {lead.leadNumber} · ₹{Number(lead.expectedValue || 0).toLocaleString('en-IN')}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {[
                        'contacted',
                        'qualified',
                        'interested',
                        'quotation_sent',
                        'negotiation',
                        'won',
                        'lost',
                      ]
                        .filter((s) => s !== status)
                        .slice(0, 3)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={(e) => {
                              e.stopPropagation();
                              void move(lead, s);
                            }}
                            className="bg-muted text-muted-foreground hover:bg-muted/60 rounded-full border px-1.5 py-0.5 text-[10px]"
                          >
                            {STATUS_LABELS[s] || s}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="text-muted-foreground py-6 text-center text-xs">No leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
