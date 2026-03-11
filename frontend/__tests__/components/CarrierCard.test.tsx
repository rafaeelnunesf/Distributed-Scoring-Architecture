import { render, screen } from '@testing-library/react';
import { CarrierCard } from '@/components/carriers/CarrierCard';
import type { Carrier } from '@/types';

const carrier: Carrier = {
  _id: 'carrier-1',
  dot_number: '12345',
  legal_name: 'Test Carrier',
  total_score: 88,
  tier: 'SAFE',
  breakdown: {
    safety_rating: 20,
    oos_pct: 18,
    crash_total: 16,
    driver_oos: 12,
    insurance: 10,
    authority: 10,
  },
  content_hash: 'hash_abc123',
  authority_status: 'ACTIVE',
  lastUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

describe('CarrierCard', () => {
  it('exibe nome, score e tier', () => {
    render(<CarrierCard carrier={carrier} />);

    expect(screen.getByText('Test Carrier')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('SAFE')).toBeInTheDocument();
    expect(screen.getByText(/DOT# 12345/)).toBeInTheDocument();
  });
});
