import { fireEvent, render, screen } from '@testing-library/react';
import { CarrierFilters } from '@/components/carriers/CarrierFilters';
import type { CarrierFilters as CarrierFiltersType } from '@/types';

describe('CarrierFilters', () => {
  it('dispara callback ao alterar filtros', () => {
    const onChange = vi.fn();
    const value: CarrierFiltersType = { limit: 10 };

    render(<CarrierFilters value={value} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'Atlas' } });
    expect(onChange).toHaveBeenCalledWith({ limit: 10, search: 'Atlas' });

    fireEvent.change(screen.getByLabelText('Score minimo'), { target: { value: '20' } });
    expect(onChange).toHaveBeenCalledWith({ limit: 10, min_score: 20 });

    fireEvent.change(screen.getByLabelText('Authority'), { target: { value: 'ACTIVE' } });
    expect(onChange).toHaveBeenCalledWith({ limit: 10, authority_status: 'ACTIVE' });
  });
});
