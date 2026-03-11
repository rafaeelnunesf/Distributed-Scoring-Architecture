'use client';

import { Input } from '@/components/ui/Input';
import { toNumberOrUndefined } from '@/lib/utils';
import type { CarrierFilters as CarrierFilterValues } from '@/types';

interface CarrierFiltersProps {
  value: CarrierFilterValues;
  onChange: (value: CarrierFilterValues) => void;
}

export function CarrierFilters({ value, onChange }: CarrierFiltersProps): JSX.Element {
  const search = value.search ?? '';
  const minScore = value.min_score?.toString() ?? '';
  const maxScore = value.max_score?.toString() ?? '';
  const authorityStatus = value.authority_status ?? '';

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-4">
      <Input
        id="carrier-search"
        label="Buscar"
        placeholder="Nome ou DOT"
        value={search}
        onChange={(event) => onChange({ ...value, search: event.target.value || undefined })}
      />
      <Input
        id="carrier-min-score"
        label="Score minimo"
        type="number"
        value={minScore}
        onChange={(event) => onChange({ ...value, min_score: toNumberOrUndefined(event.target.value) })}
      />
      <Input
        id="carrier-max-score"
        label="Score maximo"
        type="number"
        value={maxScore}
        onChange={(event) => onChange({ ...value, max_score: toNumberOrUndefined(event.target.value) })}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="authority-status" className="text-sm font-medium text-gray-800">
          Authority
        </label>
        <select
          id="authority-status"
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          value={authorityStatus}
          onChange={(event) => onChange({ ...value, authority_status: event.target.value || undefined })}
        >
          <option value="">Todos</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>
    </div>
  );
}
