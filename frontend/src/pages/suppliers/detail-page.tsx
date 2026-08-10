import {
  ArrowLeft,
  Banknote,
  Building2,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { PartyAvatar, StatCard, StatusBadge, TabBar } from '@/components/party/party-ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { PartyAddress, PartyContact, PartyDocument } from '@/services/party-master.types';
import {
  getSupplier,
  getSupplierLedger,
  listSupplierAddresses,
  listSupplierContacts,
  listSupplierDocuments,
  setSupplierStatus,
} from '@/services/supplier-master.service';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <Globe className="h-4 w-4" /> },
  { key: 'addresses', label: 'Addresses', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Phone className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { key: 'ledger', label: 'Ledger 360°', icon: <Wallet className="h-4 w-4" /> },
];

function formatCurrency(v: number | undefined): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [supplier, setSupplier] = useState<any>(null);
  const [addresses, setAddresses] = useState<PartyAddress[]>([]);
  const [contacts, setContacts] = useState<PartyContact[]>([]);
  const [documents, setDocuments] = useState<PartyDocument[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, addr, cts, docs] = await Promise.all([
        getSupplier(id),
        listSupplierAddresses(id),
        listSupplierContacts(id),
        listSupplierDocuments(id),
      ]);
      setSupplier(s);
      setAddresses(addr || []);
      setContacts(cts || []);
      setDocuments(docs || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === 'ledger' && id && !ledger && !ledgerLoading) {
      setLedgerLoading(true);
      void getSupplierLedger(id)
        .then(setLedger)
        .catch(() => setLedger({ entries: [], summary: {} }))
        .finally(() => setLedgerLoading(false));
    }
  }, [tab, id, ledger, ledgerLoading]);

  const changeStatus = async (status: 'active' | 'inactive' | 'blocked') => {
    if (!id) {
      return;
    }
    setBusy('status');
    setError(null);
    try {
      await setSupplierStatus(id, status);
      setNotice(`✅ Status updated to "${status}"`);
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const primaryAddress = useMemo(
    () =>
      addresses.find((a) => a.isDefault) ||
      addresses.find((a) => a.addressType === 'billing') ||
      addresses[0] ||
      null,
    [addresses],
  );

  const ledgerRows = ledger?.entries || [];
  const outstanding = Number(supplier?.outstanding ?? supplier?.currentBalance ?? 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        {error || 'Supplier not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <PartyAvatar name={supplier.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {supplier.name}
              </h1>
              <StatusBadge status={supplier.status} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {supplier.code} · {supplier.firmName || supplier.supplierType || 'Supplier'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => navigate(`/suppliers/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            icon={<ShieldCheck className="h-4 w-4" />}
            loading={busy === 'status'}
            disabled={supplier.status === 'blocked'}
            onClick={() => changeStatus('blocked')}
          >
            Block
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Credit Limit"
          value={formatCurrency(supplier.creditLimit)}
          icon={<Wallet className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Outstanding Payable"
          value={formatCurrency(outstanding)}
          icon={<Banknote className="h-4 w-4" />}
          tone={outstanding > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Credit Days"
          value={`${supplier.creditDays ?? 0} days`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Documents"
          value={`${supplier.documentCount ?? documents.length}`}
          hint={`${supplier.addressCount ?? addresses.length} addresses · ${supplier.contactCount ?? contacts.length} contacts`}
          icon={<FileText className="h-4 w-4" />}
          tone="violet"
        />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={TABS.map((t) => ({
          ...t,
          count:
            t.key === 'addresses'
              ? addresses.length
              : t.key === 'contacts'
                ? contacts.length
                : t.key === 'documents'
                  ? documents.length
                  : undefined,
        }))}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <InfoCard
              title="Business Details"
              rows={[
                ['Firm Name', supplier.firmName || '—'],
                ['Supplier Type', supplier.supplierType || '—'],
                ['Group', supplier.groupName || '—'],
                ['Category', supplier.categoryName || '—'],
                ['GSTIN', supplier.gstin || '—'],
                ['PAN', supplier.pan || '—'],
                ['Payment Terms', supplier.paymentTerms || '—'],
                ['Remarks', supplier.remarks || '—'],
              ]}
            />
            <InfoCard
              title="Contact"
              rows={[
                ['Contact Person', supplier.contactPerson || '—'],
                ['Mobile', supplier.mobile || '—'],
                ['Alternate Mobile', supplier.altMobile || '—'],
                ['WhatsApp', supplier.whatsapp || '—'],
                ['Email', supplier.email || '—'],
                ['Website', supplier.website || '—'],
              ]}
            />
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <MapPin className="h-4 w-4 text-emerald-500" /> Primary Address
              </h3>
              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {primaryAddress ? (
                  <>
                    <p className="font-medium capitalize text-slate-800 dark:text-slate-100">
                      {primaryAddress.addressType.replace('_', ' ')}
                      {primaryAddress.isDefault && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Default
                        </span>
                      )}
                    </p>
                    {primaryAddress.address && <p>{primaryAddress.address}</p>}
                    <p>
                      {[primaryAddress.village, primaryAddress.taluka, primaryAddress.district]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p>
                      {[primaryAddress.state, primaryAddress.pincode].filter(Boolean).join(' — ')}
                    </p>
                    <p>{primaryAddress.country}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No address on record</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <Banknote className="h-4 w-4 text-emerald-500" /> Bank Details
              </h3>
              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  <span className="text-slate-400">Bank:</span> {supplier.bankName || '—'}
                </p>
                <p>
                  <span className="text-slate-400">Account:</span> {supplier.bankAccountNo || '—'}
                </p>
                <p>
                  <span className="text-slate-400">IFSC:</span>{' '}
                  <span className="font-mono">{supplier.bankIfsc || '—'}</span>
                </p>
                <p>
                  <span className="text-slate-400">Branch:</span> {supplier.bankBranch || '—'}
                </p>
                <p>
                  <span className="text-slate-400">UPI:</span> {supplier.upiId || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'addresses' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.length === 0 && <EmptyState text="No addresses on record" />}
          {addresses.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <MapPin className="h-3 w-3" /> {a.addressType.replace('_', ' ')}
                </span>
                {a.isDefault && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    Default
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {a.address && <p>{a.address}</p>}
                <p>{[a.village, a.taluka, a.district].filter(Boolean).join(', ')}</p>
                <p>{[a.state, a.pincode].filter(Boolean).join(' — ')}</p>
                <p>{a.country}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'contacts' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.length === 0 && <EmptyState text="No contacts on record" />}
          {contacts.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <PartyAvatar name={c.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {c.name}
                  </p>
                  <p className="text-[11px] capitalize text-slate-400">
                    {c.contactType.replace('_', ' ')}
                    {c.isPrimary ? ' · Primary' : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  <Phone className="mr-1 inline h-3 w-3 text-slate-400" />
                  {c.mobile || '—'}
                </p>
                <p>{c.email || '—'}</p>
                <p className="text-slate-400">{c.designation || ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.length === 0 && <EmptyState text="No documents on record" />}
          {documents.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {d.fileName}
                  </p>
                  <p className="text-[11px] capitalize text-slate-400">
                    {d.docType.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              {d.notes && <p className="mt-3 text-xs text-slate-500">{d.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'ledger' && (
        <div className="space-y-4">
          {ledgerLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total Invoices"
                  value={ledger?.summary?.totalInvoices ?? 0}
                  icon={<FileText className="h-4 w-4" />}
                />
                <StatCard
                  label="Total Purchases"
                  value={formatCurrency(ledger?.summary?.totalValue)}
                  icon={<Wallet className="h-4 w-4" />}
                  tone="blue"
                />
                <StatCard
                  label="Balance Payable"
                  value={formatCurrency(ledger?.summary?.totalBalance)}
                  icon={<Banknote className="h-4 w-4" />}
                  tone={Number(ledger?.summary?.totalBalance || 0) > 0 ? 'red' : 'green'}
                />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                        <th className="px-4 py-3 font-semibold">Invoice</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Due</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                        <th className="px-4 py-3 text-right font-semibold">Paid</th>
                        <th className="px-4 py-3 text-right font-semibold">Balance</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {ledgerRows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                            No purchase invoices yet
                          </td>
                        </tr>
                      )}
                      {ledgerRows.map((inv: any) => (
                        <tr
                          key={inv.id}
                          className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{inv.invoiceDate}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{inv.dueDate || '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(inv.grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                            {formatCurrency(inv.paidAmount)}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 text-right font-semibold tabular-nums',
                              inv.balanceAmount > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-400',
                            )}
                          >
                            {formatCurrency(inv.balanceAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                                inv.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : inv.paymentStatus === 'partial'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                              )}
                            >
                              {inv.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <dl className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{k}</dt>
            <dd className="text-sm text-slate-700 dark:text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400 dark:border-slate-700">
      {text}
    </div>
  );
}
