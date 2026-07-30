
import { Download, FileText, Printer, FileSpreadsheet, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const exportOptions = [
  {
    title: 'Sales Register',
    description: 'Complete sales transaction log with tax details',
    path: '/sales/reports/register',
    icon: FileText,
    formats: ['Excel', 'PDF', 'CSV'],
  },
  {
    title: 'Invoice Register',
    description: 'Searchable invoice register with print options',
    path: '/sales/reports/invoices',
    icon: FileText,
    formats: ['Excel', 'PDF', 'CSV'],
  },
  {
    title: 'Customer Ledger',
    description: 'Customer-wise outstanding and transaction history',
    path: '/sales/reports/customer-ledger',
    icon: FileSpreadsheet,
    formats: ['Excel', 'PDF', 'CSV'],
  },
  {
    title: 'Product Sales',
    description: 'Product-wise sales performance and margins',
    path: '/sales/reports/products',
    icon: FileSpreadsheet,
    formats: ['Excel', 'PDF', 'CSV'],
  },
  {
    title: 'Outstanding Report',
    description: 'Customer outstanding with aging analysis',
    path: '/sales/reports/outstanding',
    icon: FileSpreadsheet,
    formats: ['Excel', 'PDF', 'CSV'],
  },
  {
    title: 'GST Report',
    description: 'GST summary, HSN-wise and rate-wise breakdown',
    path: '/sales/reports/gst',
    icon: FileJson,
    formats: ['Excel', 'PDF', 'CSV', 'GSTR-1'],
  },
  {
    title: 'Payment Report',
    description: 'Mode-wise payment collection and summary',
    path: '/sales/reports/payment',
    icon: FileSpreadsheet,
    formats: ['Excel', 'PDF', 'CSV'],
  },
  {
    title: 'Profit Analysis',
    description: 'Profit margins, top products, and sales trends',
    path: '/sales/reports/profit',
    icon: FileSpreadsheet,
    formats: ['Excel', 'PDF', 'CSV'],
  },
];

export function ExportCenter() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Export any report in Excel, PDF, CSV, or print format
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          return (
            <div
              key={option.title}
              className="rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 cursor-pointer group"
              onClick={() => navigate(option.path)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{option.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {option.formats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open the report page
                      navigate(option.path);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10px] font-medium transition-colors hover:bg-accent"
                  >
                    {fmt === 'Print' ? (
                      <Printer className="h-3 w-3" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Export All */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold">Bulk Export</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Export all reports for the current period in a single operation
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Export All as Excel
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-xs font-medium transition-colors hover:bg-accent">
            <Download className="h-4 w-4" />
            Export All as PDF
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-xs font-medium transition-colors hover:bg-accent">
            <Printer className="h-4 w-4" />
            Print All
          </button>
        </div>
      </div>
    </div>
  );
}
