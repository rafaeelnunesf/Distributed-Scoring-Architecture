import { Card } from '@/components/ui/Card';

interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
}

export function StatCard({ label, value, icon }: StatCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{label}</p>
        {icon ? <span aria-hidden className="text-lg">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </Card>
  );
}
