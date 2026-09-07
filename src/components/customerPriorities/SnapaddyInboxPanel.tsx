import { CreditCard, Plus, Upload, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import type { SnapaddyCard } from '../../types/snapaddy';
import { matchSnapaddyCard } from '../../lib/snapaddyMatch';
import {
  addLocalSnapaddyCard,
  applySnapaddyAsNewCustomer,
  applySnapaddyToExisting,
  fetchSnapaddyInbox,
  markSnapaddyCard,
  mergeSnapaddyInboxes,
  removeLocalSnapaddyCard,
} from '../../services/snapaddyInbox';

interface SnapaddyInboxPanelProps {
  customers: CustomerPriority[];
  ownerName: string;
  focusId?: string | null;
  onApplied: () => void;
}

function cell(row: Record<string, unknown>, keys: string[]): string {
  const map = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, ''), String(v ?? '').trim()]),
  );
  for (const key of keys) {
    const hit = map[key.toLowerCase().replace(/\s+/g, '')];
    if (hit) return hit;
  }
  return '';
}

async function cardsFromExcel(file: File): Promise<SnapaddyCard[]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows.map((row) => {
    const firstName = cell(row, ['vorname', 'firstname', 'first_name']);
    const lastName = cell(row, ['nachname', 'lastname', 'last_name', 'name']);
    const company = cell(row, ['firma', 'company', 'unternehmen', 'organization', 'organisation']);
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
      || cell(row, ['name', 'fullname', 'ansprechpartner']);
    return addLocalSnapaddyCard({
      firstName,
      lastName,
      fullName,
      email: cell(row, ['email', 'e-mail', 'mail']),
      phone: cell(row, ['telefon', 'phone', 'mobil', 'mobile', 'tel']),
      role: cell(row, ['position', 'titel', 'rolle', 'jobtitle']),
      company,
      street: cell(row, ['strasse', 'straße', 'street', 'adresse']),
      zip: cell(row, ['plz', 'zip', 'postalcode']),
      city: cell(row, ['ort', 'city', 'stadt']),
      country: cell(row, ['land', 'country']) || 'AT',
    });
  }).filter((c) => c.company || c.fullName || c.email);
}

export function SnapaddyInboxPanel({
  customers,
  ownerName,
  focusId,
  onApplied,
}: SnapaddyInboxPanelProps) {
  const [cards, setCards] = useState<SnapaddyCard[]>([]);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState({ company: '', fullName: '', email: '', phone: '', city: '', zip: '', role: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    void fetchSnapaddyInbox().then((incoming) => {
      setCards(mergeSnapaddyInboxes(incoming));
    });
  };

  useEffect(() => {
    load();
  }, [focusId]);

  const visible = cards;

  const handleNew = async (card: SnapaddyCard) => {
    setBusyId(card.id);
    applySnapaddyAsNewCustomer(card, ownerName);
    removeLocalSnapaddyCard(card.id);
    await markSnapaddyCard(card.id, 'applied').catch(() => undefined);
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setBusyId(null);
    onApplied();
  };

  const handleAssign = async (card: SnapaddyCard, customer: CustomerPriority) => {
    setBusyId(card.id);
    applySnapaddyToExisting(card, customer);
    removeLocalSnapaddyCard(card.id);
    await markSnapaddyCard(card.id, 'applied').catch(() => undefined);
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setAssignFor(null);
    setBusyId(null);
    onApplied();
  };

  const handleDismiss = async (id: string) => {
    removeLocalSnapaddyCard(id);
    await markSnapaddyCard(id, 'dismissed').catch(() => undefined);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleManual = () => {
    if (!draft.company.trim() && !draft.fullName.trim()) {
      setImportMsg('Bitte Firma oder Name eintragen.');
      return;
    }
    const card = addLocalSnapaddyCard(draft);
    setCards((prev) => [card, ...prev]);
    setDraft({ company: '', fullName: '', email: '', phone: '', city: '', zip: '', role: '' });
    setManualOpen(false);
    setImportMsg('Kontakt übernommen – unten zuordnen.');
  };

  const handleExcel = async (file: File | null) => {
    if (!file) return;
    try {
      const imported = await cardsFromExcel(file);
      setCards((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        return [...imported.filter((c) => !ids.has(c.id)), ...prev];
      });
      setImportMsg(`${imported.length} Kontakt(e) aus Excel übernommen.`);
    } catch {
      setImportMsg('Excel konnte nicht gelesen werden.');
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-pht-500/40 bg-pht-600/10 p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-pht-300" />
          Snapaddy Visitenkarten
          {visible.length > 0 ? ` (${visible.length} offen)` : ''}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Hier landen gescannte Karten. Der Handy-Export „CRM“ sendet oft nicht an unser Tool —
          Excel vom Handy hier hochladen oder Kontakt kurz eintragen.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700"
        >
          <Upload className="w-3 h-3" />
          Excel von Snapaddy laden
        </button>
        <button
          type="button"
          onClick={() => setManualOpen((o) => !o)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-500 text-slate-300 text-xs hover:bg-dark-700"
        >
          <Plus className="w-3 h-3" />
          Kontakt eintragen
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => void handleExcel(e.target.files?.[0] ?? null)}
        />
      </div>

      {importMsg && <p className="text-[11px] text-pht-300">{importMsg}</p>}

      {manualOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            ['company', 'Firma'],
            ['fullName', 'Ansprechperson'],
            ['role', 'Rolle'],
            ['email', 'E-Mail'],
            ['phone', 'Telefon'],
            ['zip', 'PLZ'],
            ['city', 'Ort'],
          ] as const).map(([key, label]) => (
            <input
              key={key}
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              placeholder={label}
              className="px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-500 text-xs text-white"
            />
          ))}
          <button
            type="button"
            onClick={handleManual}
            className="sm:col-span-2 px-3 py-2 rounded-lg bg-pht-600 text-white text-xs font-medium"
          >
            Zur Zuordnung hinzufügen
          </button>
        </div>
      )}

      {visible.length === 0 && (
        <p className="text-xs text-slate-500">
          Aktuell keine offenen Karten. Nach Excel-Import oder Eintragen erscheinen sie hier zum Zuordnen
          (neuer Kunde oder bestehender Kunde).
        </p>
      )}

      {visible.map((card) => {
        const matches = matchSnapaddyCard(card, customers);
        const pickList = search.trim()
          ? customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
          : matches.map((m) => customers.find((c) => c.id === m.customerId)).filter(Boolean) as CustomerPriority[];

        return (
          <div key={card.id} className="rounded-lg border border-dark-500/60 bg-dark-800/80 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-white font-medium">{card.company || card.fullName || 'Kontakt'}</p>
                <p className="text-xs text-slate-400">
                  {[card.fullName, card.role].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-slate-500">
                  {[card.email, card.phone, `${card.zip} ${card.city}`.trim()].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDismiss(card.id)}
                className="text-slate-500 hover:text-white p-1"
                aria-label="Ablehnen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {matches.length > 0 && assignFor !== card.id && (
              <p className="text-[11px] text-pht-300">
                Ähnlich: {matches.map((m) => `${m.customerName} (${m.reason})`).join(' · ')}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={busyId === card.id}
                onClick={() => void handleNew(card)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700 disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                Neuer Kunde
              </button>
              <button
                type="button"
                onClick={() => setAssignFor((id) => (id === card.id ? null : card.id))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-500 text-slate-300 text-xs hover:bg-dark-700"
              >
                <UserPlus className="w-3 h-3" />
                Zu bestehendem Kunden
              </button>
            </div>

            {assignFor === card.id && (
              <div className="space-y-1.5">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Kunde suchen…"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-500 text-xs text-white"
                />
                <ul className="max-h-40 overflow-y-auto space-y-0.5">
                  {pickList.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={busyId === card.id}
                        onClick={() => void handleAssign(card, c)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-dark-700"
                      >
                        {c.name}
                        <span className="text-slate-600"> · {c.zip} {c.city}</span>
                      </button>
                    </li>
                  ))}
                  {pickList.length === 0 && (
                    <li className="text-[11px] text-slate-500 px-2 py-1">Kein Treffer – suchen oder als neuen Kunden anlegen.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
