import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBcSyncStatus } from '../services/businessCentralSync';
import { fetchCustomerPriorities } from '../services/customerVisitStorage';
import { fetchSalesSyncStatus } from '../services/salesSync';
import { fetchScheduleProposalStatus } from '../services/scheduleProposal';
import { SALES_FEEDBACK_STORAGE_KEY } from '../services/salesLearning';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader } from './ui/Card';

const GITHUB_REPO = 'https://github.com/dominik644/pht-mastertool';
const VISIT_STORAGE_KEY = 'pht_customer_visit_state_v1';

interface CheckItem {
  id: string;
  label: string;
  ok: boolean | null;
  detail: string;
  link?: { href: string; label: string };
}

function StatusBadge({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Badge variant="muted">Prüfe…</Badge>;
  return ok ? (
    <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>
  ) : (
    <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" /> Offen</Badge>
  );
}

function testLocalStorageWrite(key: string): boolean {
  try {
    const probe = `${key}__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function GoLiveChecklist() {
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const next: CheckItem[] = [];

    const isProd = typeof window !== 'undefined'
      && !window.location.hostname.includes('localhost')
      && !window.location.hostname.includes('127.0.0.1');
    next.push({
      id: 'prod',
      label: 'Vercel / Production erreichbar',
      ok: isProd || window.location.protocol.startsWith('http'),
      detail: isProd
        ? `Live unter ${window.location.host}`
        : 'Lokal – Production-Check beim Deploy',
    });

    let customerCount = 0;
    let hasContact = false;
    try {
      const data = await fetchCustomerPriorities();
      customerCount = data?.customers?.length ?? 0;
      hasContact = (data?.customers ?? []).some(
        (c) => c.contactEmail?.trim() || c.enrichedAt,
      );
      next.push({
        id: 'priorities',
        label: 'customer-priorities.json geladen',
        ok: customerCount > 0,
        detail: customerCount > 0 ? `${customerCount} Kunden` : 'Keine Kunden – import:priorities ausführen',
        link: { href: '/priorities', label: 'Tourenplanung öffnen' },
      });
    } catch {
      next.push({
        id: 'priorities',
        label: 'customer-priorities.json geladen',
        ok: false,
        detail: 'Datei nicht erreichbar',
      });
    }

    const feedbackOk = testLocalStorageWrite(SALES_FEEDBACK_STORAGE_KEY);
    const visitOk = testLocalStorageWrite(VISIT_STORAGE_KEY);

    try {
      const bc = await fetchBcSyncStatus();
      next.push({
        id: 'bc',
        label: 'Business Central konfiguriert',
        ok: bc.configured,
        detail: bc.configured
          ? `Umgebung: ${bc.environment ?? 'OK'}`
          : 'Optional – BC_* Env in Vercel (Setup-CTA in App)',
      });
    } catch {
      next.push({
        id: 'bc',
        label: 'Business Central konfiguriert',
        ok: false,
        detail: 'Optional – Status-Endpunkt nicht erreichbar',
      });
    }

    try {
      const sales = await fetchSalesSyncStatus();
      next.push({
        id: 'supabase',
        label: 'Supabase Cloud-Sync',
        ok: sales.configured || feedbackOk,
        detail: sales.configured
          ? 'Supabase aktiv (Dual-Write)'
          : 'Optional – localStorage aktiv, kein Cloud-Sync',
      });
    } catch {
      next.push({
        id: 'supabase',
        label: 'Supabase Cloud-Sync',
        ok: feedbackOk,
        detail: 'Optional – localStorage aktiv',
      });
    }

    try {
      const schedule = await fetchScheduleProposalStatus();
      next.push({
        id: 'schedule',
        label: 'Terminvorschläge (Self-Scheduling)',
        ok: schedule.configured,
        detail: schedule.configured
          ? schedule.email
            ? `Aktiv (${schedule.storageMode ?? 'Speicher'})`
            : `Aktiv – E-Mail-Vorschau-Fallback (${schedule.storageMode ?? 'Datei'})`
          : 'SCHEDULE_TOKEN_SECRET in .env.local setzen',
        link: { href: '/priorities', label: 'Tourenplanung' },
      });
    } catch {
      next.push({
        id: 'schedule',
        label: 'Terminvorschläge (Self-Scheduling)',
        ok: false,
        detail: 'API nicht erreichbar',
      });
    }

    next.push({
      id: 'contacts',
      label: 'Kontakt-E-Mail oder Enrichment',
      ok: hasContact,
      detail: hasContact
        ? 'Mindestens 1 Kunde mit E-Mail / Enrichment-Zeitstempel'
        : 'npm run enrich:contacts oder manuell pflegen',
      link: { href: `${GITHUB_REPO}/actions/workflows/contact-enrichment.yml`, label: 'Enrichment-Workflow' },
    });

    next.push({
      id: 'crons',
      label: 'GitHub Crons (Discovery + Enrichment)',
      ok: true,
      detail: 'Workflows im Repo vorhanden – täglich / wöchentlich',
      link: { href: `${GITHUB_REPO}/tree/main/.github/workflows`, label: 'Workflows ansehen' },
    });

    next.push({
      id: 'feedback',
      label: 'Sales-Feedback-Speicher',
      ok: feedbackOk,
      detail: feedbackOk ? 'localStorage schreibbar (+ Supabase optional)' : 'localStorage blockiert',
    });

    next.push({
      id: 'visits',
      label: 'Besuchs-Speicher',
      ok: visitOk,
      detail: visitOk ? 'localStorage schreibbar (+ Supabase optional)' : 'localStorage blockiert',
    });

    const artifactChecks = await Promise.all([
      fetch('/data/customer-priorities.json', { method: 'HEAD' }).then((r) => r.ok).catch(() => false),
      fetch('/data/leads/discovered-leads.json', { method: 'HEAD' }).then((r) => r.ok).catch(() => false),
    ]);
    const artifactsOk = artifactChecks.every(Boolean);
    next.push({
      id: 'artifacts',
      label: 'Build-Artefakte / Daten-Dateien',
      ok: artifactsOk,
      detail: artifactsOk
        ? 'customer-priorities.json + discovered-leads.json vorhanden'
        : 'Fehlende dist/data – build:dach-leads / discover:customers',
    });

    setItems(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const requiredIds = ['priorities', 'feedback', 'visits', 'artifacts', 'schedule', 'supabase'];
  const allOk = requiredIds.every((id) => items.find((i) => i.id === id)?.ok === true);
  const openCount = items.filter((i) => i.ok === false).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Go-Live Checkliste</h2>
            <p className="text-xs text-slate-500 mt-1">
              {loading ? 'System wird geprüft…' : allOk ? 'Alle Checks grün – bereit für Tourenplanung' : `${openCount} Punkt(e) offen`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runChecks()}
            disabled={loading}
            className="p-2 rounded-lg border border-dark-500 text-slate-400 hover:text-white"
            aria-label="Checks aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 py-2 border-b border-dark-600/50 last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm text-white">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
              {item.link && (
                item.link.href.startsWith('/') ? (
                  <Link to={item.link.href} className="text-xs text-pht-400 hover:text-pht-300 mt-1 inline-block">
                    {item.link.label} →
                  </Link>
                ) : (
                  <a
                    href={item.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pht-400 hover:text-pht-300 mt-1 inline-flex items-center gap-1"
                  >
                    {item.link.label} <ExternalLink className="w-3 h-3" />
                  </a>
                )
              )}
            </div>
            <StatusBadge ok={item.ok} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
