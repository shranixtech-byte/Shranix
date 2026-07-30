import { useCallback } from 'react';
import { Calendar, Search, X } from 'lucide-react';

export interface FilterValues {
  period: string;
  startDate: string;
  endDate: string;
  search: string;
  customerId: string;
  productId: string;
  salesPerson: string;
  invoiceStatus: string;
}

interface ReportFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  showSearch?: boolean;
  showCustomer?: boolean;
  showProduct?: boolean;
  showSalesPerson?: boolean;
  showStatus?: boolean;
}

const periodOptions = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_fy', label: 'Financial Year' },
  { value: 'custom', label: 'Custom' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ReportFilters({
  values,
  onChange,
  showSearch = true,
  showStatus = false,
}: ReportFiltersProps) {
  const handleChange = useCallback(
    (key: keyof FilterValues, value: string) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange],
  );

  const clearFilters = useCallback(() => {
    onChange({
      period: 'this_month',
      startDate: '',
      endDate: '',
      search: '',
      customerId: '',
      productId: '',
      salesPerson: '',
      invoiceStatus: '',
    });
  }, [onChange]);

  const hasFilters =
    values.search ||
    values.customerId ||
    values.productId ||
    values.salesPerson ||
    values.invoiceStatus ||
    values.period !== 'this_month';

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Select */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={values.period}
            onChange={(e) => handleChange('period', e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Range */}
        {values.period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={values.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={values.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}

        {/* Search */}
        {showSearch && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoices, customers..."
              value={values.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="w-full rounded-md border bg-background pl-10 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}

        {/* Status Filter */}
        {showStatus && (
          <select
            value={values.invoiceStatus}
            onChange={(e) => handleChange('invoiceStatus', e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Active Filters Badge & Clear */}
      {hasFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {values.search && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Search: {values.search}
              <button onClick={() => handleChange('search', '')} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
