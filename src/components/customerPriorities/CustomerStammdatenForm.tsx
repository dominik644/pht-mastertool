import { Building2, CalendarDays, ChevronDown, Plus, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CustomerDetails, RelatedCompany, VisitReport } from '../../types/customerDetails';
import { EMPTY_ADDRESS, EMPTY_CONTACT, createEmptyVisitReport } from '../../types/customerDetails';
import {
  CUSTOMER_DETAILS_CHANGED_EVENT,
  effectiveLieferadresse,
  formatAddressLine,
  getCustomerDetails,
  updateCustomerDetails,
} from '../../services/customerDetailsStorage';

interface CustomerStammdatenFormProps {
  customerId: string;
  customerName: string;
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(/[,;|/]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function formatKeywords(keywords: string[]): string {
  return keywords.join(', ');
}

function formatVisitDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('de-AT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function Field({
  label, value, onChange, type = 'text', placeholder, fromBc,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  fromBc?: boolean;
}) {
  return (
    <label className="block text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        {label}
        {fromBc && (
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25">
            aus BC
          </span>
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
      />
    </label>
  );
}

export function CustomerStammdatenForm({ customerId, customerName }: CustomerStammdatenFormProps) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<CustomerDetails>(() => getCustomerDetails(customerId));
  const [saved, setSaved] = useState(false);
  const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onChange = () => setDetails(getCustomerDetails(customerId));
    window.addEventListener(CUSTOMER_DETAILS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CUSTOMER_DETAILS_CHANGED_EVENT, onChange);
  }, [customerId]);

  useEffect(() => {
    if (!open) return;
    setDetails(getCustomerDetails(customerId));
  }, [open, customerId]);

  const patch = (partial: Partial<CustomerDetails>) => {
    setDetails((d) => ({ ...d, ...partial }));
    setSaved(false);
  };

  const patchAddress = (
    key: 'rechnungsadresse' | 'lieferadresse',
    field: keyof typeof EMPTY_ADDRESS,
    value: string,
  ) => {
    setDetails((d) => ({
      ...d,
      [key]: { ...d[key], [field]: value },
    }));
    setSaved(false);
  };

  const patchContact = (field: keyof typeof EMPTY_CONTACT, value: string) => {
    setDetails((d) => ({
      ...d,
      ansprechperson: { ...d.ansprechperson, [field]: value },
    }));
    setSaved(false);
  };

  const updateCompany = (index: number, partial: Partial<RelatedCompany>) => {
    setDetails((d) => {
      const list = [...d.zugehoerigeFirmen];
      list[index] = { ...list[index], ...partial };
      return { ...d, zugehoerigeFirmen: list };
    });
    setSaved(false);
  };

  const addCompany = () => {
    setDetails((d) => ({
      ...d,
      zugehoerigeFirmen: [...d.zugehoerigeFirmen, { companyName: '', relationType: '' }],
    }));
    setSaved(false);
  };

  const removeCompany = (index: number) => {
    setDetails((d) => ({
      ...d,
      zugehoerigeFirmen: d.zugehoerigeFirmen.filter((_, i) => i !== index),
    }));
    setSaved(false);
  };

  const visitReports = details.visitReports ?? [];

  const addVisitReport = () => {
    const report = createEmptyVisitReport();
    setDetails((d) => ({
      ...d,
      visitReports: [report, ...(d.visitReports ?? [])],
    }));
    setExpandedVisits((m) => ({ ...m, [report.id]: true }));
    setSaved(false);
  };

  const updateVisitReport = (id: string, partial: Partial<VisitReport>) => {
    setDetails((d) => ({
      ...d,
      visitReports: (d.visitReports ?? []).map((r) => (r.id === id ? { ...r, ...partial } : r)),
    }));
    setSaved(false);
  };

  const removeVisitReport = (id: string) => {
    setDetails((d) => ({
      ...d,
      visitReports: (d.visitReports ?? []).filter((r) => r.id !== id),
    }));
    setExpandedVisits((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setSaved(false);
  };

  const isVisitOpen = (report: VisitReport) => {
    if (expandedVisits[report.id] !== undefined) return expandedVisits[report.id];
    return Boolean(report.open);
  };

  const toggleVisit = (id: string) => {
    const report = visitReports.find((r) => r.id === id);
    if (!report) return;
    setExpandedVisits((m) => ({ ...m, [id]: !isVisitOpen(report) }));
  };

  const handleSave = () => {
    const toSave = details.lieferadresseWieRechnung
      ? { ...details, lieferadresse: { ...details.rechnungsadresse } }
      : details;
    updateCustomerDetails(customerId, {
      ...toSave,
      visitReports: (toSave.visitReports ?? []).map((r) => ({
        ...r,
        keywords: r.keywords.map((k) => k.trim()).filter(Boolean),
        open: undefined,
      })),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasData = Boolean(
    details.ansprechperson.name
    || details.rechnungsadresse.street
    || details.zugehoerigeFirmen.length
    || details.bcCustomerNumber
    || visitReports.length,
  );

  const liefer = effectiveLieferadresse(details);
  const fromBc = Boolean(details.bcLastSync);

  return (
    <div className="border-t border-dark-600/50 pt-2 mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-pht-400 hover:text-pht-300"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        Stammdaten
        {fromBc && (
          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25">
            aus BC
          </span>
        )}
        {hasData && !open && (
          <span className="text-slate-600 ml-1">
            · {details.ansprechperson.name || '—'}
            {details.bcCustomerNumber && ` · BC ${details.bcCustomerNumber}`}
            {visitReports.length > 0 && ` · ${visitReports.length} Besuch${visitReports.length === 1 ? '' : 'e'}`}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-lg border border-dark-500/60 bg-dark-800/40 p-3">
          <p className="text-[10px] text-slate-600">
            {customerName}
            {details.bcLastSync && (
              <span> · BC-Sync {new Date(details.bcLastSync).toLocaleString('de-DE')}</span>
            )}
          </p>

          {(details.bcSalespersonName || details.bcPaymentTerms || details.bcBlocked) && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              {details.bcSalespersonName && (
                <span className="px-2 py-1 rounded bg-dark-700 border border-dark-500 text-slate-400">
                  Verkäufer: {details.bcSalespersonName}
                  {details.bcSalespersonCode && ` (${details.bcSalespersonCode})`}
                  <span className="ml-1 text-sky-400">aus BC</span>
                </span>
              )}
              {details.bcPaymentTerms && (
                <span className="px-2 py-1 rounded bg-dark-700 border border-dark-500 text-slate-400">
                  Zahlungsbed.: {details.bcPaymentTerms} <span className="text-sky-400">aus BC</span>
                </span>
              )}
              {details.bcBlocked && (
                <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-300">
                  Gesperrt in BC
                </span>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-2">
              <User className="w-3.5 h-3.5" /> Ansprechperson
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="Name" value={details.ansprechperson.name} onChange={(v) => patchContact('name', v)} fromBc={fromBc && Boolean(details.ansprechperson.name)} />
              <Field label="Rolle" value={details.ansprechperson.role} onChange={(v) => patchContact('role', v)} fromBc={fromBc && Boolean(details.ansprechperson.role)} />
              <Field label="E-Mail" type="email" value={details.ansprechperson.email} onChange={(v) => patchContact('email', v)} fromBc={fromBc && Boolean(details.ansprechperson.email)} />
              <Field label="Telefon" value={details.ansprechperson.phone} onChange={(v) => patchContact('phone', v)} fromBc={fromBc && Boolean(details.ansprechperson.phone)} />
            </div>
            {(details.additionalContacts?.length ?? 0) > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-slate-500">Weitere Kontakte (z. B. Snapaddy)</p>
                {details.additionalContacts!.map((c, i) => (
                  <div key={`${c.email}-${i}`} className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="font-medium text-white">{c.name || '—'}</span>
                    {c.role && <span className="text-slate-500">{c.role}</span>}
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    <button
                      type="button"
                      onClick={() => {
                        setDetails((d) => ({
                          ...d,
                          additionalContacts: (d.additionalContacts ?? []).filter((_, idx) => idx !== i),
                        }));
                        setSaved(false);
                      }}
                      className="p-1 text-slate-600 hover:text-red-400"
                      aria-label="Kontakt entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-2">
              Rechnungsadresse
              {fromBc && details.rechnungsadresse.street && (
                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25">
                  aus BC
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <Field label="Straße" value={details.rechnungsadresse.street} onChange={(v) => patchAddress('rechnungsadresse', 'street', v)} />
              </div>
              <Field label="PLZ" value={details.rechnungsadresse.plz} onChange={(v) => patchAddress('rechnungsadresse', 'plz', v)} />
              <Field label="Ort" value={details.rechnungsadresse.ort} onChange={(v) => patchAddress('rechnungsadresse', 'ort', v)} />
              <Field label="Land" value={details.rechnungsadresse.land} onChange={(v) => patchAddress('rechnungsadresse', 'land', v)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400">Lieferadresse</p>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={details.lieferadresseWieRechnung}
                  onChange={(e) => patch({ lieferadresseWieRechnung: e.target.checked })}
                  className="rounded border-dark-500"
                />
                wie Rechnungsadresse
              </label>
            </div>
            {!details.lieferadresseWieRechnung && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  <Field label="Straße" value={details.lieferadresse.street} onChange={(v) => patchAddress('lieferadresse', 'street', v)} />
                </div>
                <Field label="PLZ" value={details.lieferadresse.plz} onChange={(v) => patchAddress('lieferadresse', 'plz', v)} />
                <Field label="Ort" value={details.lieferadresse.ort} onChange={(v) => patchAddress('lieferadresse', 'ort', v)} />
                <Field label="Land" value={details.lieferadresse.land} onChange={(v) => patchAddress('lieferadresse', 'land', v)} />
              </div>
            )}
            {details.lieferadresseWieRechnung && liefer.street && (
              <p className="text-xs text-slate-500">{formatAddressLine(liefer)}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-2">
              <Building2 className="w-3.5 h-3.5" /> Zugehörige Firmen
            </p>
            <div className="space-y-2">
              {details.zugehoerigeFirmen.map((firm, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-end">
                  <Field label="Firmenname" value={firm.companyName} onChange={(v) => updateCompany(i, { companyName: v })} />
                  <Field label="Beziehung" value={firm.relationType} onChange={(v) => updateCompany(i, { relationType: v })} placeholder="z. B. Muttergesellschaft" />
                  <Field label="BC-Kundennr." value={firm.bcCustomerNo ?? ''} onChange={(v) => updateCompany(i, { bcCustomerNo: v || undefined })} />
                  <button type="button" onClick={() => removeCompany(i)} className="p-2 text-slate-600 hover:text-red-400" aria-label="Firma entfernen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCompany}
                className="flex items-center gap-1 text-xs text-pht-400 hover:text-pht-300"
              >
                <Plus className="w-3.5 h-3.5" /> Firma hinzufügen
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> Besuchsberichte
              </p>
              <button
                type="button"
                onClick={addVisitReport}
                className="inline-flex items-center gap-1 rounded-lg bg-pht-600/20 border border-pht-500/40 text-pht-300 px-2 py-1 text-xs hover:bg-pht-600/30"
                aria-label="Besuchstag hinzufügen"
              >
                <Plus className="w-3.5 h-3.5" /> Tag
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mb-2">
              Pro Tag ein Bericht — Keywords bleiben sichtbar, wenn der Tag eingeklappt ist.
            </p>
            <div className="space-y-2">
              {visitReports.length === 0 && (
                <p className="text-xs text-slate-600">Noch keine Besuchsberichte. Mit + Tag anlegen.</p>
              )}
              {visitReports.map((report) => {
                const openVisit = isVisitOpen(report);
                return (
                  <div
                    key={report.id}
                    className="rounded-lg border border-dark-500/70 bg-dark-900/40 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => toggleVisit(report.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${openVisit ? 'rotate-180' : ''}`}
                        />
                        <span className="text-xs font-medium text-white shrink-0">
                          {formatVisitDate(report.date)}
                        </span>
                        <span className="flex flex-wrap gap-1 min-w-0">
                          {report.keywords.length === 0 ? (
                            <span className="text-[10px] text-slate-600 italic">keine Keywords</span>
                          ) : (
                            report.keywords.map((kw) => (
                              <span
                                key={kw}
                                className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-200 border border-amber-500/25 truncate max-w-[9rem]"
                              >
                                {kw}
                              </span>
                            ))
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVisitReport(report.id)}
                        className="p-1.5 text-slate-600 hover:text-red-400 shrink-0"
                        aria-label="Besuchsbericht löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {openVisit && (
                      <div className="px-2.5 pb-2.5 space-y-2 border-t border-dark-600/50 pt-2">
                        <Field
                          label="Datum"
                          type="date"
                          value={report.date}
                          onChange={(v) => updateVisitReport(report.id, { date: v })}
                        />
                        <label className="block text-xs text-slate-500">
                          Keywords
                          <span className="text-slate-600 font-normal"> (kommagetrennt, z. B. Hygiene, Angebot, Nachfassen)</span>
                          <input
                            type="text"
                            value={formatKeywords(report.keywords)}
                            onChange={(e) => updateVisitReport(report.id, {
                              keywords: parseKeywords(e.target.value),
                            })}
                            placeholder="Thema, Produkt, nächster Schritt…"
                            className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
                          />
                        </label>
                        <label className="block text-xs text-slate-500">
                          Bericht
                          <textarea
                            value={report.notes}
                            onChange={(e) => updateVisitReport(report.id, { notes: e.target.value })}
                            rows={3}
                            placeholder="Was wurde besprochen, Ergebnisse, offene Punkte…"
                            className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white resize-y min-h-[4.5rem]"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-pht-600 text-white text-xs hover:bg-pht-700">
              Stammdaten speichern
            </button>
            {saved && <span className="text-xs text-emerald-400 self-center">Gespeichert</span>}
          </div>
        </div>
      )}
    </div>
  );
}
