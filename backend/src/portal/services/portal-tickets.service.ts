import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { assertOwned } from '../portal-isolation.helper';

@Injectable()
export class PortalTicketsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Auto ticket number TK-000001 — scan + retry on race. */
  private async nextTicketNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await this.database.portalTickets
          .findAll({ page: 1, pageSize: 5000, filters: [] } as any)
          .catch(() => ({ data: [] }));
        let max = 0;
        for (const t of res.data || []) {
          const m = /TK-(\d+)/.exec(String(t.ticketNumber || ''));
          if (m) {
            max = Math.max(max, Number(m[1]));
          }
        }
        const number = `TK-${String(max + 1).padStart(6, '0')}`;
        return number;
      } catch {
        /* retry */
      }
    }
    return `TK-${Date.now()}`;
  }

  async createTicket(customerId: string, portalUserId: string, data: any) {
    if (!data.subject || !String(data.subject).trim()) {
      throw new BadRequestException('Subject is required');
    }
    const portalUser = await this.database.portalUsers.findById(portalUserId).catch(() => null);
    const ticketNumber = await this.nextTicketNumber();
    const ticket = await this.database.portalTickets.create({
      ticketNumber,
      customerId,
      portalUserId,
      contactName: data.contactName || portalUser?.name || null,
      contactMobile: data.contactMobile || portalUser?.mobile || null,
      contactEmail: data.contactEmail || portalUser?.email || null,
      subject: String(data.subject).trim(),
      category: data.category || 'general',
      priority: data.priority || 'normal',
      description: data.description || null,
      attachment: data.attachment ? JSON.stringify(data.attachment) : null,
      status: 'open',
    } as any);
    await this.audit
      .log({
        userId: portalUserId,
        event: 'portal.ticket_created',
        resource: 'portal',
        action: 'create',
        details: { ticketId: ticket.id, ticketNumber },
      })
      .catch(() => {});
    return ticket;
  }

  async listTickets(customerId: string) {
    const res = await this.database.portalTickets
      .findAll({
        page: 1,
        pageSize: 200,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])
      .filter((t: any) => !t.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastMessageAt: t.updatedAt,
      }));
  }

  async getTicket(customerId: string, ticketId: string) {
    const ticket = await this.database.portalTickets.findById(ticketId).catch(() => null);
    assertOwned(ticket, customerId);
    const messagesRes = await this.database.portalTicketMessages
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'ticketId', operator: 'eq', value: ticket.id }],
      } as any)
      .catch(() => ({ data: [] }));
    const messages = (messagesRes.data || [])
      .filter((m: any) => !m.isDeleted && !m.isInternal) // internal notes never shown to customer
      .sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((m: any) => ({
        id: m.id,
        message: m.message,
        isCustomer: !!m.portalUserId,
        attachment: m.attachment ? safeParse(m.attachment) : null,
        createdAt: m.createdAt,
      }));
    return {
      ...ticket,
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      contactName: ticket.contactName,
      contactMobile: ticket.contactMobile,
      contactEmail: ticket.contactEmail,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.createdAt,
      messages,
    };
  }

  /** Customer sends a message on their ticket. */
  async reply(
    customerId: string,
    portalUserId: string,
    ticketId: string,
    message: string,
    attachment?: any,
  ) {
    const ticket = await this.database.portalTickets.findById(ticketId).catch(() => null);
    assertOwned(ticket, customerId);
    if (!message || !String(message).trim()) {
      throw new BadRequestException('Message is required');
    }
    const msg = await this.database.portalTicketMessages.create({
      ticketId: ticket.id,
      portalUserId,
      internalUserId: null,
      message: String(message).trim(),
      isInternal: false,
      attachment: attachment ? JSON.stringify(attachment) : null,
    } as any);
    // Reopen if waiting on customer
    const nextStatus = ticket.status === 'waiting_customer' ? 'in_progress' : ticket.status;
    await this.database.portalTickets.update(ticket.id, { status: nextStatus } as any);
    await this.audit
      .log({
        userId: portalUserId,
        event: 'portal.ticket_replied',
        resource: 'portal',
        action: 'reply',
        details: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
      })
      .catch(() => {});
    return msg;
  }

  // ── Internal (ERP user) side ────────────────────────────
  async internalListTickets(status?: string, assignedTo?: string) {
    const filters: any[] = [];
    if (status) {
      filters.push({ field: 'status', operator: 'eq', value: status });
    }
    if (assignedTo) {
      filters.push({ field: 'assignedTo', operator: 'eq', value: assignedTo });
    }
    const res = await this.database.portalTickets
      .findAll({ page: 1, pageSize: 200, ...(filters.length ? { filters } : {}) } as any)
      .catch(() => ({ data: [] }));
    return (res.data || []).filter((t: any) => !t.isDeleted);
  }

  async internalGetTicket(ticketId: string) {
    const ticket = await this.database.portalTickets.findById(ticketId).catch(() => null);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    const messagesRes = await this.database.portalTicketMessages
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'ticketId', operator: 'eq', value: ticket.id }],
      } as any)
      .catch(() => ({ data: [] }));
    const customer = await this.database.customers.findById(ticket.customerId).catch(() => null);
    return {
      ...ticket,
      customer: customer
        ? {
            id: customer.id,
            customerCode: customer.customerCode,
            name: customer.name,
            firmName: customer.firmName,
            mobile: customer.mobile,
          }
        : null,
      messages: (messagesRes.data || [])
        .sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .map((m: any) => ({
          id: m.id,
          message: m.message,
          isInternal: !!m.isInternal,
          isCustomer: !!m.portalUserId,
          attachment: m.attachment ? safeParse(m.attachment) : null,
          createdAt: m.createdAt,
        })),
    };
  }

  async internalReply(
    ticketId: string,
    internalUserId: string,
    message: string,
    isInternal = false,
    attachment?: any,
  ) {
    const ticket = await this.database.portalTickets.findById(ticketId).catch(() => null);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    if (!message || !String(message).trim()) {
      throw new BadRequestException('Message is required');
    }
    const msg = await this.database.portalTicketMessages.create({
      ticketId: ticket.id,
      portalUserId: null,
      internalUserId,
      message: String(message).trim(),
      isInternal: !!isInternal,
      attachment: attachment ? JSON.stringify(attachment) : null,
    } as any);
    await this.audit
      .log({
        userId: internalUserId,
        event: 'portal.ticket_replied_internal',
        resource: 'portal',
        action: 'reply',
        details: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, isInternal },
      })
      .catch(() => {});
    return msg;
  }

  async internalUpdateStatus(ticketId: string, internalUserId: string, status: string) {
    const allowed = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    const ticket = await this.database.portalTickets.findById(ticketId).catch(() => null);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    const patch: any = { status };
    if (status === 'resolved') {
      patch.resolvedAt = new Date().toISOString();
    }
    if (status === 'closed') {
      patch.closedAt = new Date().toISOString();
    }
    await this.database.portalTickets.update(ticket.id, patch as any);
    await this.audit
      .log({
        userId: internalUserId,
        event: 'portal.ticket_status',
        resource: 'portal',
        action: 'update',
        details: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, status },
      })
      .catch(() => {});
    return { ok: true, status };
  }

  /** Admin dashboard counts. */
  async dashboard() {
    const all = await this.internalListTickets();
    const counts: Record<string, number> = {};
    for (const t of all) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return {
      total: all.length,
      open: counts.open || 0,
      inProgress: counts.in_progress || 0,
      waitingCustomer: counts.waiting_customer || 0,
      resolved: counts.resolved || 0,
      closed: counts.closed || 0,
      byPriority: {
        low: all.filter((t: any) => t.priority === 'low').length,
        normal: all.filter((t: any) => t.priority === 'normal').length,
        high: all.filter((t: any) => t.priority === 'high').length,
        urgent: all.filter((t: any) => t.priority === 'urgent').length,
      },
    };
  }
}

function safeParse(json: string): any {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}
