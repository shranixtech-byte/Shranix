import { ArrowRight, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { globalSearchApi, type GlobalSearchResponse } from '@/services/control.service';

export function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const res = await globalSearchApi.search(q, 5);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => void run(query), 350);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [query, run]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-xl font-bold">Global Search</h1>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Search customers, suppliers, products, invoices, leads, employees, assets and expenses
      </p>

      <div className="relative mt-5">
        <Search className="text-muted-foreground absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code, name, number, mobile, GSTIN, SKU, barcode…"
          className="border-border bg-card placeholder:text-muted-foreground focus:border-primary/50 w-full rounded-xl border py-3 pl-10 pr-4 text-sm shadow-sm outline-none"
        />
        {loading && (
          <Loader2 className="text-primary absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {result && (
        <div className="mt-5">
          <p className="text-muted-foreground mb-3 text-xs">
            {result.total} results for “{result.query}”
          </p>
          <div className="space-y-4">
            {result.results.map((group) => (
              <div key={group.key} className="bg-card rounded-xl border p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold capitalize">{group.label}</h3>
                  <span className="text-muted-foreground text-[11px]">{group.total} found</span>
                </div>
                <ul className="divide-y">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.path}
                        className="hover:bg-muted/30 flex items-center justify-between rounded-lg px-2 py-2 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-muted-foreground text-[11px]">{item.subtitle}</p>
                          )}
                        </div>
                        <ArrowRight className="text-muted-foreground h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {result.results.length === 0 && (
              <p className="text-muted-foreground py-10 text-center text-xs">No matching records</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
