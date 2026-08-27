import {
  ShoppingCart,
  TrendingUp,
  Package,
  FileText,
  Truck,
  DollarSign,
  CreditCard,
  Search,
  X,
  ChevronRight,
  Wallet,
  Database,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  HeroBanner,
  KPICardsRow,
  SalesOverviewCard,
  PurchaseOverviewCard,
  StockStatusCard,
  ExpiryAlertsCard,
  RecentTransactionsCard,
  TopSellingProductsCard,
  BottomSummaryCards,
  QuickShortcutsCard,
} from '@/components/dashboard';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

const numberFormat = new Intl.NumberFormat('en-IN');

function formatCurrency(amount: number): string {
  return `₹${numberFormat.format(Math.round(amount))}`;
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }
  return `₹${Math.round(amount)}`;
}

// ═══════════════════════════════════════════════════════════
// TODAY'S SALES BREAKDOWN MODAL (Cash vs Credit)
// ═══════════════════════════════════════════════════════════

function TodaySalesBreakdownModal({
  isOpen,
  onClose,
  kpiData,
  onNavigateToInvoices,
}: {
  isOpen: boolean;
  onClose: () => void;
  kpiData: any;
  onNavigateToInvoices: (typeFilter?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'credit'>('all');

  if (!isOpen) {
    return null;
  }

  const rawList: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    grandTotal: number;
    paymentMode: 'cash' | 'credit';
    paymentStatus: string;
    time: string;
  }> = kpiData.todaySalesList || [];

  const totalSales = Number(kpiData.revenue?.value || 0);
  const cashSales = Number(kpiData.todayCashSales || 0);
  const creditSales = Number(kpiData.todayCreditSales || 0);

  const filteredInvoices = rawList.filter((inv) => {
    if (activeTab === 'cash') {return inv.paymentMode === 'cash';}
    if (activeTab === 'credit') {return inv.paymentMode === 'credit';}
    return true;
  });

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111827]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 dark:border-white/[0.08] dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <TrendingUp className="h-4.5 w-4.5" strokeWidth={1.85} />
            </div>
            <div>
              <h3 className="font-poppins text-sm font-extrabold text-slate-900 dark:text-white">
                📊 आजची विक्री विश्लेषण | Today's Sales Breakdown
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Choose Cash Sales (नगद) or Credit Sales (उधारी) to filter today's records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Tabs Header */}
        <div className="border-b border-slate-200/80 bg-slate-100/60 px-5 py-3 dark:border-white/[0.08] dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'एकूण विक्री (All Sales)', badge: rawList.length, icon: Wallet },
              {
                id: 'cash',
                label: '💵 नगद विक्री (Cash Sales)',
                badge: kpiData.todayCashCount ?? 0,
                icon: DollarSign,
              },
              {
                id: 'credit',
                label: '💳 उधारी विक्री (Credit Sales)',
                badge: kpiData.todayCreditCount ?? 0,
                icon: CreditCard,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/40'
                      : 'bg-white text-slate-700 hover:bg-slate-200/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px]',
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Metric Cards inside Modal */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            <div
              className={cn(
                'rounded-xl border p-3 transition-all',
                activeTab === 'all'
                  ? 'border-blue-500/50 bg-blue-50 ring-2 ring-blue-500/20 dark:border-blue-500/50 dark:bg-blue-950/30'
                  : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Total Today's Sales
              </p>
              <p className="font-poppins mt-0.5 text-base font-extrabold text-slate-900 sm:text-lg dark:text-white">
                ₹{totalSales.toLocaleString('en-IN')}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-3 transition-all',
                activeTab === 'cash'
                  ? 'border-emerald-500/50 bg-emerald-50 ring-2 ring-emerald-500/20 dark:border-emerald-500/50 dark:bg-emerald-950/30'
                  : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Cash Sales (नगद)
              </p>
              <p className="font-poppins mt-0.5 text-base font-extrabold text-emerald-700 sm:text-lg dark:text-emerald-300">
                ₹{cashSales.toLocaleString('en-IN')}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-3 transition-all',
                activeTab === 'credit'
                  ? 'border-amber-500/50 bg-amber-50 ring-2 ring-amber-500/20 dark:border-amber-500/50 dark:bg-amber-950/30'
                  : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Credit Sales (उधारी)
              </p>
              <p className="font-poppins mt-0.5 text-base font-extrabold text-amber-700 sm:text-lg dark:text-amber-300">
                ₹{creditSales.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Filtered Records List Table */}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <th className="px-3.5 py-2">Invoice No</th>
                  <th className="px-3.5 py-2">Customer</th>
                  <th className="px-3.5 py-2 text-center">Payment Mode</th>
                  <th className="px-3.5 py-2 text-right">Amount ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No {activeTab} invoices recorded today yet.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-2 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-3.5 py-2 font-medium text-slate-700 dark:text-slate-300">
                        {inv.customerName}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold',
                            inv.paymentMode === 'cash'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                          )}
                        >
                          {inv.paymentMode === 'cash' ? '💵 Cash Sale' : '💳 Credit Sale'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-bold text-slate-900 dark:text-white">
                        ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-5 py-3 dark:border-white/[0.08] dark:bg-slate-800/50">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Showing {filteredInvoices.length} invoices (
            {activeTab === 'all' ? 'All' : activeTab.toUpperCase()} filter)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToInvoices(activeTab === 'all' ? undefined : activeTab);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
            >
              <span>View All Invoices Module</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TODAY'S PURCHASE BREAKDOWN MODAL (Cash vs Credit)
// ═══════════════════════════════════════════════════════════

function TodayPurchaseBreakdownModal({
  isOpen,
  onClose,
  kpiData,
  onNavigateToOrders,
}: {
  isOpen: boolean;
  onClose: () => void;
  kpiData: any;
  onNavigateToOrders: (typeFilter?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'credit'>('all');

  if (!isOpen) {
    return null;
  }

  const rawList: Array<{
    id: string;
    billNumber: string;
    supplierName: string;
    grandTotal: number;
    paymentMode: 'cash' | 'credit';
    paymentStatus: string;
    time: string;
  }> = kpiData.todayPurchaseList || [];

  const totalPurchases = Number(kpiData.purchases?.value || 0);
  const cashPurchases = Number(kpiData.todayCashPurchases || 0);
  const creditPurchases = Number(kpiData.todayCreditPurchases || 0);

  const filteredBills = rawList.filter((bill) => {
    if (activeTab === 'cash') {return bill.paymentMode === 'cash';}
    if (activeTab === 'credit') {return bill.paymentMode === 'credit';}
    return true;
  });

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111827]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 dark:border-white/[0.08] dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
              <ShoppingCart className="h-4.5 w-4.5" strokeWidth={1.85} />
            </div>
            <div>
              <h3 className="font-poppins text-sm font-extrabold text-slate-900 dark:text-white">
                📊 आजची खरेदी विश्लेषण | Today's Purchase Breakdown
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Filter and view Cash Purchase vs Credit Purchase bills for Today
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Tabs Header */}
        <div className="border-b border-slate-200/80 bg-slate-100/60 px-5 py-3 dark:border-white/[0.08] dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                id: 'all',
                label: 'एकूण खरेदी (All Purchases)',
                badge: rawList.length,
                icon: Wallet,
              },
              {
                id: 'cash',
                label: '💵 नगद खरेदी (Cash Purchase)',
                badge: kpiData.todayCashPurchaseCount ?? 0,
                icon: DollarSign,
              },
              {
                id: 'credit',
                label: '💳 उधारी खरेदी (Credit Purchase)',
                badge: kpiData.todayCreditPurchaseCount ?? 0,
                icon: CreditCard,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/25 ring-1 ring-teal-400/40'
                      : 'bg-white text-slate-700 hover:bg-slate-200/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px]',
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            <div
              className={cn(
                'rounded-xl border p-3 transition-all',
                activeTab === 'all'
                  ? 'border-teal-500/50 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-500/50 dark:bg-teal-950/30'
                  : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Total Today's Purchases
              </p>
              <p className="font-poppins mt-0.5 text-base font-extrabold text-slate-900 sm:text-lg dark:text-white">
                ₹{totalPurchases.toLocaleString('en-IN')}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-3 transition-all',
                activeTab === 'cash'
                  ? 'border-emerald-500/50 bg-emerald-50 ring-2 ring-emerald-500/20 dark:border-emerald-500/50 dark:bg-emerald-950/30'
                  : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Cash Purchase (नगद)
              </p>
              <p className="font-poppins mt-0.5 text-base font-extrabold text-emerald-700 sm:text-lg dark:text-emerald-300">
                ₹{cashPurchases.toLocaleString('en-IN')}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-3 transition-all',
                activeTab === 'credit'
                  ? 'border-indigo-500/50 bg-indigo-50 ring-2 ring-indigo-500/20 dark:border-indigo-500/50 dark:bg-indigo-950/30'
                  : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Credit Purchase (उधारी)
              </p>
              <p className="font-poppins mt-0.5 text-base font-extrabold text-indigo-700 sm:text-lg dark:text-indigo-300">
                ₹{creditPurchases.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Filtered Records List Table */}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <th className="px-3.5 py-2">Bill / Order No</th>
                  <th className="px-3.5 py-2">Supplier / Vendor</th>
                  <th className="px-3.5 py-2 text-center">Payment Mode</th>
                  <th className="px-3.5 py-2 text-right">Amount ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No {activeTab} purchase bills recorded today yet.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-2 font-mono font-bold text-slate-900 dark:text-white">
                        {bill.billNumber}
                      </td>
                      <td className="px-3.5 py-2 font-medium text-slate-700 dark:text-slate-300">
                        {bill.supplierName}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold',
                            bill.paymentMode === 'cash'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
                          )}
                        >
                          {bill.paymentMode === 'cash' ? '💵 Cash Purchase' : '💳 Credit Purchase'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-bold text-slate-900 dark:text-white">
                        ₹{Number(bill.grandTotal || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-5 py-3 dark:border-white/[0.08] dark:bg-slate-800/50">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Showing {filteredBills.length} purchase records (
            {activeTab === 'all' ? 'All' : activeTab.toUpperCase()} filter)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToOrders(activeTab === 'all' ? undefined : activeTab);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-teal-500/20 hover:bg-teal-700"
            >
              <span>View Purchase Module</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TOTAL SUPPLIERS & PRODUCTS MODAL
// ═══════════════════════════════════════════════════════════

function TotalSuppliersModal({
  isOpen,
  onClose,
  kpiData,
  onNavigateToSuppliers,
}: {
  isOpen: boolean;
  onClose: () => void;
  kpiData: any;
  onNavigateToSuppliers: () => void;
}) {
  const [search, setSearch] = useState('');

  if (!isOpen) {
    return null;
  }

  const rawList: Array<{
    id: string;
    name: string;
    code: string;
    mobile: string;
    city: string;
    gstin: string;
    productsSupplied: string[];
    outstanding: number;
    status: string;
  }> = kpiData.suppliersList || [];

  const filteredSuppliers = rawList.filter((s) => {
    if (!search.trim()) {return true;}
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.mobile.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.productsSupplied.some((p) => p.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111827]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 dark:border-white/[0.08] dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <Truck className="h-5 w-5" strokeWidth={1.85} />
            </div>
            <div>
              <h3 className="font-poppins text-sm font-extrabold text-slate-900 dark:text-white">
                🚚 पुरवठादार व त्यांनी दिलेली उत्पादने | Suppliers & Products Supplied
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                View all registered suppliers and the products they supply
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200/80 bg-slate-100/50 px-5 py-3 dark:border-white/[0.08] dark:bg-slate-800/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Supplier Name, Code, Phone or Supplied Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto p-5">
          <div className="space-y-3">
            {filteredSuppliers.map((sup) => (
              <div
                key={sup.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all hover:border-purple-300 hover:bg-purple-50/30 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-poppins text-xs font-extrabold text-slate-900 dark:text-white">
                        {sup.name}
                      </span>
                      <span className="rounded-md bg-purple-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        {sup.code}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      📍 {sup.city} · 📱 {sup.mobile} · GSTIN:{' '}
                      <span className="font-mono">{sup.gstin}</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Outstanding Due
                    </p>
                    <p className="font-poppins text-xs font-extrabold text-amber-700 dark:text-amber-400">
                      ₹{sup.outstanding.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200/60 pt-2.5 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {sup.productsSupplied.map((prod, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2 py-0.5 text-[11px] font-bold text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-300"
                      >
                        <Package className="h-3 w-3 text-purple-500" />
                        <span>{prod}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-5 py-3 dark:border-white/[0.08] dark:bg-slate-800/50">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Total {filteredSuppliers.length} suppliers registered
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToSuppliers();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:bg-purple-700"
            >
              <span>Open Suppliers Master Module</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TOTAL PRODUCTS MODAL
// ═══════════════════════════════════════════════════════════

function TotalProductsModal({
  isOpen,
  onClose,
  kpiData,
  onNavigateToProducts,
}: {
  isOpen: boolean;
  onClose: () => void;
  kpiData: any;
  onNavigateToProducts: () => void;
}) {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) {
    return null;
  }

  const rawList: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    unit: string;
    sellingPrice: number;
    purchasePrice: number;
  }> = kpiData.productsByCategoryList || [];

  const categoriesList = ['all', ...Array.from(new Set(rawList.map((p) => p.category)))];

  const filteredProducts = rawList.filter((p) => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    if (!search.trim()) {return matchesCat;}
    const q = search.toLowerCase();
    return (
      matchesCat &&
      (p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111827]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 dark:border-white/[0.08] dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Package className="h-5 w-5" strokeWidth={1.85} />
            </div>
            <div>
              <h3 className="font-poppins text-sm font-extrabold text-slate-900 dark:text-white">
                📦 श्रेणीनुसार उत्पादने | Category-Wise Products Breakdown
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Filter and view all inventory products grouped by category (खते, बियाणे, कीटकनाशके)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Categories */}
        <div className="border-b border-slate-200/80 bg-slate-100/60 px-5 py-2.5 dark:border-white/[0.08] dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-2">
            {categoriesList.map((cat) => {
              const isActive = selectedCat === cat;
              const count =
                cat === 'all' ? rawList.length : rawList.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40'
                      : 'bg-white text-slate-700 hover:bg-slate-200/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  <span>{cat === 'all' ? '🌟 All Products (सर्व)' : cat}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px]',
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200/80 bg-slate-50/50 px-5 py-2.5 dark:border-white/[0.08] dark:bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product by name, brand or SKU code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[340px] overflow-y-auto p-5">
          <div className="rounded-xl border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <th className="px-3.5 py-2.5">Product & SKU</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5 text-center">Available Stock</th>
                  <th className="px-3.5 py-2.5 text-right">Selling Rate ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5">
                      <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                      {p.currentStock} {p.unit}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900 dark:text-white">
                      ₹{p.sellingPrice.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-5 py-3 dark:border-white/[0.08] dark:bg-slate-800/50">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Showing {filteredProducts.length} items
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToProducts();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
            >
              <span>Open Products Master Module</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE — Pixel-Accurate Enterprise Re-creation
// ═══════════════════════════════════════════════════════════

export function DashboardPage() {
  const navigate = useNavigate();

  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);

  const [kpiData, setKpiData] = useState<any>({
    revenue: { value: 0, change: 0, period: 'today' },
    purchases: { value: 0, change: 0, period: 'today' },
    inventoryValue: 0,
    pendingApprovals: 0,
    todayInvoiceCount: 0,
    todayInvoiceChange: 0,
    todayCashSales: 0,
    todayCreditSales: 0,
    todayCashCount: 0,
    todayCreditCount: 0,
    todaySalesList: [],
    todayCashPurchases: 0,
    todayCreditPurchases: 0,
    todayCashPurchaseCount: 0,
    todayCreditPurchaseCount: 0,
    todayPurchaseList: [],
    totalCustomersCount: 0,
    customerGrowthChange: 0,
    totalProductsCount: 0,
    productGrowthChange: 0,
    totalSuppliersCount: 0,
    suppliersList: [],
    productsByCategoryList: [],
    stockStatus: {
      totalProducts: 0,
      inStockCount: 0,
      lowStockCount: 0,
      criticalStockCount: 0,
      outOfStockCount: 0,
    },
    salesOverview: undefined,
    purchaseOverview: undefined,
    expiryAlerts: [],
    recentTransactions: [],
    topSellingProducts: [],
    bottomSummary: {
      pendingOrders: 0,
      pendingInvoices: 0,
      outstandingAmount: '₹0',
      cashInHand: '₹0',
    },
  });

  const [, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchDashboardData = () => {
    setLoading(true);
    setFetchError(null);
    apiRequest<any>('/dashboard')
      .then((res) => {
        if (res) {
          const k = res.kpis || {};
          setKpiData((prev: any) => ({
            ...prev,
            revenue: {
              value: Number(k.today?.value ?? k.revenue?.value ?? 0),
              change: k.today?.change ?? k.revenue?.change ?? 0,
              period: 'today',
            },
            purchases: {
              value: Number(k.todayPurchase?.value ?? k.purchases?.value ?? 0),
              change: k.todayPurchase?.change ?? k.purchases?.change ?? 0,
              period: 'today',
            },
            inventoryValue: Number(k.inventoryValue ?? 0),
            pendingApprovals: Number(k.pendingApprovals ?? 0),
            todayInvoiceCount: Number(k.todayInvoiceCount ?? 0),
            todayInvoiceChange: Number(k.todayInvoiceChange ?? 0),
            todayCashSales: Number(k.todayCashSales ?? 0),
            todayCreditSales: Number(k.todayCreditSales ?? 0),
            todayCashCount: Number(k.todayCashCount ?? 0),
            todayCreditCount: Number(k.todayCreditCount ?? 0),
            todaySalesList: k.todaySalesList || [],
            todayCashPurchases: Number(k.todayCashPurchases ?? 0),
            todayCreditPurchases: Number(k.todayCreditPurchases ?? 0),
            todayCashPurchaseCount: Number(k.todayCashPurchaseCount ?? 0),
            todayCreditPurchaseCount: Number(k.todayCreditPurchaseCount ?? 0),
            todayPurchaseList: k.todayPurchaseList || [],
            totalCustomersCount: Number(k.totalCustomersCount ?? 0),
            customerGrowthChange: Number(k.customerGrowthChange ?? 0),
            totalProductsCount: Number(k.totalProductsCount ?? 0),
            productGrowthChange: Number(k.productGrowthChange ?? 0),
            totalSuppliersCount: Number(k.totalSuppliersCount ?? 0),
            suppliersList: k.suppliersList || [],
            productsByCategoryList: k.productsByCategoryList || [],
            stockStatus: res.stockStatus || prev.stockStatus,
            salesOverview: res.salesOverview || prev.salesOverview,
            purchaseOverview: res.purchaseOverview || prev.purchaseOverview,
            expiryAlerts: res.expiryAlerts || [],
            recentTransactions: res.recentTransactions || [],
            topSellingProducts: res.topSellingProducts || [],
            bottomSummary: res.bottomSummary || prev.bottomSummary,
          }));
        }
      })
      .catch((err) => {
        const msg = (err as Error).message || 'डेटा लोड करण्यात अयशस्वी';
        setFetchError(msg);
        console.warn('[Dashboard] /dashboard fetch info:', msg);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format 6 KPI Card items for the horizontal row
  const kpiItems = [
    {
      id: 'today-sales',
      title: 'आजची विक्री',
      value: formatCurrency(kpiData.revenue?.value || 0),
      subLabel: 'कालच्या तुलनेत',
      changePercent: kpiData.revenue?.change ?? 0,
      icon: TrendingUp,
      colorScheme: 'emerald' as const,
      onClick: () => setShowSalesModal(true),
    },
    {
      id: 'today-purchase',
      title: 'आजची खरेदी',
      value: formatCurrency(kpiData.purchases?.value || 0),
      subLabel: 'कालच्या तुलनेत',
      changePercent: kpiData.purchases?.change ?? 0,
      icon: ShoppingCart,
      colorScheme: 'blue' as const,
      onClick: () => setShowPurchaseModal(true),
    },
    {
      id: 'today-invoices',
      title: 'आजची देयके (Invoices)',
      value: String(kpiData.todayInvoiceCount || 0),
      subLabel: 'कालच्या तुलनेत',
      changePercent: kpiData.todayInvoiceChange ?? 0,
      icon: FileText,
      colorScheme: 'purple' as const,
      onClick: () => navigate('/sales/invoices'),
    },
    {
      id: 'total-customers',
      title: 'एकूण ग्राहक',
      value: kpiData.totalCustomersCount
        ? kpiData.totalCustomersCount.toLocaleString('en-IN')
        : '0',
      subLabel: 'एकूण नोंदणीकृत',
      changePercent: kpiData.customerGrowthChange ?? 0,
      icon: Users,
      colorScheme: 'orange' as const,
      onClick: () => navigate('/customers'),
    },
    {
      id: 'total-products',
      title: 'एकूण उत्पादने',
      value: kpiData.totalProductsCount ? kpiData.totalProductsCount.toLocaleString('en-IN') : '0',
      subLabel: 'सक्रिय उत्पादने',
      changePercent: kpiData.productGrowthChange ?? 0,
      icon: Package,
      colorScheme: 'cyan' as const,
      onClick: () => setShowProductsModal(true),
    },
    {
      id: 'stock-value',
      title: 'एकूण स्टॉक मूल्य',
      value: kpiData.inventoryValue ? formatCompactCurrency(kpiData.inventoryValue) : '₹0',
      subLabel: 'सध्याचे मूल्य',
      changePercent: kpiData.stockValueChange ?? 0,
      icon: Database,
      colorScheme: 'amber' as const,
      onClick: () => navigate('/inventory/ledger'),
    },
  ];

  return (
    <div className="animate-in fade-in flex h-full min-h-0 flex-col justify-between gap-2 duration-300 xl:gap-2.5">
      {/* ── BREAKDOWN MODALS ── */}
      <TodaySalesBreakdownModal
        isOpen={showSalesModal}
        onClose={() => setShowSalesModal(false)}
        kpiData={kpiData}
        onNavigateToInvoices={(modeFilter) => {
          if (modeFilter) {
            navigate(`/sales/invoices?type=${modeFilter}`);
          } else {
            navigate('/sales/invoices');
          }
        }}
      />

      <TodayPurchaseBreakdownModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        kpiData={kpiData}
        onNavigateToOrders={(modeFilter) => {
          if (modeFilter) {
            navigate(`/purchase/orders?type=${modeFilter}`);
          } else {
            navigate('/purchase/orders');
          }
        }}
      />

      <TotalSuppliersModal
        isOpen={showSuppliersModal}
        onClose={() => setShowSuppliersModal(false)}
        kpiData={kpiData}
        onNavigateToSuppliers={() => navigate('/suppliers')}
      />

      <TotalProductsModal
        isOpen={showProductsModal}
        onClose={() => setShowProductsModal(false)}
        kpiData={kpiData}
        onNavigateToProducts={() => navigate('/products')}
      />

      {/* ── ERROR BANNER (if API fails) ── */}
      {fetchError && (
        <div className="shadow-xs flex shrink-0 items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          <span>डेटा लोड करताना त्रुटी आली ({fetchError}).</span>
          <button
            onClick={fetchDashboardData}
            className="ml-2 font-bold underline hover:opacity-80"
          >
            पुन्हा प्रयत्न करा
          </button>
        </div>
      )}

      {/* ── ROW 1: HERO BANNER ── */}
      <div className="shrink-0">
        <HeroBanner
          companyName="Default Company"
          financialYear="FY 2025-26"
          weather="28°C • ढगाळ वातावरण"
          location="Pune, Maharashtra"
        />
      </div>

      {/* ── ROW 2: KPI CARDS (6-column desktop row) ── */}
      <div className="shrink-0">
        <KPICardsRow items={kpiItems} />
      </div>

      {/* ── ROW 3: MAIN ANALYTICS ROW (Sales Overview, Purchase Overview, Stock Status) ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-12 xl:gap-2.5">
        {/* Sales Overview */}
        <div className="h-full lg:col-span-4">
          <SalesOverviewCard
            totalSales={
              kpiData.salesOverview?.weekly?.total || formatCurrency(kpiData.revenue?.value || 0)
            }
            changePercent={
              kpiData.salesOverview?.weekly?.changePercent ?? kpiData.revenue?.change ?? 0
            }
            periodLabel={kpiData.salesOverview?.weekly?.label || 'या आठवड्यात'}
            overviewData={kpiData.salesOverview}
          />
        </div>

        {/* Purchase Overview */}
        <div className="h-full lg:col-span-4">
          <PurchaseOverviewCard
            totalPurchases={
              kpiData.purchaseOverview?.weekly?.total ||
              formatCurrency(kpiData.purchases?.value || 0)
            }
            changePercent={
              kpiData.purchaseOverview?.weekly?.changePercent ?? kpiData.purchases?.change ?? 0
            }
            periodLabel={kpiData.purchaseOverview?.weekly?.label || 'या आठवड्यात'}
            overviewData={kpiData.purchaseOverview}
          />
        </div>

        {/* Stock Status Donut Chart */}
        <div className="h-full lg:col-span-4">
          <StockStatusCard
            totalProducts={kpiData.stockStatus?.totalProducts ?? kpiData.totalProductsCount ?? 0}
            inStockCount={kpiData.stockStatus?.inStockCount ?? 0}
            lowStockCount={kpiData.stockStatus?.lowStockCount ?? 0}
            criticalStockCount={kpiData.stockStatus?.criticalStockCount ?? 0}
            outOfStockCount={kpiData.stockStatus?.outOfStockCount ?? 0}
            onViewAll={() => navigate('/inventory/products')}
          />
        </div>
      </div>

      {/* ── ROW 4: SECOND CONTENT ROW (Expiry Alerts, Recent Transactions, Top Products) ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-3 xl:gap-2.5">
        {/* Expiry Alerts */}
        <div className="h-full">
          <ExpiryAlertsCard
            items={kpiData.expiryAlerts}
            onViewAll={() => navigate('/inventory/batches')}
          />
        </div>

        {/* Recent Transaction Log */}
        <div className="h-full">
          <RecentTransactionsCard
            transactions={kpiData.recentTransactions}
            onViewAll={() => navigate('/sales/invoices')}
          />
        </div>

        {/* Top Selling Products */}
        <div className="h-full">
          <TopSellingProductsCard
            products={kpiData.topSellingProducts}
            onViewAll={() => navigate('/inventory/products')}
          />
        </div>
      </div>

      {/* ── ROW 5: BOTTOM ROW (Summary Cards + Quick Shortcuts) ── */}
      <div className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-12 xl:gap-2.5">
        {/* 4 Bottom Summary Cards */}
        <div className="h-full lg:col-span-7">
          <BottomSummaryCards
            pendingOrders={kpiData.bottomSummary?.pendingOrders ?? 0}
            pendingInvoices={kpiData.bottomSummary?.pendingInvoices ?? 0}
            outstandingAmount={kpiData.bottomSummary?.outstandingAmount || '₹0'}
            cashInHand={kpiData.bottomSummary?.cashInHand || '₹0'}
          />
        </div>

        {/* Quick Shortcuts */}
        <div className="h-full lg:col-span-5">
          <QuickShortcutsCard />
        </div>
      </div>
    </div>
  );
}
