import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════
// POSTING DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const statCards = [
  { label: 'Total GL Entries', value: '—', color: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
  { label: 'Pending Postings', value: '—', color: 'border-l-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
  { label: 'Open Periods', value: '—', color: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
  { label: 'Scheduler', value: 'Idle', color: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
];

export function PostingDashboardPage() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState<string | null>(null);

  const handleRunPosting = async () => {
    setStatus('running');
    setResult(null);
    try {
      const res = await fetch('/automation/posting/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [] }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      setStatus('completed');
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
      setStatus('failed');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Posting Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time GL posting engine with automatic double-entry validation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-lg border-l-4 p-4 shadow-sm ${card.color} ${card.bg}`}>
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Posting Controls */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Posting Controls</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRunPosting}
            disabled={status === 'running'}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {status === 'running' ? '⏳ Posting...' : '▶️ Run Posting'}
          </button>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">👁️ Preview</button>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">↩️ Reverse</button>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">⚙️ Apply Rules</button>
        </div>
        {result && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
            {result}
          </pre>
        )}
      </div>

      {/* Posting Queue */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Posting Queue</h2>
        <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Pending posting jobs will appear here
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AUTOMATION DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function AutomationDashboardPage() {
  const [autoResult, setAutoResult] = useState<string | null>(null);

  const handleTriggerAutoPost = async () => {
    try {
      const res = await fetch('/automation/scheduler/run-auto-post', { method: 'POST' });
      setAutoResult(JSON.stringify(await res.json(), null, 2));
    } catch (err) {
      setAutoResult(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automation Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise financial automation with scheduled jobs and background processing
        </p>
      </div>

      {/* Automation Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-4 shadow-sm dark:bg-blue-900/10">
          <p className="text-sm font-medium text-muted-foreground">Auto-Post Jobs</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-green-500 bg-green-50 p-4 shadow-sm dark:bg-green-900/10">
          <p className="text-sm font-medium text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/10">
          <p className="text-sm font-medium text-muted-foreground">Failed</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-purple-500 bg-purple-50 p-4 shadow-sm dark:bg-purple-900/10">
          <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
          <p className="mt-1 text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Automation Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTriggerAutoPost}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            ⚡ Trigger Auto-Post
          </button>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">📊 Generate Snapshot</button>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">🔒 Enforce Period Locks</button>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">🔄 Retry Failed Jobs</button>
        </div>
        {autoResult && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
            {autoResult}
          </pre>
        )}
      </div>

      {/* Job Status */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Job Status</h2>
        <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Scheduled job history will appear here
        </div>
      </div>

      {/* Automation Logs */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Automation Logs</h2>
        <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Automation execution logs will appear here
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FINANCE MONITOR
// ═══════════════════════════════════════════════════════════════════
export function FinanceMonitorPage() {
  const [report, setReport] = useState<string | null>(null);
  const [reportType, setReportType] = useState('trial-balance');

  const handleGenerateReport = async () => {
    try {
      const res = await fetch(`/automation/reports/${reportType}`);
      const data = await res.json();
      setReport(JSON.stringify(data, null, 2));
    } catch (err) {
      setReport(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance Monitor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time financial report viewer with live GL data
        </p>
      </div>

      {/* Report Controls */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Report Generator</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="trial-balance">Trial Balance</option>
              <option value="profit-loss">Profit & Loss</option>
              <option value="balance-sheet">Balance Sheet</option>
              <option value="cash-flow">Cash Flow</option>
              <option value="day-book">Day Book</option>
              <option value="account-statement">Account Statement</option>
              <option value="general-ledger">General Ledger</option>
              <option value="gst-register">GST Register</option>
              <option value="gst-summary">GST Summary</option>
              <option value="audit">Audit Report</option>
            </select>
          </div>
          <button
            onClick={handleGenerateReport}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            📊 Generate
          </button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📄 PDF</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📤 Export</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">🖨️ Print</button>
        </div>
        {report && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {report}
          </pre>
        )}
        {!report && (
          <div className="mt-4 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
            Select a report type and click Generate to view real GL-based data
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function IntegrationDashboardPage() {
  const modules = [
    { name: 'Sales → Finance', icon: '🛒', status: 'Ready', color: 'green' },
    { name: 'Purchase → Finance', icon: '📦', status: 'Ready', color: 'green' },
    { name: 'Inventory → Finance', icon: '🏭', status: 'Ready', color: 'green' },
    { name: 'Payroll → Finance', icon: '👤', status: 'Ready', color: 'green' },
    { name: 'Expense → Finance', icon: '💳', status: 'Ready', color: 'green' },
    { name: 'Bank → Finance', icon: '🏛️', status: 'Ready', color: 'green' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integration Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Module-to-Finance integration services with auto-posting
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <div key={mod.name} className="rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{mod.icon}</span>
                <div>
                  <p className="font-medium">{mod.name}</p>
                  <p className="text-xs text-muted-foreground">{mod.status}</p>
                </div>
              </div>
              <span className={`inline-block h-3 w-3 rounded-full bg-${mod.color}-500`}></span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">Test</button>
              <button className="flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">Logs</button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Integrations */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Recent Integrations</h2>
        <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Recent integration activity will appear here
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FINANCIAL HEALTH DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function FinancialHealthDashboardPage() {
  const healthCards = [
    { label: 'Current Ratio', value: '—', desc: 'Assets / Liabilities', icon: '⚖️', color: 'blue' },
    { label: 'Profit Margin', value: '—', desc: 'Net Profit / Revenue', icon: '📈', color: 'green' },
    { label: 'Debt Ratio', value: '—', desc: 'Total Liabilities / Total Assets', icon: '📊', color: 'yellow' },
    { label: 'Receivables Turnover', value: '—', desc: 'Net Sales / Avg Receivables', icon: '🔄', color: 'purple' },
    { label: 'Cash Ratio', value: '—', desc: 'Cash / Current Liabilities', icon: '💵', color: 'emerald' },
    { label: 'Operating Margin', value: '—', desc: 'Operating Income / Revenue', icon: '📉', color: 'orange' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Health Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Key financial ratios and health indicators derived from real GL data
        </p>
      </div>

      {/* Health Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {healthCards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className={`rounded-full bg-${card.color}-100 px-2 py-0.5 text-xs font-medium text-${card.color}-700 dark:bg-${card.color}-900/30 dark:text-${card.color}-300`}>
                {card.value}
              </span>
            </div>
            <p className="mt-3 font-medium">{card.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart Placeholder */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Financial Trends</h2>
        <div className="flex h-48 items-center justify-center rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">Chart — Data will populate from GL snapshots</p>
        </div>
      </div>
    </div>
  );
}
