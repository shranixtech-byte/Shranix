import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  Check,
  ChevronRight,
  History,
  IndianRupee,
  Info,
  Percent,
  ScrollText,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';

import type { InvoiceLineItem } from './product-selection-screen';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

type InvoiceDiscountMode = 'none' | 'percentage' | 'flat' | 'round_off' | 'custom';

type DiscountRuleType =
  | 'retail'
  | 'wholesale'
  | 'dealer'
  | 'farmer'
  | 'festival'
  | 'seasonal'
  | 'scheme'
  | 'promotion'
  | 'special'
  | 'manual';

type DiscountReason =
  | 'customer_adjustment'
  | 'damaged_packing'
  | 'special_rate'
  | 'promotion'
  | 'festival'
  | 'relationship'
  | 'management_approval'
  | 'other';

interface DiscountAuditEntry {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  changedBy: string;
}

interface DiscountEngineState {
  invoiceDiscountMode: InvoiceDiscountMode;
  invoiceDiscountPercent: number;
  invoiceDiscountFlat: number;
  invoiceCustomAmount: number;
  applyRoundOff: boolean;
  selectedRule: DiscountRuleType;
  reason: DiscountReason | '';
  reasonRemark: string;
  requiresApproval: boolean;
  approvalGranted: boolean;
}

// ═════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════

const DISCOUNT_RULES: { label: string; value: DiscountRuleType; description: string }[] = [
  { label: 'Retail Discount', value: 'retail', description: 'Standard retail customer discount' },
  { label: 'Wholesale Discount', value: 'wholesale', description: 'Bulk wholesale pricing' },
  { label: 'Dealer Discount', value: 'dealer', description: 'Authorized dealer rate' },
  { label: 'Farmer Discount', value: 'farmer', description: 'Agricultural subsidy discount' },
  { label: 'Festival Discount', value: 'festival', description: 'Festival season offer' },
  { label: 'Seasonal Discount', value: 'seasonal', description: 'End of season clearance' },
  { label: 'Scheme Discount', value: 'scheme', description: 'Company scheme discount' },
  { label: 'Promotion Discount', value: 'promotion', description: 'Marketing promotion' },
  { label: 'Special Discount', value: 'special', description: 'Special approved rate' },
  { label: 'Manual Discount', value: 'manual', description: 'User entered manually' },
];

const DISCOUNT_REASONS: { label: string; value: DiscountReason }[] = [
  { label: 'Customer Adjustment', value: 'customer_adjustment' },
  { label: 'Damaged Packing', value: 'damaged_packing' },
  { label: 'Special Rate', value: 'special_rate' },
  { label: 'Promotion', value: 'promotion' },
  { label: 'Festival', value: 'festival' },
  { label: 'Relationship', value: 'relationship' },
  { label: 'Management Approval', value: 'management_approval' },
  { label: 'Other', value: 'other' },
];

const MAX_DISCOUNT_PERCENT = 50; // Configurable limit
// Approval limit Settings Hub → Sales: discountApprovalLimit se aata hai
// (default 30). discountApproval OFF asta tar approval gate band rehta hai.
const DEFAULT_DISCOUNT_APPROVAL_LIMIT = 30;

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcInvoiceDiscount(
  grossTotal: number,
  mode: InvoiceDiscountMode,
  percent: number,
  flat: number,
  customAmt: number,
): number {
  switch (mode) {
    case 'percentage':
      return Math.round(grossTotal * (percent / 100) * 100) / 100;
    case 'flat':
      return Math.min(flat, grossTotal);
    case 'round_off':
      return 0; // Handled separately
    case 'custom':
      return Math.min(customAmt, grossTotal);
    default:
      return 0;
  }
}

// ═════════════════════════════════════════════════════════
// INVOICE SUMMARY CARD
// ═════════════════════════════════════════════════════════

interface InvoiceSummaryCardProps {
  customerName: string;
  invoiceNumber: string;
  itemCount: number;
  grossAmount: number;
  currentDiscount: number;
  grandTotal: number;
}

const InvoiceSummaryCard = memo(function InvoiceSummaryCard({
  customerName,
  invoiceNumber,
  itemCount,
  grossAmount,
  currentDiscount,
  grandTotal,
}: InvoiceSummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        {/* Customer + Invoice Info */}
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Customer
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {customerName || '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Invoice
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {invoiceNumber || '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Items
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{itemCount}</p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Gross
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatINR(grossAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Discount
            </p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {formatINR(currentDiscount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Grand Total
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(grandTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Discount Rule Badge */}
      <div className="border-t border-slate-100 px-5 py-2 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Tag className="h-3.5 w-3.5" />
          <span>Discount Engine Active</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// INVOICE DISCOUNT PANEL (LEFT SIDE)
// ═════════════════════════════════════════════════════════

interface InvoiceDiscountPanelProps {
  state: DiscountEngineState;
  grossTotal: number;
  onStateChange: (patch: Partial<DiscountEngineState>) => void;
  discountApprovalLimit: number;
  discountApprovalEnabled: boolean;
}

const InvoiceDiscountPanel = memo(function InvoiceDiscountPanel({
  state,
  grossTotal,
  onStateChange,
  discountApprovalLimit,
  discountApprovalEnabled,
}: InvoiceDiscountPanelProps) {
  const discountAmount = calcInvoiceDiscount(
    grossTotal,
    state.invoiceDiscountMode,
    state.invoiceDiscountPercent,
    state.invoiceDiscountFlat,
    state.invoiceCustomAmount,
  );
  const exceedsLimit =
    state.invoiceDiscountPercent > MAX_DISCOUNT_PERCENT ||
    (state.invoiceDiscountMode === 'flat' && state.invoiceDiscountFlat > grossTotal * 0.5);
  const needsApproval =
    discountApprovalEnabled &&
    (state.invoiceDiscountPercent > discountApprovalLimit ||
      (state.invoiceDiscountMode === 'flat' && state.invoiceDiscountFlat > grossTotal * 0.3));
  const showReason =
    state.selectedRule === 'manual' ||
    (state.invoiceDiscountMode !== 'none' && state.invoiceDiscountPercent > 0);

  return (
    <div className="space-y-4">
      {/* Discount Mode Selector */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <BadgePercent className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Invoice Level Discount
          </h3>
        </div>

        <div className="space-y-4 p-4">
          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {(['none', 'percentage', 'flat', 'round_off', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onStateChange({ invoiceDiscountMode: mode })}
                className={cn(
                  'rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-all',
                  state.invoiceDiscountMode === mode
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500',
                )}
              >
                {mode === 'none'
                  ? 'No Disc'
                  : mode === 'percentage'
                    ? '% Percent'
                    : mode === 'flat'
                      ? '₹ Flat'
                      : mode === 'round_off'
                        ? 'Round Off'
                        : 'Custom'}
              </button>
            ))}
          </div>

          {/* Percentage Input */}
          {state.invoiceDiscountMode === 'percentage' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Discount Percentage
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={state.invoiceDiscountPercent || ''}
                    onChange={(e) =>
                      onStateChange({
                        invoiceDiscountPercent: Math.min(
                          100,
                          Math.max(0, parseFloat(e.target.value) || 0),
                        ),
                      })
                    }
                    min={0}
                    max={100}
                    step={0.01}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-white pl-8 pr-3 text-right text-sm font-medium outline-none transition-all',
                      'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
                      'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      exceedsLimit &&
                        'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20',
                    )}
                    aria-label="Invoice discount percentage"
                  />
                  <Percent className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <span className="min-w-[80px] text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                  -{formatINR(discountAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Flat Amount Input */}
          {state.invoiceDiscountMode === 'flat' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Flat Discount Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={state.invoiceDiscountFlat || ''}
                    onChange={(e) =>
                      onStateChange({
                        invoiceDiscountFlat: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    min={0}
                    step={0.01}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-white pl-8 pr-3 text-right text-sm font-medium outline-none transition-all',
                      'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
                      'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      exceedsLimit &&
                        'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20',
                    )}
                    aria-label="Flat discount amount"
                  />
                  <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <span className="min-w-[80px] text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                  -{formatINR(discountAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Custom Amount Input */}
          {state.invoiceDiscountMode === 'custom' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Custom Discount Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={state.invoiceCustomAmount || ''}
                    onChange={(e) =>
                      onStateChange({
                        invoiceCustomAmount: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    min={0}
                    step={0.01}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-right text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    aria-label="Custom discount amount"
                  />
                  <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          )}

          {/* Round Off Toggle */}
          {state.invoiceDiscountMode === 'round_off' && (
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Round Off to Nearest Integer
                </p>
                <p className="text-xs text-slate-400">Auto round the grand total</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={state.applyRoundOff}
                  onChange={(e) => onStateChange({ applyRoundOff: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full dark:bg-slate-600" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Discount Rules */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <ScrollText className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Discount Rule</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
            {DISCOUNT_RULES.map((rule) => (
              <button
                key={rule.value}
                type="button"
                onClick={() => onStateChange({ selectedRule: rule.value })}
                className={cn(
                  'rounded-lg border px-2.5 py-2 text-left transition-all',
                  state.selectedRule === rule.value
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:border-emerald-600 dark:bg-emerald-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500',
                )}
                title={rule.description}
              >
                <p
                  className={cn(
                    'text-[11px] font-semibold',
                    state.selectedRule === rule.value
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-300',
                  )}
                >
                  {rule.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Validation Warnings */}
      {exceedsLimit && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Discount exceeds configured limit ({MAX_DISCOUNT_PERCENT}% / 50% of gross)
            </p>
            {needsApproval && (
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                Manager approval required to proceed
              </p>
            )}
          </div>
        </div>
      )}

      {/* Discount Reason (mandatory for manual discount) */}
      {showReason && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Discount Reason
            </h3>
            <span className="text-xs font-medium text-red-500">*Required</span>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Reason
              </label>
              <select
                value={state.reason}
                onChange={(e) => onStateChange({ reason: e.target.value as DiscountReason })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select reason...</option>
                {DISCOUNT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Remark (optional)
              </label>
              <textarea
                value={state.reasonRemark}
                onChange={(e) => onStateChange({ reasonRemark: e.target.value })}
                rows={2}
                placeholder="Add remarks..."
                className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Audit History Preview */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400 dark:bg-slate-700/30 dark:text-slate-500">
              <History className="h-3.5 w-3.5" />
              <span>Discount audit trail will be recorded on save</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// ITEM DISCOUNT TABLE (RIGHT SIDE)
// ═════════════════════════════════════════════════════════

interface ItemDiscountTableProps {
  items: InvoiceLineItem[];
  activeRow: number;
  onItemDiscountChange: (index: number, field: string, value: number | string) => void;
}

const ItemDiscountTable = memo(function ItemDiscountTable({
  items,
  activeRow,
  onItemDiscountChange,
}: ItemDiscountTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <Tag className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Item Level Discounts
        </h3>
        <span className="ml-auto text-xs text-slate-400">{items.length} items</span>
      </div>

      <div className="max-h-[400px] overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                #
              </th>
              <th className="sticky top-0 z-10 w-[200px] bg-slate-50/95 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Product
              </th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Qty
              </th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Rate
              </th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Disc %
              </th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Disc ₹
              </th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Scheme
              </th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Free
              </th>
              <th className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                  No items to display
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    'transition-colors',
                    index === activeRow
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30',
                  )}
                >
                  <td className="px-3 py-2.5 text-center text-xs text-slate-400">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <p className="max-w-[180px] truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.productName}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">{item.sku}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-600 dark:text-slate-400">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-900 dark:text-slate-100">
                    {formatINR(item.rate)}
                  </td>

                  {/* Discount % */}
                  <td className="px-1 py-2.5">
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        value={item.discountPercent || ''}
                        onChange={(e) =>
                          onItemDiscountChange(
                            index,
                            'discountPercent',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        min={0}
                        max={100}
                        step={0.01}
                        className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1 text-center text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        aria-label={`Discount percent for ${item.productName}`}
                      />
                    </div>
                  </td>

                  {/* Disc ₹ */}
                  <td className="px-1 py-2.5">
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        value={item.discountValue || ''}
                        onChange={(e) =>
                          onItemDiscountChange(
                            index,
                            'discountValue',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        min={0}
                        step={0.01}
                        className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1 text-right text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        aria-label={`Flat discount for ${item.productName}`}
                      />
                    </div>
                  </td>

                  {/* Scheme */}
                  <td className="px-1 py-2.5">
                    <input
                      type="text"
                      value={item.schemeName || ''}
                      onChange={(e) => onItemDiscountChange(index, 'schemeName', e.target.value)}
                      placeholder="—"
                      className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1 text-center text-[10px] outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      aria-label={`Scheme name for ${item.productName}`}
                    />
                  </td>

                  {/* Free */}
                  <td className="px-1 py-2.5">
                    <input
                      type="number"
                      value={item.freeQty || ''}
                      onChange={(e) =>
                        onItemDiscountChange(index, 'freeQty', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      step={0.01}
                      className="h-7 w-12 rounded-md border border-slate-200 bg-white px-1 text-center text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      aria-label={`Free quantity for ${item.productName}`}
                    />
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(item.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// LIVE CALCULATION SUMMARY
// ═════════════════════════════════════════════════════════

interface LiveSummaryProps {
  grossTotal: number;
  itemDiscountTotal: number;
  invoiceDiscountAmount: number;
  mode: InvoiceDiscountMode;
  roundOff: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  netAmount: number;
  grandTotal: number;
}

const LiveSummary = memo(function LiveSummary({
  grossTotal,
  itemDiscountTotal,
  invoiceDiscountAmount,
  mode,
  roundOff,
  taxableAmount,
  cgstTotal,
  sgstTotal,
  igstTotal,
  cessTotal,
  netAmount,
  grandTotal,
}: LiveSummaryProps) {
  return (
    <div className="sticky bottom-0 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5 dark:border-slate-700">
        <BadgePercent className="h-4 w-4 text-emerald-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Discount Calculation Summary
        </h3>
        {mode !== 'none' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {mode === 'percentage'
              ? `${invoiceDiscountAmount > 0 ? 'Invoice %' : 'No Disc'}`
              : mode === 'flat'
                ? 'Invoice Flat'
                : mode === 'round_off'
                  ? 'Round Off'
                  : 'Custom'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCell label="Gross Amount" value={formatINR(grossTotal)} />
        <SummaryCell
          label="Item Discount"
          value={formatINR(itemDiscountTotal)}
          className="text-red-600 dark:text-red-400"
        />
        <SummaryCell
          label="Invoice Discount"
          value={formatINR(invoiceDiscountAmount)}
          className="text-red-600 dark:text-red-400"
        />
        <SummaryCell label="Taxable" value={formatINR(taxableAmount)} />
        <SummaryCell
          label="CGST"
          value={formatINR(cgstTotal)}
          className="text-blue-600 dark:text-blue-400"
        />
        <SummaryCell
          label="SGST"
          value={formatINR(sgstTotal)}
          className="text-blue-600 dark:text-blue-400"
        />
        <SummaryCell
          label="IGST"
          value={formatINR(igstTotal)}
          className="text-purple-600 dark:text-purple-400"
        />
        <SummaryCell
          label="CESS"
          value={formatINR(cessTotal)}
          className="text-orange-600 dark:text-orange-400"
        />
        <SummaryCell
          label="Round Off"
          value={roundOff.toFixed(2)}
          className={roundOff < 0 ? 'text-red-500' : 'text-emerald-500'}
        />
        <SummaryCell
          label="Net Amount"
          value={formatINR(netAmount)}
          className="text-indigo-600 dark:text-indigo-400"
        />
        <div className="col-span-full flex items-center justify-end lg:col-span-1">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(grandTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

function SummaryCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={cn('text-sm font-bold text-slate-800 dark:text-slate-200', className)}>
        {value}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// DISCOUNT ENGINE SCREEN (MAIN)
// ═════════════════════════════════════════════════════════

export interface DiscountEngineScreenProps {
  items: InvoiceLineItem[];
  customerName: string;
  invoiceNumber: string;
  grossTotal: number;
  onItemsChange: (items: InvoiceLineItem[]) => void;
  onComplete: (finalItems: InvoiceLineItem[], state: DiscountEngineState) => void;
  onBack: () => void;
}

export function DiscountEngineScreen({
  items: initialItems,
  customerName,
  invoiceNumber,
  grossTotal: initialGross,
  onItemsChange,
  onComplete,
  onBack,
}: DiscountEngineScreenProps) {
  // ── Local state ────────────────────────────────────
  const [items, setItems] = useState<InvoiceLineItem[]>(initialItems);
  const [discountState, setDiscountState] = useState<DiscountEngineState>({
    invoiceDiscountMode: 'none',
    invoiceDiscountPercent: 0,
    invoiceDiscountFlat: 0,
    invoiceCustomAmount: 0,
    applyRoundOff: false,
    selectedRule: 'retail',
    reason: '',
    reasonRemark: '',
    requiresApproval: false,
    approvalGranted: false,
  });

  const [showAudit, setShowAudit] = useState(false);
  const [auditLog, setAuditLog] = useState<DiscountAuditEntry[]>([]);
  const [focusMode, setFocusMode] = useState<'left' | 'right'>('left');
  // Sales Settings → Discount Approval: limit + gate (default preserve purana behavior)
  const [discountApprovalLimit, setDiscountApprovalLimit] = useState(
    DEFAULT_DISCOUNT_APPROVAL_LIMIT,
  );
  const [discountApprovalEnabled, setDiscountApprovalEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await apiRequest<Record<string, unknown>>('/sales/settings');
        if (!cancelled && settings) {
          if (typeof settings.discountApprovalLimit === 'number') {
            setDiscountApprovalLimit(settings.discountApprovalLimit);
          }
          setDiscountApprovalEnabled(settings.discountApproval !== false);
        }
      } catch {
        /* settings load fail → defaults (purana behavior) */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDiscountState = useCallback((patch: Partial<DiscountEngineState>) => {
    setDiscountState((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Items are synced back to parent via onItemsChange
  // in handleItemDiscountChange

  // ── Item discount changes ─────────────────────────
  const handleItemDiscountChange = useCallback(
    (index: number, field: string, value: number | string) => {
      setItems((prev) => {
        const next = prev.map((item, i) => {
          if (i !== index) {
            return item;
          }
          return { ...item, [field]: value };
        });
        onItemsChange(next);
        return next;
      });
      // Log audit entry
      setAuditLog((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          field,
          oldValue: '',
          newValue: String(value),
          reason: discountState.reason || 'Item discount update',
          changedBy: 'user',
        },
      ]);
    },
    [discountState.reason, onItemsChange],
  );

  // ── Computed values ────────────────────────────────
  const computed = useMemo(() => {
    // Item discount total — use pre-computed item amounts minus taxable amounts
    const itemDiscountTotal = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.rate;
      return sum + (lineTotal - item.taxableAmount);
    }, 0);

    // Invoice level discount
    const invoiceDiscountAmount = calcInvoiceDiscount(
      initialGross - itemDiscountTotal,
      discountState.invoiceDiscountMode,
      discountState.invoiceDiscountPercent,
      discountState.invoiceDiscountFlat,
      discountState.invoiceCustomAmount,
    );

    // After invoice discount
    const afterInvoiceDisc = initialGross - itemDiscountTotal - invoiceDiscountAmount;

    // Taxable is the after-invoice-discount amount
    const taxableAmount = afterInvoiceDisc;

    // GST: reuse pre-computed per-item GST amounts from Step 3 (scaled to taxable ratio)
    const originalTaxable = items.reduce((s, i) => s + i.taxableAmount, 0);
    const gstScale = originalTaxable > 0 ? taxableAmount / originalTaxable : 1;
    const cgstTotal = items.reduce((s, i) => s + i.cgstAmount, 0) * gstScale;
    const sgstTotal = items.reduce((s, i) => s + i.sgstAmount, 0) * gstScale;
    const igstTotal = items.reduce((s, i) => s + i.igstAmount, 0) * gstScale;
    const cessTotal = items.reduce((s, i) => s + i.cessAmount, 0) * gstScale;

    const netAmount = taxableAmount + cgstTotal + sgstTotal + igstTotal + cessTotal;
    const roundOff = discountState.applyRoundOff ? Math.round(netAmount) - netAmount : 0;
    const grandTotal = discountState.applyRoundOff ? Math.round(netAmount) : netAmount;

    return {
      itemDiscountTotal,
      invoiceDiscountAmount,
      afterInvoiceDisc,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
      netAmount,
      roundOff,
      grandTotal,
    };
  }, [items, initialGross, discountState]);

  // ── Validation ────────────────────────────────────
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const isManual = discountState.selectedRule === 'manual';
    const hasDiscount =
      discountState.invoiceDiscountMode !== 'none' &&
      (discountState.invoiceDiscountPercent > 0 ||
        discountState.invoiceDiscountFlat > 0 ||
        discountState.invoiceCustomAmount > 0);

    if (isManual && hasDiscount && !discountState.reason) {
      errors.push('Discount reason is required for manual discount');
    }
    if (discountState.invoiceDiscountPercent > MAX_DISCOUNT_PERCENT) {
      errors.push(`Discount exceeds ${MAX_DISCOUNT_PERCENT}% limit`);
    }
    if (
      discountApprovalEnabled &&
      discountState.invoiceDiscountPercent > discountApprovalLimit &&
      !discountState.approvalGranted
    ) {
      errors.push(`Manager approval required for discount above ${discountApprovalLimit}%`);
    }
    if (items.length === 0) {
      errors.push('No items in invoice');
    }
    return errors;
  }, [discountState, discountApprovalLimit, discountApprovalEnabled]);

  // ── Keyboard handler ──────────────────────────────
  const [activeItemRow, setActiveItemRow] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Tab':
          if (e.shiftKey) {
            e.preventDefault();
            setFocusMode((prev) => (prev === 'left' ? 'right' : 'left'));
          } else {
            e.preventDefault();
            setFocusMode((prev) => (prev === 'left' ? 'right' : 'left'));
          }
          break;
        case 'ArrowDown':
          if (focusMode === 'right') {
            e.preventDefault();
            setActiveItemRow((prev) => Math.min(prev + 1, items.length - 1));
          }
          break;
        case 'ArrowUp':
          if (focusMode === 'right') {
            e.preventDefault();
            setActiveItemRow((prev) => Math.max(prev - 1, 0));
          }
          break;
        case 'Enter':
          if (e.ctrlKey && focusMode === 'right') {
            e.preventDefault();
            setActiveItemRow(0);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowAudit(false);
          break;
      }
    },
    [focusMode, items.length],
  );

  return (
    <div
      className="animate-in fade-in flex h-full flex-col space-y-4 duration-200"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* ═══════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Discount Engine
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Apply invoice & item level discounts with rules and approval
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<History className="h-4 w-4" />}
            onClick={() => setShowAudit(!showAudit)}
          >
            Audit Log
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          INVOICE SUMMARY CARD
      ═══════════════════════════════════════════════════ */}
      <div className="px-6">
        <InvoiceSummaryCard
          customerName={customerName}
          invoiceNumber={invoiceNumber}
          itemCount={items.length}
          grossAmount={initialGross}
          currentDiscount={computed.itemDiscountTotal + computed.invoiceDiscountAmount}
          grandTotal={computed.grandTotal}
        />
      </div>

      {/* ═══════════════════════════════════════════════════
          VALIDATION BANNERS
      ═══════════════════════════════════════════════════ */}
      {validationErrors.length > 0 && (
        <div className="space-y-1 px-6">
          {validationErrors.map((err, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400"
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          MAIN CONTENT: Split Layout
      ═══════════════════════════════════════════════════ */}
      <div className="min-h-0 flex-1 overflow-auto px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Invoice Level Discount */}
          <div
            tabIndex={0}
            onFocus={() => setFocusMode('left')}
            className={cn(
              'rounded-xl transition-all',
              focusMode === 'left' && 'ring-2 ring-emerald-500/20',
            )}
          >
            <InvoiceDiscountPanel
              state={discountState}
              grossTotal={initialGross}
              onStateChange={updateDiscountState}
              discountApprovalLimit={discountApprovalLimit}
              discountApprovalEnabled={discountApprovalEnabled}
            />
          </div>

          {/* RIGHT: Item Level Discount Table */}
          <div
            tabIndex={0}
            onFocus={() => setFocusMode('right')}
            className={cn(
              'rounded-xl transition-all',
              focusMode === 'right' && 'ring-2 ring-emerald-500/20',
            )}
          >
            <ItemDiscountTable
              items={items}
              activeRow={activeItemRow}
              onItemDiscountChange={handleItemDiscountChange}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          LIVE CALCULATION SUMMARY (Sticky Bottom)
      ═══════════════════════════════════════════════════ */}
      <div className="px-6 pb-3">
        <LiveSummary
          grossTotal={initialGross}
          itemDiscountTotal={computed.itemDiscountTotal}
          invoiceDiscountAmount={computed.invoiceDiscountAmount}
          mode={discountState.invoiceDiscountMode}
          roundOff={computed.roundOff}
          taxableAmount={computed.taxableAmount}
          cgstTotal={computed.cgstTotal}
          sgstTotal={computed.sgstTotal}
          igstTotal={computed.igstTotal}
          cessTotal={computed.cessTotal}
          netAmount={computed.netAmount}
          grandTotal={computed.grandTotal}
        />
      </div>

      {/* ═══════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
          <span>Tab ↹ Switch panels</span>
          <span>Esc Close</span>
          <span>Enter Apply</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} icon={<X className="h-4 w-4" />}>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => onComplete(items, discountState)}
            disabled={validationErrors.length > 0 || items.length === 0}
            icon={<Check className="h-4 w-4" />}
          >
            Continue to Review
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          AUDIT LOG MODAL
      ═══════════════════════════════════════════════════ */}
      {showAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Discount Audit Trail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAudit(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-auto p-4">
              {auditLog.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No audit entries yet</p>
              ) : (
                <div className="space-y-2">
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-700/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {entry.field}
                        </span>
                        <span className="text-slate-400">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-500">→ {entry.newValue}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{entry.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
