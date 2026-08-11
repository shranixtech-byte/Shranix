import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { portalService } from '@/services/portal.service';

import {
  Card,
  DataTable,
  fmtDate,
  fmtINR,
  PageHeader,
  PortalEmpty,
  PortalLoading,
  StatusBadge,
} from './common';

export function PortalOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService
      .getOrders()
      .then((res: any) => setItems(res || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PortalLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Orders" subtitle="Track your orders" />
      {items.length === 0 ? (
        <PortalEmpty title="No orders yet" />
      ) : (
        <Card>
          <DataTable headers={['Order', 'Date', 'Delivery', 'Total', 'Status', '']}>
            {items.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  {o.orderNumber}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {fmtDate(o.orderDate)}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {fmtDate(o.deliveryDate)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                  {fmtINR(o.grandTotal)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/portal/orders/${o.id}`}
                    className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
    </div>
  );
}

export function PortalOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    portalService
      .getOrder(id)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id]);

  const download = async () => {
    try {
      await portalService.downloadDocument('order', id!, `order-${order.orderNumber}.pdf`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!order) {
    return <PortalLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`${fmtDate(order.orderDate)} · Delivery ${fmtDate(order.deliveryDate)}`}
        actions={
          <button
            onClick={download}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            Download PDF
          </button>
        }
      />
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
        <StatusBadge status={order.status} />
        <span className="text-sm text-slate-500 dark:text-slate-400">Payment:</span>
        <StatusBadge status={order.paymentStatus || 'unpaid'} />
      </div>
      <Card>
        <DataTable headers={['Item', 'Qty', 'Rate', 'Total']}>
          {(order.items || []).map((i: any) => (
            <tr key={i.id}>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                {i.description || i.itemId}
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{i.quantity}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtINR(i.rate)}</td>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                {fmtINR(i.totalAmount)}
              </td>
            </tr>
          ))}
        </DataTable>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="space-y-1 text-right text-sm">
            <p className="text-slate-500 dark:text-slate-400">Subtotal: {fmtINR(order.subTotal)}</p>
            <p className="text-slate-500 dark:text-slate-400">Tax: {fmtINR(order.taxAmount)}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Total: {fmtINR(order.grandTotal)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
