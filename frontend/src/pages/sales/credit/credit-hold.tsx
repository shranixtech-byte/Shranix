import {
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Ban,
  ArrowUpCircle,
  UserX,
  Lock,
  Unlock,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import {
  getCreditCustomers,
  blockCustomer,
  releaseCustomer,
  type CustomerCreditProfile,
} from '@/services/sales-credit.service';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

function getWarningColor(w: string): string {
  switch (w) {
    case 'critical':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'red':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'amber':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    default:
      return 'text-green-500 bg-green-500/10 border-green-500/20';
  }
}

function getRiskColor(r: string): string {
  switch (r) {
    case 'critical':
      return 'text-red-600 bg-red-500/15 border-red-500/20';
    case 'high':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'medium':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    default:
      return 'text-green-500 bg-green-500/10 border-green-500/20';
  }
}

export function CreditHoldDashboardPage() {
  const [customers, setCustomers] = useState<CustomerCreditProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'blocked' | 'near_limit' | 'high_risk' | 'all'>('blocked');
  const [blockReason, setBlockReason] = useState('');
  const [releaseReason, setReleaseReason] = useState('');
  const [actionCustomer, setActionCustomer] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'block' | 'release' | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 100 };
      if (tab === 'blocked') {
        params.isBlocked = 'true';
      }
      if (tab === 'high_risk') {
        params.riskCategory = 'high';
      }
      const res = await getCreditCustomers(params);
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = search
    ? customers.filter(
        (c) =>
          c.customerName.toLowerCase().includes(search.toLowerCase()) ||
          c.customerCode.toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  const nearLimit =
    tab === 'all' || tab === 'near_limit'
      ? customers.filter((c) => !c.isBlocked && c.outstanding > c.creditLimit * 0.8)
      : [];

  const handleBlock = async (id: string) => {
    if (!blockReason) {
      return;
    }
    try {
      await blockCustomer(id, blockReason);
      setActionCustomer(null);
      setActionType(null);
      setBlockReason('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRelease = async (id: string) => {
    if (!releaseReason) {
      return;
    }
    try {
      await releaseCustomer(id, releaseReason);
      setActionCustomer(null);
      setActionType(null);
      setReleaseReason('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    {
      key: 'blocked' as const,
      label: 'Blocked Customers',
      icon: Ban,
      count: customers.filter((c) => c.isBlocked).length,
    },
    {
      key: 'near_limit' as const,
      label: 'Near Limit (>80%)',
      icon: ArrowUpCircle,
      count: customers.filter((c) => !c.isBlocked && c.outstanding > c.creditLimit * 0.8).length,
    },
    {
      key: 'high_risk' as const,
      label: 'High Risk',
      icon: ShieldAlert,
      count: customers.filter((c) => c.riskCategory === 'high' || c.riskCategory === 'critical')
        .length,
    },
    { key: 'all' as const, label: 'All Profiles', icon: UserX, count: customers.length },
  ];

  const showNearLimitList = tab === 'near_limit' || (tab === 'all' && nearLimit.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit Hold Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Blocked, near-limit, and high-risk customer monitoring
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              tab === t.key
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-card hover:bg-accent text-muted-foreground'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            <span className="bg-muted ml-1 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or code..."
          className="bg-background focus:ring-primary/50 w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Near Limit section */}
          {showNearLimitList && nearLimit.length > 0 && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-600">
                <ArrowUpCircle className="h-4 w-4" /> Customers Near Credit Limit
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nearLimit.slice(0, 9).map((c) => (
                  <div
                    key={c.customerId}
                    className="bg-background rounded-md border border-yellow-500/10 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{c.customerName}</p>
                      <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600">
                        {c.customerCode}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        Limit:{' '}
                        <span className="text-foreground font-medium">
                          {formatCurrency(c.creditLimit)}
                        </span>
                      </div>
                      <div>
                        Outstanding:{' '}
                        <span className="font-medium text-orange-600">
                          {formatCurrency(c.outstanding)}
                        </span>
                      </div>
                      <div>
                        Available:{' '}
                        <span className="text-foreground font-medium">
                          {formatCurrency(c.availableCredit)}
                        </span>
                      </div>
                      <div>
                        Utilization:{' '}
                        <span className="font-medium">
                          {c.creditLimit > 0
                            ? Math.round((c.outstanding / c.creditLimit) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked / All list */}
          <div className="bg-card rounded-lg border">
            <div className="bg-muted/30 text-muted-foreground grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 border-b px-4 py-2.5 text-xs font-medium">
              <span>Customer</span>
              <span className="text-right">Limit / Outstanding</span>
              <span>Warning</span>
              <span>Risk</span>
              <span>Available</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {filtered.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center py-12">
                <ShieldAlert className="mb-2 h-8 w-8" />
                <p className="text-sm">No customers found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((c) => (
                  <div
                    key={c.customerId}
                    className="hover:bg-muted/30 grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 text-sm transition-colors"
                  >
                    <div>
                      <p className="font-medium">{c.customerName}</p>
                      <p className="text-muted-foreground text-xs">{c.customerCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(c.creditLimit)}</p>
                      <p
                        className={`text-xs ${c.outstanding > c.creditLimit ? 'text-red-500' : 'text-muted-foreground'}`}
                      >
                        {formatCurrency(c.outstanding)}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${getWarningColor(c.warningLevel)}`}
                      >
                        {c.warningLevel}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${getRiskColor(c.riskCategory)}`}
                      >
                        {c.riskCategory}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${c.availableCredit < 0 ? 'text-red-500' : ''}`}>
                        {formatCurrency(c.availableCredit)}
                      </p>
                    </div>
                    <div>
                      {c.isBlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">
                          <Lock className="h-2.5 w-2.5" /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-500">
                          <Unlock className="h-2.5 w-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {c.isBlocked ? (
                        <button
                          onClick={() => {
                            setActionCustomer(c.customerId);
                            setActionType('release');
                          }}
                          className="rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-600 transition-colors hover:bg-green-500/20"
                        >
                          Release
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActionCustomer(c.customerId);
                            setActionType('block');
                          }}
                          className="rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-500/20"
                        >
                          Block
                        </button>
                      )}
                      {(c.riskCategory === 'high' || c.riskCategory === 'critical') &&
                        !c.isBlocked && (
                          <span className="rounded-md bg-orange-500/10 px-2 py-1 text-[10px] font-medium text-orange-600">
                            Flag
                          </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block Modal */}
      {actionType === 'block' && actionCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setActionCustomer(null);
            setActionType(null);
          }}
        >
          <div
            className="bg-card w-full max-w-md rounded-xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Ban className="h-5 w-5 text-red-500" /> Block Customer
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              This will prevent all invoice posting for this customer.
            </p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Enter reason for blocking..."
              className="bg-background mt-4 w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-red-500/50"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setActionCustomer(null);
                  setActionType(null);
                }}
                className="bg-background hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBlock(actionCustomer)}
                disabled={!blockReason}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Modal */}
      {actionType === 'release' && actionCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setActionCustomer(null);
            setActionType(null);
          }}
        >
          <div
            className="bg-card w-full max-w-md rounded-xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Unlock className="h-5 w-5 text-green-500" /> Release Customer
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              This will restore invoice posting for this customer.
            </p>
            <textarea
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="Enter reason for releasing..."
              className="bg-background mt-4 w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-green-500/50"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setActionCustomer(null);
                  setActionType(null);
                }}
                className="bg-background hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRelease(actionCustomer)}
                disabled={!releaseReason}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
