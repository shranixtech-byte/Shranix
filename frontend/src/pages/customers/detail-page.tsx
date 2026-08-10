import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  PlayCircle,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  getCustomer,
  getCustomerLedger,
  listAddresses,
  listContacts,
  listDocuments,
  setCustomerStatus,
  type CustomerRecord,
} from '@/services/customer-master.service';

import { CustomerAvatar, StatCard, StatusBadge, TabBar } from './components';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <Building2 className="h-4 w-4" /> },
  { key: 'addresses', label: 'Addresses', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Phone className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { key: 'ledger', label: 'Ledger', icon: <ReceiptText className="h-4 w-4" /> },
];

function formatCurrency(v: number | undefined): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState('overview');
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
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
      const [c, addr, cts, docs] = await Promise.all([
        getCustomer(id),
        listAddresses(id),
        listContacts(id),
        listDocuments(id),
      ]);
      setCustomer(c);
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
      getCustomerLedger(id)
        .then(setLedger)
        .catch(() => setLedger(null))
        .finally(() => setLedgerLoading(false));
    }
  }, [tab, id, ledger, ledgerLoading]);

  const changeStatus = async (status: 'active' | 'inactive' | 'blocked') => {
    if (!id || !customer) {
      return;
    }
    if (!window.confirm(`Set "${customer.name}" status to ${status}?`)) {
      return;
    }
    setBusy('status');
    setNotice(null);
    try {
      await setCustomerStatus(id, status);
      setCustomer((prev) => (prev ? { ...prev, status } : prev));
      setNotice(`Status updated to ${status}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-medium text-slate-500">Customer not found</p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        <Button
          variant="secondary"
          className="mt-4"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/customers')}
        >
          Back to Customers
        </Button>
      </div>
    );
  }

  const ledgerRows = ledger?.ledger || [];
  const outstanding = Number(customer.outstanding ?? customer.currentBalance ?? 0);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Customers
      </button>

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

      {/* Profile header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <CustomerAvatar name={customer.name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {customer.name}
                </h1>
                <StatusBadge status={customer.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {customer.code || '—'}
                </span>
                {customer.firmName && (
                  <>
                    {' '}
                    · <span className="font-medium">{customer.firmName}</span>
                  </>
                )}
                {customer.customerType && (
                  <>
                    {' '}
                    · <span className="capitalize">{customer.customerType}</span>
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {customer.mobile && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {customer.mobile}
                  </span>
                )}
                {customer.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {customer.email}
                  </span>
                )}
                {customer.gstin && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> GST: {customer.gstin}
                  </span>
                )}
                {primaryAddress && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[
                      primaryAddress.village,
                      primaryAddress.taluka,
                      primaryAddress.district,
                      primaryAddress.state,
                    ]
                      .filter(Boolean)
                      .join(', ') || primaryAddress.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`/customers/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              icon={<Wallet className="h-4 w-4" />}
              onClick={() => navigate(`/sales/customer-ledger?customerId=${id}`)}
            >
              Ledger 360°
            </Button>
            {customer.status === 'blocked' ? (
              <Button
                variant="secondary"
                icon={<PlayCircle className="h-4 w-4" />}
                loading={busy === 'status'}
                onClick={() => changeStatus('active')}
              >
                Unblock
              </Button>
            ) : (
              <Button
                variant="danger"
                icon={<Ban className="h-4 w-4" />}
                loading={busy === 'status'}
                onClick={() => changeStatus('blocked')}
              >
                Block
              </Button>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            tone={outstanding > 0 ? 'red' : 'green'}
          />
          <StatCard label="Credit Limit" value={formatCurrency(customer.creditLimit)} tone="blue" />
          <StatCard
            label="Advance"
            value={formatCurrency(customer.advanceBalance)}
            tone={Number(customer.advanceBalance || 0) > 0 ? 'amber' : 'default'}
          />
          <StatCard
            label="Available Credit"
            value={formatCurrency(customer.availableCredit)}
            tone="violet"
          />
        </div>
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        {tab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <SectionTitle title="Business Details" />
              <InfoRow
                label="Customer Type"
                value={
                  customer.customerType
                    ? customer.customerType.charAt(0).toUpperCase() + customer.customerType.slice(1)
                    : '—'
                }
              />
              <InfoRow
                label="Customer Group"
                value={customer.groupName || customer.customerGroup || '—'}
              />
              <InfoRow
                label="Category"
                value={customer.categoryName || customer.customerCategory || '—'}
              />
              <InfoRow
                label="Price List"
                value={
                  customer.priceList
                    ? customer.priceList.charAt(0).toUpperCase() + customer.priceList.slice(1)
                    : '—'
                }
              />
              <InfoRow label="Payment Terms" value={customer.paymentTerms || '—'} />
              <InfoRow label="Contact Person" value={customer.contactPerson || '—'} />
              <InfoRow label="GSTIN" value={customer.gstin || '—'} mono />
              <InfoRow label="PAN" value={customer.pan || '—'} mono />
            </div>
            <div className="space-y-4">
              <SectionTitle title="Contact & Credit" />
              <InfoRow label="Mobile" value={customer.mobile || '—'} />
              <InfoRow label="Alternate Mobile" value={customer.altMobile || '—'} />
              <InfoRow label="WhatsApp" value={customer.whatsapp || '—'} />
              <InfoRow label="Email" value={customer.email || '—'} />
              <InfoRow label="Website" value={customer.website || '—'} />
              <InfoRow
                label="Credit Days"
                value={
                  customer.creditDays !== null && customer.creditDays !== undefined
                    ? `${customer.creditDays} days`
                    : '—'
                }
              />
              <InfoRow label="Opening Balance" value={formatCurrency(customer.openingBalance)} />
              <InfoRow
                label="Loyalty Points"
                value={
                  customer.loyaltyPoints !== null && customer.loyaltyPoints !== undefined
                    ? String(customer.loyaltyPoints)
                    : '—'
                }
              />
            </div>
            {customer.remarks && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800 md:col-span-2 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                <p className="font-semibold">Remarks</p>
                <p className="mt-1 whitespace-pre-wrap">{customer.remarks}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'addresses' && (
          <div className="space-y-4">
            {addresses.length === 0 && <EmptyState text="No addresses on record" />}
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium capitalize text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                      <MapPin className="h-3 w-3" /> {a.addressType}
                      {a.isDefault && <span className="font-semibold">· Default</span>}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {a.address || '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {[a.village, a.taluka, a.district, a.state].filter(Boolean).join(', ')}
                    {a.pincode ? ` - ${a.pincode}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="space-y-4">
            {contacts.length === 0 && <EmptyState text="No contacts on record" />}
            <div className="grid gap-3 sm:grid-cols-2">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-sm font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {c.name}
                      {c.isPrimary && (
                        <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </p>
                    <p className="text-xs capitalize text-slate-400">
                      {c.contactType}
                      {c.designation ? ` · ${c.designation}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                      {[c.mobile, c.email].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            {documents.length === 0 && <EmptyState text="No documents uploaded" />}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {d.fileName}
                    </p>
                    <p className="text-[11px] capitalize text-slate-400">
                      {d.docType.replace(/_/g, ' ')}
                    </p>
                    {d.notes && <p className="truncate text-[11px] text-slate-400">{d.notes}</p>}
                  </div>
                  {d.fileUrl && (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-emerald-600 hover:underline"
                    >
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                icon={<FileText className="h-3.5 w-3.5" />}
                onClick={() => navigate(`/customers/${id}/documents`)}
              >
                Manage Documents
              </Button>
            </div>
          </div>
        )}

        {tab === 'ledger' && (
          <div className="space-y-4">
            {ledgerLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : ledgerRows.length === 0 ? (
              <EmptyState text="No ledger transactions yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="px-3 py-2.5 font-semibold">Date</th>
                      <th className="px-3 py-2.5 font-semibold">Document</th>
                      <th className="px-3 py-2.5 font-semibold">Type</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Debit</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Credit</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {ledgerRows.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-3 py-2.5 text-xs text-slate-500">{r.date}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                          {r.documentNumber}
                        </td>
                        <td className="px-3 py-2.5 text-xs capitalize text-slate-500">{r.type}</td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-slate-700 dark:text-slate-200">
                          {Number(r.debit) > 0 ? formatCurrency(r.debit) : ''}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-emerald-600">
                          {Number(r.credit) > 0 ? formatCurrency(r.credit) : ''}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right text-xs font-semibold tabular-nums',
                            Number(r.balance) < 0
                              ? 'text-emerald-600'
                              : 'text-slate-800 dark:text-slate-100',
                          )}
                        >
                          {formatCurrency(r.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0 dark:border-slate-700/60">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn('text-sm text-slate-800 dark:text-slate-100', mono && 'font-mono text-xs')}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{text}</p>;
}
