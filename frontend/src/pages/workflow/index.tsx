import { useEffect, useState } from 'react';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  under_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

function getStatusBadge(status: string) {
  const style = statusStyles[status] || statusStyles.draft;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
    </span>
  );
}

// ═════════════════════════════════════════════════════════
// WORKFLOW DASHBOARD
// ═════════════════════════════════════════════════════════
export function WorkflowDashboardPage() {
  const [data, setData] = useState<any>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/workflow/dashboard');
      setData(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => { loadData(); }, []);

  const stats = data?.summary || {};
  const tasks = data?.tasks || {};
  const escalation = data?.escalation || {};

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workflow Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise workflow engine — track approvals, tasks, and escalations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-4 shadow-sm dark:bg-blue-900/10">
          <p className="text-sm font-medium text-muted-foreground">Active Instances</p>
          <p className="mt-1 text-2xl font-bold">{stats.activeInstances || '—'}</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-green-500 bg-green-50 p-4 shadow-sm dark:bg-green-900/10">
          <p className="text-sm font-medium text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold">{stats.completedInstances || '—'}</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50 p-4 shadow-sm dark:bg-yellow-900/10">
          <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
          <p className="mt-1 text-2xl font-bold">{tasks.pending || '—'}</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/10">
          <p className="text-sm font-medium text-muted-foreground">Overdue</p>
          <p className="mt-1 text-2xl font-bold">{tasks.overdue || '—'}</p>
        </div>
      </div>

      {/* Workflow Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Instances</p>
          <p className="mt-1 text-3xl font-bold">{stats.totalInstances || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">All time</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">My Pending Tasks</p>
          <p className="mt-1 text-3xl font-bold">{tasks.myPending || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Requires your action</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Escalation Rules</p>
          <p className="mt-1 text-3xl font-bold">{escalation.activeRules || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">{escalation.totalRules || 0} total</p>
        </div>
      </div>

      {/* Integration Status */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Module Integration Status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {['Purchase Orders', 'GRN', 'Purchase Invoices', 'Sales Orders', 'Delivery Challans', 'Sales Invoices', 'Journal Entries', 'Vouchers', 'GST Closing', 'Inventory Adjustments'].map((mod) => (
            <div key={mod} className="flex items-center gap-2 rounded-md border p-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium">{mod}</span>
              <span className="ml-auto text-xs text-muted-foreground">Ready</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// APPROVAL DASHBOARD
// ═════════════════════════════════════════════════════════
export function ApprovalDashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/workflow/tasks/my')
      .then((r) => r.json())
      .then((d) => setTasks(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approval Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage approvals across all modules
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-4 shadow-sm dark:bg-blue-900/10">
          <p className="text-sm font-medium text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-bold">{loading ? '—' : tasks.filter((t) => t.status === 'pending').length}</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-green-500 bg-green-50 p-4 shadow-sm dark:bg-green-900/10">
          <p className="text-sm font-medium text-muted-foreground">Approved</p>
          <p className="mt-1 text-2xl font-bold">{loading ? '—' : tasks.filter((t) => t.status === 'completed').length}</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/10">
          <p className="text-sm font-medium text-muted-foreground">Overdue</p>
          <p className="mt-1 text-2xl font-bold">{loading ? '—' : tasks.filter((t) => t.isOverdue).length}</p>
        </div>
      </div>

      {/* Approval Tasks */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">My Approvals</h2>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No pending approvals</div>
        ) : (
          <div className="divide-y">
            {tasks.slice(0, 10).map((task: any) => (
              <div key={task.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.documentType} · Priority: {task.priority} · {task.module}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(task.status)}
                  {task.isOverdue && <span className="text-xs text-red-500">⚠️ Overdue</span>}
                  <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PENDING TASKS DASHBOARD
// ═════════════════════════════════════════════════════════
export function PendingTasksDashboardPage() {
  const [tab, setTab] = useState<'pending' | 'completed' | 'delegated'>('pending');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const status = tab === 'pending' ? 'pending' : tab === 'completed' ? 'completed' : 'delegated';
    fetch(`/workflow/tasks?status=${status}`)
      .then((r) => r.json())
      .then((d) => setTasks(d.data || []))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all workflow tasks
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['pending', 'completed', 'delegated'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="rounded-lg border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No {tab} tasks</div>
        ) : (
          <div className="divide-y">
            {tasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{task.title}</p>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.documentType || task.module} · {task.taskType} · {task.priority} priority
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {task.isOverdue && <span className="text-xs text-red-500">⚠️</span>}
                  {task.dueDate && <span className="text-xs text-muted-foreground">Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// MY TASKS DASHBOARD
// ═════════════════════════════════════════════════════════
export function MyTasksDashboardPage() {
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/workflow/tasks/my')
      .then((r) => r.json())
      .then((d) => setMyTasks(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasks assigned to you across all workflows
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold">{myTasks.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-bold">{myTasks.filter((t) => t.status === 'pending').length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold">{myTasks.filter((t) => t.status === 'completed').length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Overdue</p>
          <p className="mt-1 text-2xl font-bold">{myTasks.filter((t) => t.isOverdue).length}</p>
        </div>
      </div>

      {/* Task Cards */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">My Tasks</h2>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : myTasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No tasks assigned</div>
        ) : (
          <div className="divide-y">
            {myTasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' : task.priority === 'urgent' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}></span>
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{task.module} · {task.taskType}</p>
                    {task.dueDate && (
                      <p className={`mt-0.5 text-xs ${task.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                        {task.isOverdue && ' (Overdue)'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(task.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// ESCALATION DASHBOARD
// ═════════════════════════════════════════════════════════
export function EscalationDashboardPage() {
  const [escalations, setEscalations] = useState<any>(null);

  useEffect(() => {
    fetch('/workflow/notifications/escalation-rules')
      .then((r) => r.json())
      .then((d) => setEscalations(d))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Escalation Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage escalation rules and monitor overdue tasks
        </p>
      </div>

      {/* Escalation Rules */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Escalation Rules</h2>
        <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          {escalations ? `${(escalations.data || []).length} rules configured` : 'Loading escalation rules...'}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={async () => {
            await fetch('/workflow/notifications/escalation-rules/process', { method: 'POST' });
            alert('Escalations processed');
          }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            ⚡ Process Escalations
          </button>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            ➕ New Escalation Rule
          </button>
        </div>
      </div>

      {/* Overdue Tasks */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Overdue Tasks</h2>
        <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Overdue task monitoring — data will populate as tasks become overdue
        </div>
      </div>
    </div>
  );
}
