import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

import { AuthProvider } from '@/context/AuthContext';
import { DashboardPage } from '@/pages/dashboard';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { ThemeProvider } from '@/providers/theme-provider';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock apiRequest
vi.mock('@/services/api-client', () => ({
  apiRequest: vi.fn().mockResolvedValue({
    kpis: {
      today: { value: 245800, change: 18.6 },
      todayPurchase: { value: 182500, change: 12.4 },
      todayInvoiceCount: 64,
      inventoryValue: 12000000,
      totalProductsCount: 1542,
      totalSuppliersCount: 48,
    },
  }),
}));

function renderDashboard() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PreferencesProvider>
            <DashboardPage />
          </PreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>,
  );
}

describe('DashboardPage — Reference UI Implementation', () => {
  it('renders agricultural Hero Banner with Marathi greeting and company details', () => {
    renderDashboard();

    expect(screen.getByText('SHRANIX KRUSHI ERP')).toBeInTheDocument();
    expect(screen.getByText(/तुमच्या व्यवसायाचा संपूर्ण आढावा एकाच ठिकाणी/i)).toBeInTheDocument();
    expect(screen.getByText('Default Company')).toBeInTheDocument();
    expect(screen.getByText('FY 2025-26')).toBeInTheDocument();
    expect(screen.getByText('Pune, Maharashtra')).toBeInTheDocument();
  });

  it('renders all 6 horizontal KPI cards matching reference image', () => {
    renderDashboard();

    expect(screen.getByText('आजची विक्री')).toBeInTheDocument();
    expect(screen.getByText('आजची खरेदी')).toBeInTheDocument();
    expect(screen.getByText('आजची देयके (Invoices)')).toBeInTheDocument();
    expect(screen.getByText('एकूण ग्राहक')).toBeInTheDocument();
    expect(screen.getAllByText('एकूण उत्पादने').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('एकूण स्टॉक मूल्य')).toBeInTheDocument();
  });

  it('renders Main Analytics Row (Sales Overview, Purchase Overview, Stock Status)', () => {
    renderDashboard();

    expect(screen.getByText(/विक्री आढावा/i)).toBeInTheDocument();
    expect(screen.getByText(/खरेदी आढावा/i)).toBeInTheDocument();
    expect(screen.getByText(/स्टॉक स्थिती/i)).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('renders Expiry Alerts, Recent Transactions, and Top Products', () => {
    renderDashboard();

    expect(screen.getByText(/Expiry Alerts/i)).toBeInTheDocument();
    expect(screen.getByText('0–7 दिवस')).toBeInTheDocument();
    expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Products|Top Selling Products/i)).toBeInTheDocument();
  });

  it('renders Bottom Summary cards and Shortcuts', () => {
    renderDashboard();

    expect(screen.getByText('पेंडिंग ऑर्डर्स')).toBeInTheDocument();
    expect(screen.getByText('पेंडिंग इन्व्हॉइसेस')).toBeInTheDocument();
    expect(screen.getByText('थकबाकी रक्कम')).toBeInTheDocument();
    expect(screen.getByText('कॅश इन हँड')).toBeInTheDocument();
    expect(screen.getByText(/शॉर्टकट्स/i)).toBeInTheDocument();
    expect(screen.getByText('नवीन विक्री')).toBeInTheDocument();
    expect(screen.getByText('नवीन खरेदी')).toBeInTheDocument();
  });
});
