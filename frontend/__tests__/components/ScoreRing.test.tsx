import { render, screen } from '@testing-library/react';
import { ScoreRing } from '@/components/carriers/ScoreRing';

describe('ScoreRing', () => {
  it('exibe score e cor correta do tier', () => {
    const { container } = render(<ScoreRing score={78} tier="SAFE" />);

    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByLabelText('Score 78')).toBeInTheDocument();

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(1);
    expect(circles[1]?.getAttribute('stroke')).toBe('#16a34a');
  });
});
