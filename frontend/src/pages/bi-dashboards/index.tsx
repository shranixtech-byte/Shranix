// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Purchase Analytics
// ═══════════════════════════════════════════════════════════════════
export function PurchaseAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Purchase Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Comprehensive purchase performance and trend analysis</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total POs', value: '—', color: 'border-l-blue-500' },
          { label: 'Total Spend', value: '₹—', color: 'border-l-green-500' },
          { label: 'Avg PO Value', value: '₹—', color: 'border-l-purple-500' },
          { label: 'Pending Deliveries', value: '—', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Monthly Purchase Trend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Monthly purchase order value trend</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Top Suppliers by Spend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Top 10 suppliers by total spend</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Category Distribution</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Purchase by category</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">PO Status Overview</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — PO status breakdown (draft, approved, received, cancelled)</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Sales Analytics
// ═══════════════════════════════════════════════════════════════════
export function SalesAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time sales performance metrics and revenue analysis</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Revenue', value: '₹—', color: 'border-l-green-500' },
          { label: 'Total Orders', value: '—', color: 'border-l-blue-500' },
          { label: 'Avg Order Value', value: '₹—', color: 'border-l-purple-500' },
          { label: 'Pending Invoices', value: '—', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Revenue Trend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Monthly revenue trend line</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Top Customers</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Top 10 customers by revenue</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Product Performance</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Top-selling products</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Sales by Category</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Revenue by product category</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Inventory Analytics
// ═══════════════════════════════════════════════════════════════════
export function InventoryAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stock movement, valuation, and turnover analysis</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Items', value: '—', color: 'border-l-blue-500' },
          { label: 'Stock Value', value: '₹—', color: 'border-l-green-500' },
          { label: 'Low Stock Items', value: '—', color: 'border-l-red-500' },
          { label: 'Dead Stock', value: '—', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Stock Movement</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Inward/outward stock movement over time</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Inventory Turnover</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Category-wise inventory turnover ratio</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Stock Aging</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Aging analysis of current stock</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Warehouse Distribution</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Stock distribution across warehouses</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Finance Analytics
// ═══════════════════════════════════════════════════════════════════
export function FinanceAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profitability, cash flow, and financial performance metrics</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Revenue', value: '₹—', color: 'border-l-green-500' },
          { label: 'Expenses', value: '₹—', color: 'border-l-red-500' },
          { label: 'Net Profit', value: '₹—', color: 'border-l-blue-500' },
          { label: 'Profit Margin', value: '—%', color: 'border-l-purple-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Income vs Expenses</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Monthly income vs expense comparison</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Cash Flow</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Operating, investing, financing cash flow</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Expense Breakdown</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Expense by category</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Profit Trend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Gross vs net profit trend</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — GST Analytics
// ═══════════════════════════════════════════════════════════════════
export function GstAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GST Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tax liability, input credit, and GST filing overview</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Output GST', value: '₹—', color: 'border-l-red-500' },
          { label: 'Input Credit', value: '₹—', color: 'border-l-green-500' },
          { label: 'Net Payable', value: '₹—', color: 'border-l-blue-500' },
          { label: 'Pending Returns', value: '—', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">GST Liability Trend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Monthly GST payable trend</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">ITC vs Output</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Input tax credit vs output tax comparison</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">GST Rate Distribution</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Taxable value by GST rate slab</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Filing Status</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — GST return filing status overview</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Customer Analytics
// ═══════════════════════════════════════════════════════════════════
export function CustomerAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customer segmentation, behavior, and revenue analysis</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Customers', value: '—', color: 'border-l-blue-500' },
          { label: 'Active Customers', value: '—', color: 'border-l-green-500' },
          { label: 'Avg Revenue/Customer', value: '₹—', color: 'border-l-purple-500' },
          { label: 'Repeat Rate', value: '—%', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Customer Distribution</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Customers by region/category</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Revenue by Customer</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Top customers by revenue contribution</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Supplier Analytics
// ═══════════════════════════════════════════════════════════════════
export function SupplierAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supplier Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Supplier performance, spending, and reliability metrics</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Suppliers', value: '—', color: 'border-l-blue-500' },
          { label: 'Active Suppliers', value: '—', color: 'border-l-green-500' },
          { label: 'Total Spend', value: '₹—', color: 'border-l-purple-500' },
          { label: 'Avg Delivery Days', value: '—', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Spend by Supplier</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Top suppliers by spend</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Supplier Performance</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — On-time delivery rate by supplier</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Warehouse Analytics
// ═══════════════════════════════════════════════════════════════════
export function WarehouseAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Warehouse Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Warehouse capacity, utilization, and efficiency metrics</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Warehouses', value: '—', color: 'border-l-blue-500' },
          { label: 'Total Capacity', value: '—', color: 'border-l-green-500' },
          { label: 'Utilization', value: '—%', color: 'border-l-purple-500' },
          { label: 'Items in Stock', value: '—', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Warehouse Utilization</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Capacity utilization by warehouse</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Stock Distribution</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Stock value distribution across warehouses</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROFITABILITY ANALYTICS
// ═══════════════════════════════════════════════════════════════════
export function ProfitabilityAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profitability Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gross profit, net profit, margin analysis across dimensions</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Gross Profit', value: '₹—', color: 'border-l-green-500' },
          { label: 'Net Profit', value: '₹—', color: 'border-l-blue-500' },
          { label: 'Gross Margin', value: '—%', color: 'border-l-purple-500' },
          { label: 'Net Margin', value: '—%', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Margin Trend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Gross and net margin trend over time</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Profit by Product</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Profit contribution by product category</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CASH FLOW ANALYTICS
// ═══════════════════════════════════════════════════════════════════
export function CashFlowAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cash Flow Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cash inflow/outflow analysis and liquidity forecasting</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Operating Cash Flow', value: '₹—', color: 'border-l-green-500' },
          { label: 'Investing Cash Flow', value: '₹—', color: 'border-l-blue-500' },
          { label: 'Financing Cash Flow', value: '₹—', color: 'border-l-purple-500' },
          { label: 'Net Cash Flow', value: '₹—', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Cash Flow Trend</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Monthly cash flow trend (inflow vs outflow)</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Cash Position</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Opening vs closing cash balance over time</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GROWTH ANALYTICS
// ═══════════════════════════════════════════════════════════════════
export function GrowthAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Growth Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Year-over-year growth, trends, and business expansion metrics</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Revenue Growth', value: '—%', color: 'border-l-green-500' },
          { label: 'Order Growth', value: '—%', color: 'border-l-blue-500' },
          { label: 'Customer Growth', value: '—%', color: 'border-l-purple-500' },
          { label: 'Market Share', value: '—%', color: 'border-l-yellow-500' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`}>
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">YoY Revenue Growth</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Year-over-year revenue comparison</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Growth Drivers</h2>
          <div className="flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">Chart — Growth contribution by product line</div>
        </div>
      </div>
    </div>
  );
}
