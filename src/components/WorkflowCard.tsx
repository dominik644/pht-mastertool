import { ArrowLeft, ArrowRight, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNextStatus, getPreviousStatus } from '../services/workflow';
import type { PipelineStatus, Tender } from '../types/tender';
import { Badge } from './ui/Badge';

interface WorkflowCardProps {
  tender: Tender;
  onMove: (id: string, status: PipelineStatus) => void;
}

export function WorkflowCard({ tender, onMove }: WorkflowCardProps) {
  const prev = getPreviousStatus(tender.status);
  const next = getNextStatus(tender.status);

  return (
    <div className="bg-dark-600/50 rounded-lg border border-dark-500/50 p-3 hover:border-pht-500/30 transition-shadow">
      <Link to={`/tenders/${tender.id}`} className="block">
        <h4 className="text-sm font-medium text-white line-clamp-2 hover:text-pht-400">{tender.title}</h4>
      </Link>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="score">{tender.score}</Badge>
        <span className="text-xs text-slate-500">{tender.revenuePotential}</span>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{tender.deadline}</span>
        {tender.responsible && <span className="flex items-center gap-1 truncate"><User className="w-3 h-3" />{tender.responsible}</span>}
      </div>
      {tender.nextAction && <p className="mt-2 text-xs text-slate-500 bg-dark-700/50 rounded px-2 py-1 line-clamp-2">{tender.nextAction}</p>}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-dark-500/50">
        {prev ? <button onClick={() => onMove(tender.id, prev)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-pht-400"><ArrowLeft className="w-3 h-3" />Zurück</button> : <span />}
        {tender.status === 'Abgegeben' ? (
          <div className="flex gap-1">
            <button onClick={() => onMove(tender.id, 'Gewonnen')} className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Gewonnen</button>
            <button onClick={() => onMove(tender.id, 'Verloren')} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">Verloren</button>
          </div>
        ) : next ? (
          <button onClick={() => onMove(tender.id, next)} className="flex items-center gap-1 text-xs text-pht-400 hover:text-pht-300 font-medium">Weiter<ArrowRight className="w-3 h-3" /></button>
        ) : null}
      </div>
    </div>
  );
}
