import { Building2, ChevronDown, Plus, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CustomerDetails, RelatedCompany } from '../../types/customerDetails';
import { EMPTY_ADDRESS, EMPTY_CONTACT } from '../../types/customerDetails';
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

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-slate-500">
      {label}
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

  const handleSave = () => {
    const toSave = details.lieferadresseWieRechnung
      ? { ...details, lieferadresse: { ...details.rechnungsadresse } }
      : details;
    updateCustomerDetails(customerId, toSave);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasData = Boolean(
    details.ansprechperson.name
    || details.rechnungsadresse.street
    || details.zugehoerigeFirmen.length
    || details.bcCustomerNumber,
  );

  const liefer = effectiveLieferadresse(details);

  return (
    <div className="border-t border-dark-600/50 pt-2 mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-pht-400 hover:text-pht-300"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        Stammdaten
        {hasData && !open && (
          <span className="text-slate-600 ml-1">
            · {details.ansprechperson.name || '—'}
            {details.bcCustomerNumber && ` · BC ${details.bcCustomerNumber}`}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-lg border border-dark-500/60 bg-dark-800/40 p-3">
          <p className="text-[10px] text-slate-600">
            {customerName}
            {details.bcLastSync && (
              <span> · BC-Sync {new Date(details.bcLastSync).toLocaleDateString('de-DE')}</span>
            )}
          </p>

          <div>
            <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-2">
              <User className="w-3.5 h-3.5" /> Ansprechperson
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="Name" value={details.ansprechperson.name} onChange={(v) => patchContact('name', v)} />
              <Field label="Rolle" value={details.ansprechperson.role} onChange={(v) => patchContact('role', v)} />
              <Field label="E-Mail" type="email" value={details.ansprechperson.email} onChange={(v) => patchContact('email', v)} />
              <Field label="Telefon" value={details.ansprechperson.phone} onChange={(v) => patchContact('phone', v)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Rechnungsadresse</p>
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
