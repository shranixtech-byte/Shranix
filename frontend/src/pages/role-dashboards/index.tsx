// ═══════════════════════════════════════════════════════════════════
// CEO DASHBOARD — Enterprise-wide strategic overview
// ═══════════════════════════════════════════════════════════════════
export function CeoDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CEO Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enterprise-wide strategic overview with key performance indicators</p>
      </div>
      {/* Executive KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Revenue (YTD)', value: '₹—', sub: 'vs target —%', color: 'border-l-green-500' },
          { label: 'Net Profit (YTD)', value: '₹—', sub: 'Margin —%', color: 'border-l-blue-500' },
          { label: 'Revenue Growth', value: '—%', sub: 'vs previous year', color: 'border-l-purple-500' },
          { label: 'Cash Position', value: '₹—', sub: 'Operating — | Investing —', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>
      {/* Strategic KPIs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Sales Performance</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Sales', value: '₹—' },
              { label: 'Orders', value: '—' },
              { label: 'Avg Order Value', value: '₹—' },
              { label: 'Top Customer', value: '—' },
            ].map((i) => (
              <div key={i.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className="font-medium">{i.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Purchase Overview</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Spend', value: '₹—' },
              { label: 'Active POs', value: '—' },
              { label: 'Top Supplier', value: '—' },
              { label: 'Avg PO Value', value: '₹—' },
            ].map((i) => (
              <div key={i.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className="font-medium">{i.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Inventory Health</h2>
          <div className="space-y-3">
            {[
              { label: 'Stock Value', value: '₹—' },
              { label: 'Turnover Ratio', value: '—' },
              { label: 'Dead Stock %', value: '—%' },
              { label: 'Stockout Risk Items', value: '—' },
            ].map((i) => (
              <div key={i.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className="font-medium">{i.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Revenue & Profit Trend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Revenue and net profit trend (12 months)</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Working Capital</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Current assets vs current liabilities</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DIRECTOR DASHBOARD — Department-level oversight
// ═══════════════════════════════════════════════════════════════════
export function DirectorDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Director Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Department-level performance and operational oversight</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Department Revenue', value: '₹—', color: 'border-l-green-500' },
          { label: 'Operating Cost', value: '₹—', color: 'border-l-red-500' },
          { label: 'Headcount', value: '—', color: 'border-l-blue-500' },
          { label: 'Project Completion', value: '—%', color: 'border-l-purple-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Department Budget vs Actual</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Budget vs actual spend by department</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Key Initiatives</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Project milestones and completion status</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — System-wide administration
// ═══════════════════════════════════════════════════════════════════
export function AdminDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">System administration, user management, and configuration overview</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Users', value: '—', color: 'border-l-blue-500' },
          { label: 'Pending Approvals', value: '—', color: 'border-l-yellow-500' },
          { label: 'System Uptime', value: '99.9%', color: 'border-l-green-500' },
          { label: 'Active Workflows', value: '—', color: 'border-l-purple-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Recent Activity</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Feed — Recent system activity and user actions</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">System Health</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Status — Database, scheduler, and service health</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OPERATIONS DASHBOARD — Day-to-day operations
// ═══════════════════════════════════════════════════════════════════
export function OperationsDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Daily operational metrics, pending tasks, and alerts</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Orders to Process', value: '—', color: 'border-l-blue-500' },
          { label: 'Pending Deliveries', value: '—', color: 'border-l-yellow-500' },
          { label: 'Today Shipments', value: '—', color: 'border-l-green-500' },
          { label: 'Alerts', value: '—', color: 'border-l-red-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Today's Tasks</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Task list — Today's operational tasks and priorities</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Pending Actions</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">List — Pending GRNs, POs, and invoices requiring action</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// USER DASHBOARD — Personal workspace
// ═══════════════════════════════════════════════════════════════════
export function UserDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personal workspace with assigned tasks and notifications</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'My Tasks', value: '—', color: 'border-l-blue-500' },
          { label: 'Pending Approvals', value: '—', color: 'border-l-yellow-500' },
          { label: 'Notifications', value: '—', color: 'border-l-purple-500' },
          { label: 'Overdue Tasks', value: '—', color: 'border-l-red-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">My Recent Activity</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Feed — Recent documents I've created or modified</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Quick Actions</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Grid — Quick links to frequently used modules</div>
        </div>
      </div>
    </div>
  );
}
