import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════
// DMS DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function DmsDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Document Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enterprise document storage, versioning, OCR, and digital signatures</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Documents', value: '—', icon: '📄', color: 'border-l-blue-500' },
          { label: 'Folders', value: '—', icon: '📁', color: 'border-l-green-500' },
          { label: 'Storage Used', value: '— MB', icon: '💾', color: 'border-l-purple-500' },
          { label: 'Pending OCR', value: '—', icon: '🔍', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
              <span className="text-2xl">{c.icon}</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {['Upload Document', 'Create Folder', 'View All Documents', 'OCR Queue', 'Signature Queue'].map((action) => (
            <button key={action} className="rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20">{action}</button>
          ))}
        </div>
      </div>
      {/* Recent & Pending */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Recent Uploads</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Recent documents will appear here</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Pending Approvals</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Documents awaiting signature will appear here</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT LIST
// ═══════════════════════════════════════════════════════════════════
export function DocumentListPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse, search, and manage all stored documents</p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">+ Upload Document</button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..." className="rounded-lg border bg-background px-3 py-2 text-sm w-64"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All Categories</option>
          <option value="invoice">Invoice</option>
          <option value="purchase_order">Purchase Order</option>
          <option value="grn">GRN</option>
          <option value="contract">Contract</option>
          <option value="report">Report</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="grid grid-cols-6 gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Document #</span><span>Name</span><span>Category</span><span>Version</span><span>Status</span><span>Actions</span>
        </div>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No documents found. Upload your first document to get started.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLDER TREE
// ═══════════════════════════════════════════════════════════════════
export function DocumentFoldersPage() {
  const folders = [
    { name: 'Invoices', count: 0, path: '/Invoices', level: 0 },
    { name: 'Purchase Orders', count: 0, path: '/Purchase Orders', level: 0 },
    { name: 'Goods Receipts', count: 0, path: '/Goods Receipts', level: 0 },
    { name: 'Contracts', count: 0, path: '/Contracts', level: 0 },
    { name: 'Reports', count: 0, path: '/Reports', level: 0 },
    { name: 'GST Returns', count: 0, path: '/GST Returns', level: 0 },
    { name: 'Financial Statements', count: 0, path: '/Financial Statements', level: 0 },
    { name: 'HR Documents', count: 0, path: '/HR Documents', level: 0 },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Folders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize documents in folders and subfolders</p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">+ New Folder</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {folders.map((f) => (
          <div key={f.path} className="cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📁</span>
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.count} documents</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAG MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
export function DocumentTagsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Tags</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage tags for document categorization</p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">+ New Tag</button>
      </div>
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">Tags will appear here. Create your first tag to get started.</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OCR QUEUE
// ═══════════════════════════════════════════════════════════════════
export function OcrQueuePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OCR Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Optical character recognition processing queue and results</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Pending', value: '—', color: 'border-l-yellow-500' },
          { label: 'Processing', value: '—', color: 'border-l-blue-500' },
          { label: 'Completed', value: '—', color: 'border-l-green-500' },
          { label: 'Failed', value: '—', color: 'border-l-red-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">OCR Queue</h2>
        <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">OCR processing queue will appear here</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DIGITAL SIGNATURES
// ═══════════════════════════════════════════════════════════════════
export function DigitalSignaturesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Digital Signatures</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage digital signatures, verification, and certificate tracking</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Signatures', value: '—', color: 'border-l-blue-500' },
          { label: 'Verified', value: '—', color: 'border-l-green-500' },
          { label: 'Pending', value: '—', color: 'border-l-yellow-500' },
          { label: 'Tampered', value: '—', color: 'border-l-red-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Signature Request Queue</h2>
        <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Pending signature requests will appear here</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE & AUDIT
// ═══════════════════════════════════════════════════════════════════
export function DocumentCompliancePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance & Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Document retention, legal holds, access logs, and compliance tracking</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Retention Policy</h2>
          <div className="space-y-3">
            {[
              { policy: 'Invoices', period: '8 years' },
              { policy: 'Purchase Orders', period: '5 years' },
              { policy: 'GST Returns', period: '8 years' },
              { policy: 'Contracts', period: '10 years' },
              { policy: 'Financial Statements', period: '8 years' },
            ].map((p) => (
              <div key={p.policy} className="flex items-center justify-between border-b pb-2">
                <span className="text-sm">{p.policy}</span>
                <span className="text-sm font-medium">{p.period}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Access Logs</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Document access and download logs will appear here</div>
        </div>
      </div>
    </div>
  );
}
