import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Clock, CheckCircle2, XCircle, TrendingUp, Eye, FileText } from 'lucide-react';
import { getApprovalDashboardStats, type ApprovalDashboardStats } from '@/services/sales-approval.service';

const documentTypeLabels: Record<string, string> = {
  sales_invoice: 'Invoices',
  sales_quotation: 'Quotations',
  proforma_invoice: 'Proforma',
  delivery_challan: 'Challans',
  sales_return: 'Returns',
  credit_note: 'Credit Notes',
  debit_note: 'Debit Notes',
};

export function ApprovalDashboard() {
  const [stats, setStats] = useState<ApprovalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getApprovalDashboardStats();
      setStats(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approval Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time approval workflow overview and metrics
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border-l-4 border-l-yellow-500 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase">Pending</p>
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.pendingCount}</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-blue-500 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase">Under Review</p>
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.underReviewCount}</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-green-500 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase">Approved Today</p>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.approvedToday}</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-red-500 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase">Rejected</p>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.rejectedCount}</p>
            </div>
          </div>

          {/* Second row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase">Total</p>
              <p className="mt-1 text-xl font-bold">{stats.totalCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase">Overdue</p>
              <p className={`mt-1 text-xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : ''}`}>
                {stats.overdueCount}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase">Avg Approval Time</p>
              <p className="mt-1 text-xl font-bold">{stats.averageApprovalTime.toFixed(1)}h</p>
            </div>
          </div>

          {/* By Document Type */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  By Document Type
                </h3>
              </div>
              <div className="divide-y">
                {Object.entries(stats.byDocumentType || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <span className="capitalize">{documentTypeLabels[type] || type.replace(/_/g, ' ')}</span>
                    <span className="font-bold tabular-nums">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.byDocumentType || {}).length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No data</div>
                )}
              </div>
            </div>

            {/* By Status */}
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  By Status
                </h3>
              </div>
              <div className="divide-y">
                {Object.entries(stats.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                    <span className={`font-bold tabular-nums ${
                      status === 'approved' ? 'text-green-600' :
                      status === 'rejected' ? 'text-red-600' :
                      status === 'pending' ? 'text-yellow-600' :
                      status === 'overdue' ? 'text-red-600' : ''
                    }`}>
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(stats.byStatus || {}).length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Status Bar */}
          {stats.totalCount > 0 && (
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Approval Pipeline</h3>
              <div className="flex h-6 rounded-full overflow-hidden">
                {stats.pendingCount > 0 && (
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{ width: `${(stats.pendingCount / stats.totalCount) * 100}%` }}
                    title={`Pending: ${stats.pendingCount}`}
                  />
                )}
                {stats.underReviewCount > 0 && (
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${(stats.underReviewCount / stats.totalCount) * 100}%` }}
                    title={`Under Review: ${stats.underReviewCount}`}
                  />
                )}
                {stats.approvedToday > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(stats.approvedToday / stats.totalCount) * 100}%` }}
                    title={`Approved Today: ${stats.approvedToday}`}
                  />
                )}
                {stats.rejectedCount > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(stats.rejectedCount / stats.totalCount) * 100}%` }}
                    title={`Rejected: ${stats.rejectedCount}`}
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending ({stats.pendingCount})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Under Review ({stats.underReviewCount})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Approved Today ({stats.approvedToday})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Rejected ({stats.rejectedCount})</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No approval data available
        </div>
      )}
    </div>
  );
}
