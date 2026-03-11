import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renderiza estilo SAFE corretamente', () => {
    render(<Badge tier="SAFE" />);
    const badge = screen.getByText('SAFE');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('renderiza estilo RISK corretamente', () => {
    render(<Badge tier="RISK" />);
    const badge = screen.getByText('RISK');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-800');
  });
});
