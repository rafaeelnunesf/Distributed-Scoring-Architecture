import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getScoreColor } from '@/lib/constants';
import type { Carrier } from '@/types';

interface CarrierCardProps {
  carrier: Carrier;
}

export function CarrierCard({ carrier }: CarrierCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href={`/carriers/${carrier._id}`} className="text-base font-semibold text-gray-900 hover:text-blue-700">
            {carrier.legal_name}
          </Link>
          <p className="font-mono text-xs text-gray-500">DOT# {carrier.dot_number}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${getScoreColor(carrier.total_score)}`}>{carrier.total_score}</p>
          <Badge tier={carrier.tier} className="mt-1" />
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-600">Authority: {carrier.authority_status}</p>
    </Card>
  );
}
