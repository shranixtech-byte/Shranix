import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
export function RegisterPage() {
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    if (isAuthenticated) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setIsSubmitting(true);
        try {
            await register({ email, password, firstName, lastName });
            navigate('/', { replace: true });
        }
        catch (err) {
            setError(err.message || 'Registration failed');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("div", { className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25", children: _jsx("span", { className: "text-2xl font-bold text-primary-foreground", children: "SK" }) }), _jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Create Account" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Join SHRANIX Krushi ERP" })] }), _jsxs("div", { className: "rounded-xl border bg-card p-8 shadow-lg", children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [error && (_jsx("div", { className: "rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive", children: error })), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "firstName", className: "mb-1.5 block text-sm font-medium", children: "First Name" }), _jsx("input", { id: "firstName", type: "text", required: true, value: firstName, onChange: (e) => setFirstName(e.target.value), className: "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "lastName", className: "mb-1.5 block text-sm font-medium", children: "Last Name" }), _jsx("input", { id: "lastName", type: "text", required: true, value: lastName, onChange: (e) => setLastName(e.target.value), className: "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "mb-1.5 block text-sm font-medium", children: "Email Address" }), _jsx("input", { id: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com", className: "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "mb-1.5 block text-sm font-medium", children: "Password" }), _jsx("input", { id: "password", type: "password", autoComplete: "new-password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirmPassword", className: "mb-1.5 block text-sm font-medium", children: "Confirm Password" }), _jsx("input", { id: "confirmPassword", type: "password", autoComplete: "new-password", required: true, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" })] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50", children: isSubmitting ? 'Creating account...' : 'Create Account' })] }), _jsxs("div", { className: "mt-6 text-center text-sm text-muted-foreground", children: ["Already have an account?", ' ', _jsx(Link, { to: "/auth/login", className: "font-medium text-primary hover:text-primary/80 hover:underline", children: "Sign in" })] })] })] }) }));
}
//# sourceMappingURL=register.js.map