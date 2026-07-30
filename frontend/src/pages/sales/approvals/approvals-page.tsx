import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';
import { getApprovals, getApprovalById, type ApprovalMaster } from '@/services/sales-approval.service';
import { ApprovalCard } from './approval-card';
import { CommentsPanel } from './comments-panel';

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' },
];

const documentTypes = [
  { value: '', label: 'All Documents' },
  { value: 'sales_invoice', label: 'Sales Invoice' },
  { value: 'sales_quotation', label: 'Quotation' },
  { value: 'proforma_invoice', label: 'Proforma Invoice' },
  { value: 'delivery_challan', label: 'Delivery Challan' },
  { value: 'sales_return', label: 'Sales Return' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
];

export function ApprovalsPage() {
  const [data, setData] = useState<ApprovalMaster[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalMaster | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getApprovals({
        page,
        pageSize,
        status: activeTab || undefined,
        search: search || undefined,
        documentType: docType || undefined,
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, search, docType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id);
    try {
      const result = await getApprovalById(id);
      setSelectedApproval(result);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData();
    if (selectedId) handleSelect(selectedId);
  }, [fetchData, selectedId, handleSelect]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-level approval workflow for all sales documents
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by document#, customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {documentTypes.map((dt) => (
            <option key={dt.value} value={dt.value}>{dt.label}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{total} approvals</span>
        {selectedId && (
          <button
            onClick={() => { setSelectedId(null); setSelectedApproval(null); }}
            className="text-xs text-primary underline hover:text-primary/80"
          >
            Back to list
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-sm">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : selectedId && selectedApproval ? (
        /* Detail View */
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <ApprovalCard
              approval={selectedApproval}
              onRefresh={handleRefresh}
              onView={() => {}}
            />
          </div>
          <div>
            <CommentsPanel
              approvalId={selectedApproval.id}
              comments={selectedApproval.comments || []}
              history={selectedApproval.history || []}
              onRefresh={() => {
                if (selectedId) handleSelect(selectedId);
              }}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onRefresh={fetchData}
                onView={handleSelect}
              />
            ))}
            {data.length === 0 && (
              <div className="col-span-full rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
                No approvals found matching the current filters
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
