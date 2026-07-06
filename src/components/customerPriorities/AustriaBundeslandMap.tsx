import { BUNDESLAND_SHORT } from '../../lib/bundeslandFromPlz';
import type { BundeslandOverview } from '../../services/customerVisitStorage';

interface RegionDef {
  name: string;
  d: string;
  labelX: number;
  labelY: number;
}

/** Schematic AT map – lightweight SVG, no external deps. */
const REGIONS: RegionDef[] = [
  { name: 'Vorarlberg', d: 'M12,28 L48,22 L52,58 L18,62 Z', labelX: 30, labelY: 44 },
  { name: 'Tirol', d: 'M52,22 L118,18 L122,72 L56,78 L52,58 Z', labelX: 82, labelY: 50 },
  { name: 'Salzburg', d: 'M118,18 L168,24 L164,68 L122,72 Z', labelX: 144, labelY: 48 },
  { name: 'Oberösterreich', d: 'M164,24 L228,32 L224,88 L168,84 L164,68 Z', labelX: 194, labelY: 58 },
  { name: 'Niederösterreich', d: 'M168,84 L248,78 L252,138 L172,142 Z', labelX: 208, labelY: 112 },
  { name: 'Wien', d: 'M252,138 L278,136 L280,158 L254,160 Z', labelX: 264, labelY: 150 },
  { name: 'Steiermark', d: 'M122,72 L168,84 L172,142 L128,148 L118,108 Z', labelX: 144, labelY: 108 },
  { name: 'Kärnten', d: 'M118,108 L128,148 L168,152 L164,198 L112,192 Z', labelX: 138, labelY: 158 },
  { name: 'Burgenland', d: 'M252,138 L280,158 L276,208 L248,204 L248,168 Z', labelX: 262, labelY: 178 },
];

function regionFill(bl: BundeslandOverview | undefined, selected: boolean): string {
  if (!bl || bl.count === 0) return selected ? 'rgba(100,116,139,0.35)' : 'rgba(51,65,85,0.5)';
  if (bl.overdue > 0) return selected ? 'rgba(239,68,68,0.55)' : 'rgba(239,68,68,0.35)';
  if (bl.priorities.A > 0) return selected ? 'rgba(52,211,153,0.55)' : 'rgba(52,211,153,0.35)';
  if (bl.priorities.B > 0) return selected ? 'rgba(251,191,36,0.55)' : 'rgba(251,191,36,0.3)';
  return selected ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.3)';
}

interface AustriaBundeslandMapProps {
  overview: BundeslandOverview[];
  selected: string[];
  onSelect: (name: string) => void;
}

export function AustriaBundeslandMap({ overview, selected, onSelect }: AustriaBundeslandMapProps) {
  const byName = new Map(overview.map((o) => [o.name, o]));

  return (
    <div className="w-full max-w-md mx-auto">
      <svg viewBox="0 0 292 220" className="w-full h-auto" role="img" aria-label="Österreich Karte nach Bundesland">
        {REGIONS.map((r) => {
          const bl = byName.get(r.name);
          const isSelected = selected.includes(r.name);
          const short = BUNDESLAND_SHORT[r.name as keyof typeof BUNDESLAND_SHORT] ?? r.name;
          return (
            <g key={r.name}>
              <path
                d={r.d}
                fill={regionFill(bl, isSelected)}
                stroke={isSelected ? '#38bdf8' : '#475569'}
                strokeWidth={isSelected ? 2 : 1}
                className="cursor-pointer transition-colors hover:opacity-90"
                onClick={() => onSelect(r.name)}
              />
              <text
                x={r.labelX}
                y={r.labelY}
                textAnchor="middle"
                className="fill-white text-[9px] font-semibold pointer-events-none select-none"
                style={{ fontSize: 9 }}
              >
                {short}
              </text>
              {bl && bl.count > 0 && (
                <text
                  x={r.labelX}
                  y={r.labelY + 11}
                  textAnchor="middle"
                  className="fill-slate-300 pointer-events-none select-none"
                  style={{ fontSize: 7 }}
                >
                  {bl.priorities.A}A {bl.overdue > 0 ? `· ${bl.overdue}⚠` : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-3 mt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/50" /> Prio A</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/50" /> Prio B</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/50" /> überfällig</span>
      </div>
    </div>
  );
}
