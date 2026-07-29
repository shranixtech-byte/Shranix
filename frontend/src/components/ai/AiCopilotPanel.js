import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot, Send, X, ThumbsUp, ThumbsDown, Loader2, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
const SUGGESTED_PROMPTS = [
    { label: 'Today\'s Sales', prompt: 'Show today\'s sales summary' },
    { label: 'Pending Approvals', prompt: 'Show my pending approvals' },
    { label: 'Low Stock', prompt: 'List low stock products' },
    { label: 'GST Payable', prompt: 'How much GST is payable this month?' },
    { label: 'Revenue Growth', prompt: 'What is the revenue growth trend?' },
    { label: 'Inventory Aging', prompt: 'Show aging inventory items' },
];
export const AiCopilotPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I\'m your ERP AI Copilot. Ask me anything about your business — sales, purchases, inventory, finance, GST, or workflows.',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const handleSend = async (text) => {
        if (!text.trim() || isLoading) {
            return;
        }
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/copilot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text.trim(),
                    history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to get response');
            }
            const data = await response.json();
            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'I\'m sorry, I couldn\'t process that request.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        }
        catch {
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'I encountered an error processing your request. Please try again.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(input);
        }
    };
    if (!isOpen) {
        return (_jsxs("button", { onClick: () => setIsOpen(true), className: "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl", children: [_jsx(Bot, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm font-medium", children: "AI Copilot" }), _jsx(Sparkles, { className: "h-3.5 w-3.5 text-yellow-300" })] }));
    }
    return (_jsxs("div", { className: "fixed bottom-6 right-6 z-50 flex h-[600px] w-[420px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900", children: [_jsxs("div", { className: "flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white dark:border-gray-700", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bot, { className: "h-5 w-5" }), _jsx("span", { className: "font-semibold", children: "ERP AI Copilot" })] }), _jsx("button", { onClick: () => setIsOpen(false), className: "rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [messages.map((msg) => (_jsx("div", { className: `mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`, children: [_jsx("p", { className: "text-sm whitespace-pre-wrap", children: msg.content }), _jsxs("div", { className: "mt-1 flex items-center justify-end gap-2", children: [_jsx("span", { className: "text-[10px] opacity-60", children: msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }), msg.role === 'assistant' && msg.id !== 'welcome' && (_jsxs("div", { className: "flex gap-1", children: [_jsx("button", { className: "rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300", children: _jsx(ThumbsUp, { className: "h-3 w-3" }) }), _jsx("button", { className: "rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300", children: _jsx(ThumbsDown, { className: "h-3 w-3" }) })] }))] })] }) }, msg.id))), isLoading && (_jsx("div", { className: "flex justify-start", children: _jsxs("div", { className: "flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2.5 dark:bg-gray-800", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin text-blue-600" }), _jsx("span", { className: "text-sm text-gray-500", children: "Thinking..." })] }) })), _jsx("div", { ref: messagesEndRef })] }), messages.length <= 2 && (_jsxs("div", { className: "border-t border-gray-100 px-4 py-2 dark:border-gray-700", children: [_jsx("p", { className: "mb-2 text-xs font-medium text-gray-500", children: "Try asking:" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: SUGGESTED_PROMPTS.map((item) => (_jsx("button", { onClick: () => handleSend(item.prompt), className: "rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/30", children: item.label }, item.label))) })] })), _jsx("div", { className: "border-t border-gray-200 p-4 dark:border-gray-700", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, placeholder: "Ask anything about your ERP data...", className: "flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400", disabled: isLoading }), _jsx("button", { onClick: () => handleSend(input), disabled: !input.trim() || isLoading, className: "rounded-xl bg-blue-600 p-2.5 text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed", children: _jsx(Send, { className: "h-4 w-4" }) })] }) })] }));
};
//# sourceMappingURL=AiCopilotPanel.js.map