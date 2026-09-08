import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../ui/Card';

export function SnapaddySettings() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-pht-300" />
          Snapaddy Visitenkarten
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Inbox:{' '}
          <Link to="/snapaddy" className="text-pht-400 hover:text-pht-300">Snapaddy</Link>
          {' · '}
          <Link to="/priorities" className="text-pht-400 hover:text-pht-300">Tourenplanung</Link>
        </p>
      </CardHeader>
    </Card>
  );
}
