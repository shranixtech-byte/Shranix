import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            const res = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to send reset email');
            }
            setSubmitted(true);
        }
        catch (err) {
            setError(err.message || 'Something went wrong');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (submitted) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4", children: _jsx("div", { className: "w-full max-w-md text-center", children: _jsxs("div", { className: "rounded-xl border bg-card p-8 shadow-lg", children: [_jsx("div", { className: "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600", children: _jsx("svg", { className: "h-7 w-7", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h2", { className: "text-xl font-bold", children: "Check your email" }), _jsxs("p", { className: "mt-2 text-sm text-muted-foreground", children: ["If an account with ", _jsx("strong", { children: email }), " exists, we've sent password reset instructions."] }), _jsx(Link, { to: "/auth/login", className: "mt-6 inline-block text-sm font-medium text-primary hover:text-primary/80 hover:underline", children: "Back to login" })] }) }) }));
    }
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Forgot Password" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Enter your email and we'll send you reset instructions" })] }), _jsxs("div", { className: "rounded-xl border bg-card p-8 shadow-lg", children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [error && (_jsx("div", { className: "rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive", children: error })), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "mb-1.5 block text-sm font-medium", children: "Email Address" }), _jsx("input", { id: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com", className: "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" })] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50", children: isSubmitting ? 'Sending...' : 'Send Reset Instructions' })] }), _jsxs("div", { className: "mt-6 text-center text-sm text-muted-foreground", children: ["Remember your password?", ' ', _jsx(Link, { to: "/auth/login", className: "font-medium text-primary hover:text-primary/80 hover:underline", children: "Back to login" })] })] })] }) }));
}
//# sourceMappingURL=forgot-password.js.map