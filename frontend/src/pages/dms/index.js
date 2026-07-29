import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
// ═══════════════════════════════════════════════════════════════════
// DMS DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function DmsDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Document Management" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Enterprise document storage, versioning, OCR, and digital signatures" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'Total Documents', value: '—', icon: '📄', color: 'border-l-blue-500' },
                    { label: 'Folders', value: '—', icon: '📁', color: 'border-l-green-500' },
                    { label: 'Storage Used', value: '— MB', icon: '💾', color: 'border-l-purple-500' },
                    { label: 'Pending OCR', value: '—', icon: '🔍', color: 'border-l-yellow-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("span", { className: "text-2xl", children: c.icon })] }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value })] }, c.label))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Quick Actions" }), _jsx("div", { className: "flex flex-wrap gap-3", children: ['Upload Document', 'Create Folder', 'View All Documents', 'OCR Queue', 'Signature Queue'].map((action) => (_jsx("button", { className: "rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20", children: action }, action))) })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Recent Uploads" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Recent documents will appear here" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Pending Approvals" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Documents awaiting signature will appear here" })] })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// DOCUMENT LIST
// ═══════════════════════════════════════════════════════════════════
export function DocumentListPage() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Documents" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Browse, search, and manage all stored documents" })] }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "+ Upload Document" })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search documents...", className: "rounded-lg border bg-background px-3 py-2 text-sm w-64" }), _jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), className: "rounded-lg border bg-background px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "All Categories" }), _jsx("option", { value: "invoice", children: "Invoice" }), _jsx("option", { value: "purchase_order", children: "Purchase Order" }), _jsx("option", { value: "grn", children: "GRN" }), _jsx("option", { value: "contract", children: "Contract" }), _jsx("option", { value: "report", children: "Report" })] }), _jsxs("select", { value: status, onChange: (e) => setStatus(e.target.value), className: "rounded-lg border bg-background px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "All Status" }), _jsx("option", { value: "draft", children: "Draft" }), _jsx("option", { value: "submitted", children: "Submitted" }), _jsx("option", { value: "approved", children: "Approved" }), _jsx("option", { value: "archived", children: "Archived" })] })] }), _jsxs("div", { className: "rounded-lg border bg-card shadow-sm", children: [_jsxs("div", { className: "grid grid-cols-6 gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground", children: [_jsx("span", { children: "Document #" }), _jsx("span", { children: "Name" }), _jsx("span", { children: "Category" }), _jsx("span", { children: "Version" }), _jsx("span", { children: "Status" }), _jsx("span", { children: "Actions" })] }), _jsx("div", { className: "flex h-64 items-center justify-center text-sm text-muted-foreground", children: "No documents found. Upload your first document to get started." })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// FOLDER TREE
// ═══════════════════════════════════════════════════════════════════
export function DocumentFoldersPage() {
    const folders = [
        { name: 'Invoices', count: 0, path: '/Invoices', level: 0 },
        { name: 'Purchase Orders', count: 0, path: '/Purchase Orders', level: 0 },
        { name: 'Goods Receipts', count: 0, path: '/Goods Receipts', level: 0 },
        { name: 'Contracts', count: 0, path: '/Contracts', level: 0 },
        { name: 'Reports', count: 0, path: '/Reports', level: 0 },
        { name: 'GST Returns', count: 0, path: '/GST Returns', level: 0 },
        { name: 'Financial Statements', count: 0, path: '/Financial Statements', level: 0 },
        { name: 'HR Documents', count: 0, path: '/HR Documents', level: 0 },
    ];
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Document Folders" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Organize documents in folders and subfolders" })] }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "+ New Folder" })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: folders.map((f) => (_jsx("div", { className: "cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDCC1" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: f.name }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [f.count, " documents"] })] })] }) }, f.path))) })] }));
}
// ═══════════════════════════════════════════════════════════════════
// TAG MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
export function DocumentTagsPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Document Tags" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Create and manage tags for document categorization" })] }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "+ New Tag" })] }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground", children: "Tags will appear here. Create your first tag to get started." })] }));
}
// ═══════════════════════════════════════════════════════════════════
// OCR QUEUE
// ═══════════════════════════════════════════════════════════════════
export function OcrQueuePage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "OCR Queue" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Optical character recognition processing queue and results" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'Pending', value: '—', color: 'border-l-yellow-500' },
                    { label: 'Processing', value: '—', color: 'border-l-blue-500' },
                    { label: 'Completed', value: '—', color: 'border-l-green-500' },
                    { label: 'Failed', value: '—', color: 'border-l-red-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value })] }, c.label))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "OCR Queue" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "OCR processing queue will appear here" })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// DIGITAL SIGNATURES
// ═══════════════════════════════════════════════════════════════════
export function DigitalSignaturesPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Digital Signatures" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage digital signatures, verification, and certificate tracking" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'Total Signatures', value: '—', color: 'border-l-blue-500' },
                    { label: 'Verified', value: '—', color: 'border-l-green-500' },
                    { label: 'Pending', value: '—', color: 'border-l-yellow-500' },
                    { label: 'Tampered', value: '—', color: 'border-l-red-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value })] }, c.label))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Signature Request Queue" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Pending signature requests will appear here" })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE & AUDIT
// ═══════════════════════════════════════════════════════════════════
export function DocumentCompliancePage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Compliance & Audit" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Document retention, legal holds, access logs, and compliance tracking" })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Retention Policy" }), _jsx("div", { className: "space-y-3", children: [
                                    { policy: 'Invoices', period: '8 years' },
                                    { policy: 'Purchase Orders', period: '5 years' },
                                    { policy: 'GST Returns', period: '8 years' },
                                    { policy: 'Contracts', period: '10 years' },
                                    { policy: 'Financial Statements', period: '8 years' },
                                ].map((p) => (_jsxs("div", { className: "flex items-center justify-between border-b pb-2", children: [_jsx("span", { className: "text-sm", children: p.policy }), _jsx("span", { className: "text-sm font-medium", children: p.period })] }, p.policy))) })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Access Logs" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Document access and download logs will appear here" })] })] })] }));
}
//# sourceMappingURL=index.js.map