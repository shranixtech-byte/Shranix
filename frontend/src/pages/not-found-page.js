import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export function NotFoundPage() {
    return (_jsxs("div", { className: "flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background", children: [_jsx("h1", { className: "text-6xl font-bold text-primary", children: "404" }), _jsx("h2", { className: "text-xl font-semibold text-foreground", children: "Page Not Found" }), _jsx("p", { className: "max-w-md text-center text-sm text-muted-foreground", children: "The page you are looking for does not exist or has been moved." }), _jsx(Link, { to: "/", className: "mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-dark", children: "Return Home" })] }));
}
//# sourceMappingURL=not-found-page.js.map