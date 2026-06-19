import { ExternalLink, GitBranch } from 'lucide-react';
import type { NewsLead } from '../types/newsLead';
import {
  buildNewsLeadKeyPoints,
  newsLeadDescriptionExcerpt,
  stripLeadHtml,
} from '../lib/newsLeadPresentation';
import { TranslatedText } from './TranslatedText';
import { Badge } from './ui/Badge';

export interface NewsLeadCardProps {
  lead: NewsLead;
  onAddToPipeline?: (lead: NewsLead) => void;
  compact?: boolean;
}

export function NewsLeadCard({ lead, onAddToPipeline, compact = false }: NewsLeadCardProps) {
  const keyPoints = buildNewsLeadKeyPoints(lead);
  const excerpt = newsLeadDescriptionExcerpt(lead);
  const showExcerpt = keyPoints.length < 2 && excerpt;
  const cleanTitle = stripLeadHtml(lead.title);

  return (
    <div
      className={`rounded-lg border border-dark-500/40 hover:border-amber-500/30 transition-colors ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="warning">Frühindikator</Badge>
            {lead.isMegaExpansion && <Badge variant="info">Mega-Expansion</Badge>}
            {lead.relevanceScore >= 40 && <Badge variant="score">{lead.relevanceScore}</Badge>}
            {lead.tenderLikelihood != null && (
              <Badge variant="info">{lead.tenderLikelihood}% Ausschreibung</Badge>
            )}
            {lead.phtFitProb != null && lead.phtFitProb >= 40 && (
              <Badge variant="muted">{lead.phtFitProb}% PHT-Fit</Badge>
            )}
            {lead.projectType && <Badge variant="muted">{lead.projectType}</Badge>}
          </div>

          <p className={`font-medium text-white ${compact ? 'text-xs' : 'text-sm'}`}>
            <TranslatedText text={cleanTitle} as="span" showBadge />
          </p>

          {keyPoints.length > 0 && (
            <ul className={`mt-2 space-y-0.5 list-disc pl-4 text-amber-200/80 ${compact ? 'text-[11px]' : 'text-xs'}`}>
              {keyPoints.map((point, i) => (
                <li key={i}>
                  <TranslatedText text={point} as="span" />
                </li>
              ))}
            </ul>
          )}

          {showExcerpt && (
            <p className={`text-slate-500 mt-1.5 line-clamp-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
              <TranslatedText text={excerpt} as="span" />
            </p>
          )}

          <p className={`text-slate-600 mt-1.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {lead.sourceName}
            {lead.publishedAt && (
              <> · {new Date(lead.publishedAt).toLocaleDateString('de-DE')}</>
            )}
          </p>

          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-pht-400 hover:text-pht-300 mt-2 ${
              compact ? 'text-[11px]' : 'text-xs'
            }`}
          >
            <ExternalLink className="w-3 h-3" />
            Beitrag öffnen
          </a>
        </div>

        {onAddToPipeline && (
          <button
            type="button"
            onClick={() => onAddToPipeline(lead)}
            className="p-2 rounded-lg border border-pht-500/30 text-pht-400 hover:bg-pht-600/10 shrink-0"
            title="Zur Vertriebs-Pipeline"
          >
            <GitBranch className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
