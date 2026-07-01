import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Moon, CalendarDays, Layers, Undo2, Redo2, Download, 
  ChevronLeft, ChevronRight, Eye, Fish, Star, Zap, 
  SlidersVertical, Palette, Info, ChartNoAxesColumn, X,
  ZoomIn, Focus
} from 'lucide-react';
import { LunarContext, useLunarContext } from './context';
import RadialLayout from './components/RadialLayout';
import { EditorProSection } from './components/EditorProSection';
import { CalendarSettings, CalendarDay } from './types';
import { getDaysInMonth } from './utils';

// --- FUENTES Y ESTILOS GLOBALES ---
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;700&display=swap');
  
  :root {
    --font-jetbrains: 'JetBrains Mono', monospace;
    --font-inter: 'Inter', sans-serif;
  }
  
  body {
    background-color: #000;
    color: #fff;
    font-family: var(--font-inter);
    overflow: hidden;
    margin: 0;
    padding: 0;
  }

  .panel-label {
    font-family: var(--font-jetbrains);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.4);
  }

  /* Barra de desplazamiento personalizada */
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Rango personalizado para sliders */
  .custom-slider {
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    outline: none;
  }
  .custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
  }
  
  @media print {
    body * { visibility: hidden; }
    #calendar-svg, #calendar-svg *, #print-seasonal, #print-seasonal * { visibility: visible; }
    #calendar-svg { position: absolute; left: 0; top: 0; width: 100%; height: auto; }
    #print-seasonal { position: absolute; left: 0; top: 0; width: 100%; }
    .page-break { page-break-after: always; }
  }
`;

// --- UTILIDADES DE ASTRONOMÍA ---
const LUNAR_MONTH = 29.53058867;
const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)).getTime();

export const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MONTHS_ES_ABBR = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export function getMoonPhase(date: Date) {
  const diff = date.getTime() - KNOWN_NEW_MOON;
  const days = diff / (1000 * 60 * 60 * 24);
  let phase = (days / LUNAR_MONTH) % 1;
  if (phase < 0) phase += 1;
  return phase;
}

export function getMoonPhaseData(date: Date) {
  const phase = getMoonPhase(date);
  let phaseName = '';
  
  if (phase < 0.02 || phase > 0.98) phaseName = 'Luna Nueva';
  else if (phase < 0.23) phaseName = 'Luna Creciente';
  else if (phase < 0.27) phaseName = 'Cuarto Creciente';
  else if (phase < 0.48) phaseName = 'Luna Gibosa Creciente';
  else if (phase < 0.52) phaseName = 'Luna Llena';
  else if (phase < 0.73) phaseName = 'Luna Gibosa Menguante';
  else if (phase < 0.77) phaseName = 'Cuarto Menguante';
  else phaseName = 'Luna Menguante';

  const fraction = phase <= 0.5 ? phase * 2 : 1 - ((phase - 0.5) * 2);

  return {
    phase,
    phaseName,
    fraction,
    angle: phase * 360,
  };
}

export function getNextPhases(fromDate: Date) {
  const phases: {name: string, date: Date}[] = [];
  let d = new Date(fromDate);
  for (let i = 0; i < 30; i++) {
    d.setDate(d.getDate() + 1);
    const p = getMoonPhase(d);
    if (p >= 0.98 || p < 0.02) phases.push({ name: 'Luna Nueva', date: new Date(d) });
    else if (p >= 0.23 && p < 0.27) phases.push({ name: 'Cuarto Creciente', date: new Date(d) });
    else if (p >= 0.48 && p < 0.52) phases.push({ name: 'Luna Llena', date: new Date(d) });
    else if (p >= 0.73 && p < 0.77) phases.push({ name: 'Cuarto Menguante', date: new Date(d) });
  }
  // Eliminar duplicados
  const unique: {name: string, date: Date}[] = [];
  phases.forEach(p => {
    if (!unique.find(u => u.name === p.name && Math.abs(u.date.getTime() - p.date.getTime()) < 86400000 * 3)) {
      unique.push(p);
    }
  });
  return unique.slice(0, 4);
}

export function calculateVisibility(year: number, month: number, day: number, phase: number) {
  // Simulación de visibilidad (mejor cerca de luna nueva)
  const darkSky = (1 - (phase <= 0.5 ? phase * 2 : 2 - phase * 2));
  return Math.max(1, Math.round(darkSky * 10)); 
}

export function getHuntingFishingScore(phase: number) {
  // Simulación de puntuación de actividad
  const distToMajor = Math.min(phase, Math.abs(phase - 0.5), 1 - phase);
  if (distToMajor < 0.1) return 'Excelente (90%)';
  if (distToMajor < 0.2) return 'Bueno (75%)';
  return 'Promedio (50%)';
}

// Genera el path SVG para la fase lunar
export function moonPhasePath(phase: number, r: number, hemisphere: 'N' | 'S' = 'N') {
  const isWaxing = phase <= 0.5;
  const relPhase = isWaxing ? phase * 2 : (phase - 0.5) * 2;
  const terminatorRx = Math.abs(relPhase - 0.5) * 2 * r;
  const terminatorSweep = relPhase < 0.5 ? 0 : 1;
  const brightSide = isWaxing ? 1 : 0;

  let b = brightSide;
  let s = terminatorSweep;
  // Invertir visualmente para el hemisferio sur
  if (hemisphere === 'S') {
    b = b === 1 ? 0 : 1;
    s = s === 1 ? 0 : 1;
  }

  return `
    M 0 ${-r}
    A ${r} ${r} 0 0 ${b} 0 ${r}
    A ${terminatorRx} ${r} 0 0 ${s} 0 ${-r}
    Z
  `;
}

export const COLOR_PALETTES = [
  { id: 'classic', name: 'Clásico Mono', bg: '#000000', moon: '#ffffff', text: '#ffffff', accent: '#ffffff' },
  { id: 'midnight', name: 'Medianoche', bg: '#040b16', moon: '#e2e8f0', text: '#cbd5e1', accent: '#3b82f6' },
  { id: 'blood', name: 'Luna de Sangre', bg: '#1a0505', moon: '#ff4444', text: '#ffb3b3', accent: '#ef4444' },
  { id: 'gold', name: 'Oro Celestial', bg: '#0f0f0a', moon: '#fbbf24', text: '#fde68a', accent: '#f59e0b' },
];

// --- CONTEXTO GLOBAL ---
// LunarContext y useLunarContext movidos a context.ts

// --- COMPONENTES VISUALES ---

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useLunarContext();

  useEffect(() => {
    if (!state.starField) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.parentElement!.clientWidth;
      canvas.height = canvas.parentElement!.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars: {x: number, y: number, r: number, opacity: number, speed: number}[] = [];
    for (let i = 0; i < 300; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.1,
        opacity: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 0.003 + 0.001,
      });
    }

    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame += 0.01;
      stars.forEach(s => {
        const twinkle = Math.sin(frame * s.speed * 100 + s.x) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `${state.primaryColor}${Math.floor((s.opacity * twinkle)*255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [state.starField, state.primaryColor]);

  if (!state.starField) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

function ExportModal({ onClose }: { onClose: () => void }) {
  const [format, setFormat] = useState('PNG');
  const [resolution, setResolution] = useState('HD');

  const resolutions = {
    'HD': { w: 1920, h: 1080 },
    '2K': { w: 2560, h: 1440 },
    '4K': { w: 3840, h: 2160 },
    '8K': { w: 7680, h: 4320 },
  };

  const handleExport = async () => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;
    
    if (format === 'Embed Code') {
        const embedCode = `<iframe src="${window.location.href}" width="100%" height="500px"></iframe>`;
        navigator.clipboard.writeText(embedCode);
        alert('Código copiado al portapapeles');
        onClose();
        return;
    }

    // 1. Serialize SVG to Data URL
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    const blob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(blob);

    if (format === 'SVG') {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calendar.svg';
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
    }
    
    // 2. Load into Image for Canvas conversion
    const img = new Image();
    img.src = url;
    await new Promise((resolve) => img.onload = resolve);
    
    // 3. Draw on Canvas
    const canvas = document.createElement('canvas');
    const res = resolutions[resolution as keyof typeof resolutions];
    canvas.width = res.w;
    canvas.height = res.h;
    const ctx = canvas.getContext('2d');
    
    // Fill background for formats that don't support transparency
    if (format === 'JPG') {
        ctx!.fillStyle = '#FFFFFF';
        ctx!.fillRect(0, 0, res.w, res.h);
    }
    ctx?.drawImage(img, 0, 0, res.w, res.h);
    
    // 4. Export
    if (format === 'PDF') {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save('calendar.pdf');
    } else {
        const mimeType = format === 'JPG' ? 'image/jpeg' : `image/${format.toLowerCase()}`;
        const dataUrl = canvas.toDataURL(mimeType);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `calendar.${format.toLowerCase()}`;
        a.click();
    }
    
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 p-6 rounded-xl w-[500px] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-mono uppercase tracking-widest text-sm">Exportar Calendario</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={18} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-[10px] uppercase tracking-widest font-mono block mb-2">Formato</label>
            <div className="grid grid-cols-6 gap-2">
              {['PNG', 'JPG', 'WEBP', 'SVG', 'PDF', 'Embed Code'].map(f => (
                <button key={f} onClick={() => setFormat(f)} className={`py-2 text-[10px] font-mono rounded ${format === f ? 'bg-white text-black' : 'bg-white/5 text-white'}`}>{f}</button>
              ))}
            </div>
          </div>
          
          {['PNG', 'JPG', 'WEBP'].includes(format) && (
            <div>
              <label className="text-white/60 text-[10px] uppercase tracking-widest font-mono block mb-2">Resolución</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(resolutions).map(r => (
                  <button key={r} onClick={() => setResolution(r)} className={`py-2 text-[10px] font-mono rounded ${resolution === r ? 'bg-white text-black' : 'bg-white/5 text-white'}`}>{r}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleExport} className="w-full mt-6 py-3 bg-white text-black font-bold font-mono text-xs rounded-lg">
          Generar y Descargar
        </button>
        <button onClick={() => window.print()} className="w-full mt-2 py-3 bg-white/10 text-white font-bold font-mono text-xs rounded-lg hover:bg-white/20 transition">
          Imprimir Calendario
        </button>
      </div>
    </div>
  );
}

function TopToolbar({ mode, onModeChange }: { mode: string, onModeChange: (m: string) => void }) {
  const { state, undo, redo, canUndo, canRedo } = useLunarContext();
  const [showExport, setShowExport] = useState(false);

  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-black border-b border-white/10 z-20 relative shrink-0">
      {/* Marca / Brand */}
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center">
          <Moon size={11} className="text-white" />
        </div>
        <span className="text-white text-[11px] font-bold tracking-[0.25em] uppercase"
          style={{ fontFamily: 'var(--font-jetbrains, monospace)' }}>
          Luna Studio
        </span>
        <span className="text-white/20 text-[9px] font-mono border border-white/10 px-1.5 py-0.5 rounded">
          v2
        </span>
      </div>

      {/* Centro — Selector de modo + info del periodo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded border border-white/10 overflow-hidden"
          style={{ fontFamily: 'var(--font-jetbrains, monospace)' }}>
          {[
            ['calendar','Calendario', CalendarDays],
            ['canvas','Lienzo', Layers]
          ].map(([m, label, Icon]: any) => (
            <button key={m} onClick={() => onModeChange(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-widest transition-all"
              style={{
                background: mode === m ? '#ffffff' : 'transparent',
                color:      mode === m ? '#000'    : 'rgba(255,255,255,0.35)',
                fontWeight: mode === m ? 700 : 400,
              }}>
              <Icon size={10} />
              {label}
            </button>
          ))}
        </div>

        {mode === 'calendar' && (
          <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-jetbrains, monospace)', color: 'rgba(255,255,255,0.4)' }}>
            <span>{MONTHS_ES_ABBR[state.month - 1]}</span>
            <span className="text-white/10">·</span>
            <span className="text-white/60 font-bold">{state.year}</span>
            <span className="text-white/10">·</span>
            <span>{state.layout}</span>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <button onClick={undo} disabled={!canUndo}
          aria-label="Deshacer cambio anterior"
          className="w-8 h-8 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition disabled:opacity-15 disabled:cursor-not-allowed"
          title="Deshacer (Ctrl+Z)">
          <Undo2 size={14} />
        </button>
        <button onClick={redo} disabled={!canRedo}
          aria-label="Rehacer cambio"
          className="w-8 h-8 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition disabled:opacity-15 disabled:cursor-not-allowed"
          title="Rehacer (Ctrl+Y)">
          <Redo2 size={14} />
        </button>

        <div className="w-px h-4 bg-white/10 mx-3" />

        <button onClick={() => setShowExport(true)}
          className="flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-mono tracking-widest uppercase transition-all
            text-black bg-white hover:bg-white/90 border-0 font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <Download size={12} />
          Exportar
        </button>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </header>
  );
}

function BottomBar() {
  const { state, updateState } = useLunarContext();
  const today = useMemo(() => new Date(), []);
  const phaseData = useMemo(() => getMoonPhaseData(today), []);

  const applyPalette = (id: string) => {
    const p = COLOR_PALETTES.find(x => x.id === id);
    if (!p) return;
    updateState((prev: any) => ({
      ...prev,
      activePalette: id,
      bgColor: p.bg,
      primaryColor: p.moon,
      accentColor: p.accent,
      textColor: p.text,
    }));
  };

  const miniR = 10;
  const moonPath = moonPhasePath(phaseData.phase, miniR, state.hemisphere);

  return (
    <footer
      className="flex items-center justify-between gap-5 px-5 py-2 border-t border-white/10 shrink-0 z-20"
      style={{ background: '#050505', fontFamily: 'var(--font-jetbrains, monospace)' }}
    >
      <div className="flex items-center gap-4">
        {/* Luna de hoy — mini SVG */}
        <div className="flex items-center gap-3 pr-5 border-r border-white/10">
          <svg width={miniR * 2} height={miniR * 2} viewBox={`0 0 ${miniR*2} ${miniR*2}`}>
            <circle cx={miniR} cy={miniR} r={miniR} fill="#111" />
            <g transform={`translate(${miniR},${miniR})`}>
              <path d={moonPath} fill={state.primaryColor} />
            </g>
          </svg>
          <div>
            <div className="text-[9px] text-white/70 uppercase tracking-[0.2em] font-bold">{phaseData.phaseName}</div>
            <div className="text-[8px] text-white/40 font-mono mt-0.5">{Math.round(phaseData.fraction * 100)}% iluminada</div>
          </div>
        </div>

        {/* Accesos rápidos a paletas */}
        <div className="flex items-center gap-3">
          <span className="text-[8px] text-white/30 uppercase tracking-widest">Paleta</span>
          <div className="flex gap-1.5">
            {COLOR_PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => applyPalette(p.id)}
                title={p.name}
                className="transition-transform hover:scale-125 hover:shadow-lg"
                style={{
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: p.moon,
                  border: state.activePalette === p.id
                    ? '2px solid rgba(255,255,255,1)'
                    : '2px solid rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Atajos de teclado e indicaciones */}
      <div className="flex items-center gap-3 text-[8px] text-white/20 tracking-widest uppercase select-none">
        {['⌘Z Deshacer', '⌘Y Rehacer', 'Rueda: Zoom', 'Arrastrar: Mover'].map(h => (
          <span key={h} className="border border-white/10 bg-white/5 px-2.5 py-1 rounded-sm text-white/40">{h}</span>
        ))}
      </div>
    </footer>
  );
}

// --- PANELES LATERALES ---

function MoonPhaseDetailPanel() {
  const today = useMemo(() => new Date(), []);
  const pd = useMemo(() => getMoonPhaseData(today), []);
  const nextPhases = useMemo(() => getNextPhases(today).slice(0, 4), []);
  const illuminationPct = Math.round(pd.fraction * 100);
  const { state } = useLunarContext();

  const moonR = 26;
  const path = moonPhasePath(pd.phase, moonR, state.hemisphere);
  const mono = 'var(--font-jetbrains, monospace)';

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="panel-label mb-2 px-1">Fase Lunar Hoy</div>
      {/* ── Tarjeta de Hoy ── */}
      <div className="rounded-xl border border-white/10 p-5 space-y-5 relative overflow-hidden bg-[#111]">
        {/* Resplandor de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none"
             style={{ background: state.primaryColor, transform: 'translate(30%, -30%)' }} />
        
        {/* Luna + Nombre */}
        <div className="flex items-center gap-5 relative z-10">
          <div className="relative shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <svg width={moonR*2} height={moonR*2} viewBox={`0 0 ${moonR*2} ${moonR*2}`}>
              <circle cx={moonR} cy={moonR} r={moonR} fill="#050505" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              <g transform={`translate(${moonR},${moonR})`}>
                <path d={path} fill={state.primaryColor} />
              </g>
            </svg>
          </div>
          <div>
            <div className="text-[9px] text-white/40 uppercase tracking-[0.25em] mb-1 font-bold" style={{ fontFamily: mono }}>
              Hoy
            </div>
            <div className="text-white text-sm font-bold uppercase tracking-[0.1em] leading-tight" style={{ fontFamily: mono }}>
              {pd.phaseName}
            </div>
            <div className="text-[9px] text-white/40 mt-1.5 uppercase tracking-wider" style={{ fontFamily: mono }}>
              {today.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Cuadrícula de estadísticas */}
        <div className="grid grid-cols-2 gap-2 relative z-10">
          {[
            { label: 'Iluminación', value: `${illuminationPct}%` },
            { label: 'Ciclo',       value: `${(pd.phase * 100).toFixed(0)}%` },
            { label: 'Ángulo',      value: `${pd.angle.toFixed(1)}°` },
            { label: 'Día',         value: `${MONTHS_ES_ABBR[today.getMonth()]} ${today.getDate()}` },
          ].map(s => (
            <div key={s.label} className="rounded-lg px-3 py-2 border border-white/5 bg-[#0a0a0a]">
              <div className="text-[8px] text-white/30 uppercase tracking-[0.2em] mb-1" style={{ fontFamily: mono }}>
                {s.label}
              </div>
              <div className="text-white text-xs font-bold" style={{ fontFamily: mono }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Barra de iluminación */}
        <div className="relative z-10">
          <div className="flex justify-between text-[8px] text-white/40 mb-1.5 font-bold tracking-widest" style={{ fontFamily: mono }}>
            <span>ILUMINACIÓN</span><span>{illuminationPct}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-700 rounded-full"
              style={{ width: `${illuminationPct}%`, background: state.primaryColor }} />
          </div>
        </div>
      </div>

      {/* ── Próximas Fases ── */}
      <div className="pt-2">
        <div className="panel-label mb-3 px-1">Próximas Fases</div>
        <div className="space-y-1.5">
          {nextPhases.map((p, i) => (
            <div key={i}
              className="flex items-center justify-between rounded-lg px-4 py-2.5 border border-white/5 bg-[#0c0c0c] hover:bg-[#151515] transition-colors cursor-default">
              <span className="text-white/80 text-[10px] uppercase tracking-wider" style={{ fontFamily: mono }}>{p.name}</span>
              <span className="text-white/40 text-[9px] font-mono tracking-widest">
                {p.date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignSection() {
  const { state, updateState } = useLunarContext();
  const mono = 'var(--font-jetbrains, monospace)';

  const setVal = (key: string, val: any) => updateState((prev: any) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <div>
        <div className="panel-label mb-4 px-1">Editor Lunar / Visual</div>
        
        {/* Selector de Disposición */}
        <div className="space-y-3 mb-6">
          <span className="text-[9px] text-white/40 uppercase tracking-widest" style={{ fontFamily: mono }}>Disposición</span>
          <div className="grid grid-cols-2 gap-2">
            {['ANUAL', 'MENSUAL', 'CIRCULAR', 'ESPIRAL'].map(l => (
              <button key={l} onClick={() => setVal('layout', l)}
                className={`py-1.5 rounded text-[9px] uppercase tracking-widest transition-all font-mono border
                ${state.layout === l ? 'bg-white text-black border-white font-bold' : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Transformación / Dimensiones */}
        <div className="space-y-4">
          <span className="text-[9px] text-white/40 uppercase tracking-widest" style={{ fontFamily: mono }}>Transformación</span>
          {[
            { key: 'moonSize', label: 'Tamaño Luna', min: 2, max: 20 },
            { key: 'padding', label: 'Espaciado', min: 2, max: 40 },
            { key: 'textSize', label: 'Tamaño Texto', min: 4, max: 24 },
            { key: 'glow', label: 'Resplandor (Glow)', min: 0, max: 20 },
          ].map(s => (
            <div key={s.key} className="space-y-2">
              <div className="flex justify-between text-[9px] font-mono text-white/60">
                <span className="uppercase tracking-wider">{s.label}</span>
                <span>{state[s.key]}</span>
              </div>
              <input type="range" min={s.min} max={s.max} value={state[s.key]}
                onChange={e => setVal(s.key, Number(e.target.value))}
                className="w-full h-1 custom-slider"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/10 w-full my-2" />

      {/* Opciones Adicionales */}
      <div className="space-y-3">
         <span className="text-[9px] text-white/40 uppercase tracking-widest" style={{ fontFamily: mono }}>Opciones del Lienzo</span>
         {[
           { key: 'starField', label: 'Campo Estelar' },
           { key: 'constellations', label: 'Constelaciones' },
           { key: 'gridOverlay', label: 'Fondo Punteado' },
           { key: 'showRuler', label: 'Reglas (Rulers)' }
         ].map(opt => (
           <div key={opt.key} className="flex justify-between items-center">
              <span className="text-[9px] font-mono text-white/70 uppercase tracking-wider">{opt.label}</span>
              <button onClick={() => setVal(opt.key, !state[opt.key])}
                className={`w-8 h-4 rounded-full p-0.5 transition-colors ${state[opt.key] ? 'bg-white' : 'bg-white/20'}`}>
                <div className={`w-3 h-3 rounded-full transition-transform ${state[opt.key] ? 'bg-black translate-x-4' : 'bg-black/50 translate-x-0'}`} />
              </button>
           </div>
         ))}
      </div>

      {/* Hemisferio */}
      <div className="pt-2">
         <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3" style={{ fontFamily: mono }}>Hemisferio</span>
         <div className="flex gap-2">
           <button onClick={() => setVal('hemisphere', 'N')}
             className={`flex-1 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest transition-all border
             ${state.hemisphere === 'N' ? 'bg-white text-black font-bold border-white' : 'bg-transparent text-white/40 border-white/10'}`}>
             Norte ↑
           </button>
           <button onClick={() => setVal('hemisphere', 'S')}
             className={`flex-1 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest transition-all border
             ${state.hemisphere === 'S' ? 'bg-white text-black font-bold border-white' : 'bg-transparent text-white/40 border-white/10'}`}>
             Sur ↓
           </button>
         </div>
      </div>
    </div>
  );
}

function PaletteSection() {
  const { state, updateState } = useLunarContext();
  const mono = 'var(--font-jetbrains, monospace)';

  const applyPalette = (paletteId: string) => {
    const p = COLOR_PALETTES.find(x => x.id === paletteId);
    if (!p) return;
    updateState((prev: any) => ({
      ...prev,
      activePalette: paletteId,
      bgColor: p.bg,
      primaryColor: p.moon,
      accentColor: p.accent,
      textColor: p.text,
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <div className="panel-label mb-3 px-1">Temas y Efectos</div>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_PALETTES.map(p => (
            <button key={p.id} onClick={() => applyPalette(p.id)}
              title={p.name}
              className="relative rounded-lg overflow-hidden transition-all flex flex-col items-center justify-center gap-2 group"
              style={{
                height: 60,
                background: p.bg,
                border: state.activePalette === p.id
                  ? '1px solid rgba(255,255,255,0.8)'
                  : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex gap-1.5 items-center">
                <div className="w-4 h-4 rounded-full shadow-lg" style={{ background: p.moon }} />
                <div className="w-2 h-2 rounded-full" style={{ background: p.accent }} />
              </div>
              <span className="text-[8px] uppercase tracking-widest font-mono opacity-60 group-hover:opacity-100" style={{color: p.text}}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/10 w-full my-2" />

      <div>
        <div className="panel-label mb-4 px-1">Colores Personalizados</div>
        <div className="space-y-4">
          {[
            { key: 'bgColor',      label: 'Fondo' },
            { key: 'primaryColor', label: 'Luna' },
            { key: 'accentColor',  label: 'Acento' },
            { key: 'textColor',    label: 'Bordes / Texto' },
          ].map(c => (
            <div key={c.key} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5">
              <span className="text-white/60 text-[9px] uppercase tracking-widest font-mono">
                {c.label}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-[9px] font-mono uppercase">
                  {state[c.key]}
                </span>
                <div className="relative w-6 h-6 rounded overflow-hidden border border-white/20">
                  <input type="color"
                    value={state[c.key]}
                    onChange={e => updateState((prev: any) => ({ ...prev, [c.key]: e.target.value }))}
                    className="absolute inset-0 w-10 h-10 -top-2 -left-2 cursor-pointer bg-transparent border-0 outline-0 p-0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PeriodoSection() {
  const { state, updateState } = useLunarContext();
  const { year, month } = state;
  const mono = 'var(--font-jetbrains, monospace)';

  const setYear  = (y: number) => updateState((prev: any) => ({ ...prev, year: y }));
  const setMonth = (m: number) => updateState((prev: any) => ({ ...prev, month: m }));

  const prevMonth = () => month === 1  ? updateState((prev: any) => ({ ...prev, month: 12, year: year - 1 })) : setMonth(month - 1);
  const nextMonth = () => month === 12 ? updateState((prev: any) => ({ ...prev, month:  1, year: year + 1 })) : setMonth(month + 1);

  return (
    <div className="space-y-6 text-xs animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ fontFamily: mono }}>
      <div className="panel-label mb-2 px-1" id="periodo-label">Selección (Periodo)</div>
      
      {/* Fila de Año */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-4" role="group" aria-labelledby="periodo-label">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Año</span>
          <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-white/10">
            <button onClick={() => setYear(year - 1)}
              aria-label="Año anterior"
              className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition">
              <ChevronLeft size={14} />
            </button>
            <span className="text-white font-bold w-12 text-center text-sm tracking-wider" aria-live="polite">{year}</span>
            <button onClick={() => setYear(year + 1)}
              aria-label="Año siguiente"
              className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Fila de Mes */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Mes</span>
          <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-white/10">
            <button onClick={prevMonth}
              aria-label="Mes anterior"
              className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition">
              <ChevronLeft size={14} />
            </button>
            <span className="text-white font-bold w-12 text-center text-[11px] tracking-wider" aria-live="polite">
              {MONTHS_ES_ABBR[month - 1]}
            </span>
            <button onClick={nextMonth}
              aria-label="Mes siguiente"
              className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/10 transition">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Selector de meses rápido */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2 px-1">Meses Visibles</span>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS_ES_ABBR.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className="py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition-all"
              style={{
                background: month === i + 1 ? '#ffffff' : 'rgba(255,255,255,0.05)',
                color:      month === i + 1 ? '#000'    : 'rgba(255,255,255,0.5)',
                fontWeight: month === i + 1 ? 700 : 400,
                border:     month === i + 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Años rápidos */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-2 px-1">Años Rápidos</span>
        <div className="flex gap-2">
          {[year - 1, year, year + 1, year + 2].map(y => (
            <button key={y} onClick={() => setYear(y)}
              className="flex-1 py-2 rounded-lg text-[10px] tracking-widest transition-all"
              style={{
                background: state.year === y ? '#fff' : 'rgba(255,255,255,0.05)',
                color:      state.year === y ? '#000' : 'rgba(255,255,255,0.5)',
                fontWeight: state.year === y ? 700 : 400,
                border:     state.year === y ? 'none' : '1px solid rgba(255,255,255,0.05)',
              }}>
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AstroToolsPanel() {
  const { state } = useLunarContext();
  const [targetPhase, setTargetPhase] = useState('Full Moon');
  const [result, setResult] = useState('');
  const today = new Date();
  
  const findNextPhase = async () => {
    const res = await fetch('/api/find-moon-phase', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phase: targetPhase, date: today.toISOString() })
    });
    const data = await res.json();
    setResult(JSON.stringify(data));
  };
  
  const phaseData = useMemo(() => getMoonPhaseData(today), []);
  const visibility = useMemo(() => calculateVisibility(state.year, today.getMonth()+1, today.getDate(), phaseData.phase), [phaseData.phase, state.year]);
  const huntingScore = useMemo(() => getHuntingFishingScore(phaseData.phase), [phaseData.phase]);
  const { accentColor, textColor } = state;
  const mono = 'var(--font-jetbrains, monospace)';

  const CELESTIAL_EVENTS = [
    { name: 'Eclipse Solar', emoji: '🌑', date: `${state.year}-08-12`, status: 'Próximo' },
    { name: 'Eclipse Lunar', emoji: '🌕', date: `${state.year}-03-03`, status: 'Pasado' },
    { name: 'Conj. Júpiter–Saturno', emoji: '✨', date: 'Hoy', status: 'En Vivo' },
    { name: 'Lluvia de Perseidas', emoji: '☄️', date: `${state.year}-08-12`, status: 'Próximo' },
  ];

  return (
    <div className="space-y-5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ color: textColor }}>
      <div className="panel-label px-1">Astronomía y Eventos</div>
      
      <div className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-3">
        <label className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Buscar Fase</label>
        <select onChange={(e) => setTargetPhase(e.target.value)} className="w-full bg-black text-white p-2 rounded border border-white/10 text-[10px]">
            <option>Full Moon</option>
            <option>New Moon</option>
            <option>First Quarter</option>
            <option>Last Quarter</option>
        </select>
        <button onClick={findNextPhase} className="w-full py-2 bg-white text-black font-bold font-mono text-[10px] rounded">Buscar</button>
        {result && <pre className="text-[8px] text-white/50">{result}</pre>}
      </div>

      {/* Puntuaciones */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111] border border-white/10 rounded-xl p-4 text-center">
          <Eye size={16} className="mx-auto mb-2" style={{ color: accentColor }} />
          <div className="font-mono text-xl font-bold" style={{ color: accentColor }}>{visibility}/10</div>
          <div className="text-[9px] text-white/40 uppercase tracking-widest mt-1" style={{ fontFamily: mono }}>Visibilidad</div>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-xl p-4 text-center">
          <Fish size={16} className="mx-auto mb-2" style={{ color: accentColor }} />
          <div className="font-mono text-sm font-bold flex items-center justify-center h-7" style={{ color: accentColor }}>{huntingScore.split(' ')[0]}</div>
          <div className="text-[9px] text-white/40 uppercase tracking-widest mt-1" style={{ fontFamily: mono }}>Caza / Pesca</div>
        </div>
      </div>

      {/* Descripción de la fase */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Moon size={14} style={{ color: accentColor }} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/60 font-bold">Almanaque Lunar</span>
        </div>
        <p className="text-white/50 text-[10px] leading-relaxed font-sans">
          {phaseData.phaseName} — {Math.round(phaseData.fraction * 100)}% iluminada.{' '}
          {phaseData.phase < 0.25 ? 'Mejor momento para observar estrellas con cielo despejado.' :
            phaseData.phase < 0.5 ? 'La luna sale tras el atardecer, buena observación nocturna.' :
            phaseData.phase < 0.75 ? 'Noches brillantes, ideal para fotografía nocturna.' :
            'Fase menguante, luna tardía — anocheceres oscuros y tranquilos.'}
        </p>
      </div>

      {/* Eventos Celestes */}
      <div>
        <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-3 px-1">
          Eventos Celestes
        </div>
        <div className="space-y-2">
          {CELESTIAL_EVENTS.map((ev, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">{ev.emoji}</span>
                <span className="text-[10px] text-white/80">{ev.name}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                  ev.status === 'En Vivo' ? 'bg-amber-300/20 text-amber-300 animate-pulse' :
                  ev.status === 'Próximo' ? 'bg-blue-400/15 text-blue-400' :
                  'bg-white/5 text-white/30'
                }`}>
                  {ev.status}
                </span>
                <span className="text-[8px] font-mono text-white/40">{ev.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL DEL LIENZO (CANVAS) ---

export function LunarCalendarSVG({ 
  state, scale, setScale, pan, setPan, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, month 
}: { 
  state: any, scale: number, setScale: any, pan: {x: number, y: number}, setPan: any, isDragging: boolean, 
  handleMouseDown: any, handleMouseMove: any, handleMouseUp: any, handleWheel: any, month?: number
}) {
  const { year, moonSize, padding, textSize, glow, primaryColor, textColor, hemisphere, showRuler } = state;
  const mono = 'var(--font-jetbrains, monospace)';

  const calendarData = useMemo(() => {
    const data: CalendarDay[][] = [];
    for (let m = 0; m < 12; m++) {
      const monthDays: CalendarDay[] = [];
      const days = getDaysInMonth(year, m + 1);
      for (let d = 1; d <= 31; d++) {
        const date = new Date(Date.UTC(year, m, d));
        const exists = date.getUTCMonth() === m;
        const phase = exists ? getMoonPhase(date) : 0;
        monthDays.push({
          exists,
          phase,
          isSpecialPhase: exists && (phase < 0.02 || phase > 0.98 || Math.abs(phase - 0.5) < 0.02)
        });
      }
      data.push(monthDays);
    }
    return data;
  }, [year]);

  if (state.layout === 'CIRCULAR' || state.layout === 'ESPIRAL') {
    const settings: CalendarSettings = {
      year: state.year,
      bgColor: state.bgColor,
      moonLitColor: state.primaryColor,
      moonDarkColor: '#050505',
      textColor: state.textColor,
      accentColor: state.accentColor,
      gridColor: state.textColor,
      bgPattern: state.starField ? 'stars' : 'none',
      language: 'es',
      hemisphere: state.hemisphere,
      showTitle: true,
      showSpecialPhases: true,
      moonStyle: 'flat',
      showGlow: state.glow > 0,
      titleFont: 'space-mono',
      bodyFont: 'mono'
    };
    return <RadialLayout settings={settings} calendarData={calendarData} isSpiral={state.layout === 'ESPIRAL'} />;
  }

  // Dimensiones calculadas de la matriz del calendario
  const cols = 31;
  const rows = 12;
  const cellW = moonSize * 2 + padding;
  const cellH = moonSize * 2 + padding;
  
  // Offset original del calendario para dar espacio a los textos laterales
  const startX = 80; 
  const startY = 80; 
  
  const contentWidth = startX + cols * cellW + padding;
  const contentHeight = startY + rows * cellH + padding;

  const moons = [];
  
  // Creación de matriz lunar
  for (let m = (month !== undefined ? month : 0); m < (month !== undefined ? month + 1 : 12); m++) {
    for (let d = 1; d <= 31; d++) {
      const date = new Date(Date.UTC(year, m, d));
      if (date.getUTCMonth() === m) {
        const phase = getMoonPhase(date);
        let cx, cy;
        if (state.layout === 'CIRCULAR') {
          // Calcular día del año para el ángulo
          const firstDay = new Date(Date.UTC(year, 0, 1));
          const dayOfYear = (date.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24);
          const angle = (dayOfYear / 365) * 2 * Math.PI - Math.PI / 2;
          const r = 150 + m * 20; // Radio basado en el mes
          cx = contentWidth / 2 + r * Math.cos(angle);
          cy = contentHeight / 2 + r * Math.sin(angle);
        } else {
          cx = startX + (d - 0.5) * cellW;
          cy = startY + (m + 0.5) * cellH;
        }
        
        moons.push({
          key: `${m}-${d}`,
          d,
          m,
          cx,
          cy,
          path: moonPhasePath(phase, moonSize, hemisphere),
          phase
        });
      }
    }
  }

  // Generación de Reglas (Rulers) si están activas
  const tickInterval = 50;
  const hTicksCount = Math.ceil(contentWidth / tickInterval) + 1;
  const vTicksCount = Math.ceil(contentHeight / tickInterval) + 1;

  return (
    <div 
      className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Widget Flotante del Canvas (Zoom/Exportar) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#111]/90 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 flex gap-5 items-center z-30 shadow-2xl transition-all cursor-default"
           onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <ZoomIn size={14} className="text-white/50" />
          <input type="range" min="0.2" max="4" step="0.1" value={scale} 
                 onChange={e => setScale(Number(e.target.value))} 
                 className="w-24 h-1 custom-slider" />
          <span className="text-[10px] font-mono text-white/50 w-8 text-right">{Math.round(scale * 100)}%</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex gap-1.5">
          {['SVG', 'PNG', 'JPG', 'PDF'].map(f => (
            <button key={f} className="text-[9px] font-bold bg-white/5 px-2 py-1 rounded text-white/70 hover:bg-white/20 hover:text-white transition uppercase tracking-widest border border-white/5">
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Contenedor Transformable (Pan & Zoom) */}
      <div 
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, 
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <svg 
          viewBox={`0 0 ${contentWidth} ${contentHeight}`} 
          width={contentWidth} 
          height={contentHeight} 
          style={{ fontFamily: mono }}
          className="drop-shadow-2xl overflow-visible"
        >
          <defs>
            <filter id="moonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={glow || 0.1} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Fondo Punteado (Dotted Grid) actualizado */}
            {state.gridOverlay && (
               <pattern id="dottedGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                 <circle cx="2" cy="2" r="1" fill={textColor} opacity="0.15" />
               </pattern>
            )}
          </defs>

          {/* Renderizado del Fondo Punteado que abarca todo el lienzo visible */}
          {state.gridOverlay && (
            <rect x={-500} y={-500} width={contentWidth + 1000} height={contentHeight + 1000} fill="url(#dottedGrid)" />
          )}

          {/* Reglas / Rulers integradas al lienzo */}
          {showRuler && (
            <g className="canvas-rulers" opacity="0.6">
              {/* Ejes principales */}
              <line x1="0" y1="0" x2={contentWidth} y2="0" stroke={textColor} strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="0" x2="0" y2={contentHeight} stroke={textColor} strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Ticks Superiores */}
              {Array.from({ length: hTicksCount }).map((_, i) => (
                <g key={`rx-${i}`} transform={`translate(${i * tickInterval}, 0)`}>
                  <line x1="0" y1="-5" x2="0" y2="0" stroke={textColor} strokeWidth="1" />
                  <text x="2" y="-8" fill={textColor} fontSize="8" fontFamily="monospace" opacity="0.8">{i * tickInterval}</text>
                </g>
              ))}
              
              {/* Ticks Izquierdos */}
              {Array.from({ length: vTicksCount }).map((_, i) => (
                <g key={`ry-${i}`} transform={`translate(0, ${i * tickInterval})`}>
                  <line x1="-5" y1="0" x2="0" y2="0" stroke={textColor} strokeWidth="1" />
                  <text x="-8" y="3" fill={textColor} fontSize="8" fontFamily="monospace" textAnchor="end" opacity="0.8">{i * tickInterval}</text>
                </g>
              ))}
            </g>
          )}

          {/* Título del Calendario */}
          <text x={startX - 15} y={35} fill={textColor} fontSize={textSize * 1.2} fontWeight="bold" letterSpacing="4" opacity="0.9">
            CALENDARIO LUNAR {year}
          </text>

          {/* Cabecera de Días (1 - 31) */}
          {[...Array(31)].map((_, i) => (
            <text key={`d-${i}`} 
                  x={startX + (i + 0.5) * cellW} 
                  y={startY - 10} 
                  textAnchor="middle" 
                  fill={textColor} 
                  fontSize={Math.max(6, textSize * 0.6)} 
                  fontWeight="bold"
                  opacity="0.5">
              {i + 1}
            </text>
          ))}

          {/* Etiquetas de Meses (ENERO, FEB...) */}
          {MONTHS_ES_ABBR.map((m, i) => (
            <text key={`m-${i}`} 
                  x={startX - 15} 
                  y={startY + (i + 0.5) * cellH + 2} 
                  textAnchor="end" 
                  fill={textColor} 
                  fontSize={Math.max(6, textSize * 0.7)} 
                  fontWeight="bold" 
                  letterSpacing="2"
                  opacity="0.8">
              {m}
            </text>
          ))}

          {/* Lunas (Mapeo completo del año) */}
          <g>
            {moons.map(moon => (
              <g key={moon.key} transform={`translate(${moon.cx}, ${moon.cy})`}>
                {/* Círculo base (sombra lunar) */}
                <circle r={moonSize} fill="#050505" stroke={primaryColor} strokeWidth={moon.phase > 0.98 ? 0 : 0.5} strokeOpacity="0.15" />
                
                {/* Parte iluminada, con validación para fases completas */}
                {moon.phase > 0.01 && moon.phase < 0.99 ? (
                  <path d={moon.path} fill={primaryColor} filter={glow > 0 ? "url(#moonGlow)" : ""} />
                ) : moon.phase >= 0.99 ? (
                  <circle r={moonSize} fill={primaryColor} filter={glow > 0 ? "url(#moonGlow)" : ""} />
                ) : null}
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function SeasonalPrintBatch({ state }: { state: any }) {
  return (
    <div id="print-seasonal" className="hidden">
      {MONTHS_FULL.map((_, m) => (
        <div key={m} className="page-break">
            <LunarCalendarSVG 
              state={state} 
              scale={1} 
              setScale={() => {}}
              pan={{x:0, y:0}} 
              setPan={() => {}}
              isDragging={false} 
              handleMouseDown={() => {}}
              handleMouseMove={() => {}}
              handleMouseUp={() => {}}
              handleWheel={() => {}}
              month={m}
            />
        </div>
      ))}
    </div>
  );
}

// --- APLICACIÓN PRINCIPAL ---

const DEFAULT_STATE = {
  year: 2026,
  month: 7, // 1-12
  layout: 'ANUAL', // ANUAL, MENSUAL, CIRCULAR
  activePalette: 'classic',
  bgColor: '#000000',
  primaryColor: '#ffffff',
  accentColor: '#ffffff',
  textColor: '#ffffff',
  hemisphere: 'N',
  moonSize: 8,
  padding: 14, // Ajustado a 14 por defecto para coincidir con la captura
  textSize: 10,
  glow: 0,
  blur: 0,
  starField: true,
  constellations: false,
  gridOverlay: true, // Fondo punteado activado por defecto
  showRuler: true,   // Reglas activadas por defecto
};

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [history, setHistory] = useState([DEFAULT_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [activeTab, setActiveTab] = useState('design'); // fase, diseño, paleta, astro, periodo
  const [appMode, setAppMode] = useState('calendar'); // calendar, canvas

  // Estado para Panning (Moverse) y Zooming - MOVED HERE
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Eventos del ratón para hacer Pan - MOVED HERE
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Evento de Rueda para Zoom - MOVED HERE
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.002;
    const newScale = Math.min(Math.max(0.2, scale - e.deltaY * zoomSensitivity), 4);
    setScale(newScale);
  };

  // Sistema de historial (Deshacer/Rehacer)
  const updateState = (updater: any) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(next);
      // Límite de 20 estados para memoria
      if (newHistory.length > 20) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return next;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setState(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setState(history[historyIndex + 1]);
    }
  };

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const TABS = [
    { id: 'phase', icon: Moon, title: 'Fase' },
    { id: 'period', icon: CalendarDays, title: 'Periodo' },
    { id: 'design', icon: SlidersVertical, title: 'Editor Lunar' },
    { id: 'editorpro', icon: Zap, title: 'Editor Pro' },
    { id: 'palette', icon: Palette, title: 'Colores' },
    { id: 'astro', icon: Star, title: 'Astronomía' },
  ];

  return (
    <LunarContext.Provider value={{
      state, updateState,
      undo, redo, canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1,
      scale, setScale, pan, setPan
    }}>
      <style>{GLOBAL_STYLES}</style>
      
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white font-sans selection:bg-white/20">
        <TopToolbar mode={appMode} onModeChange={setAppMode} />
        
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Panel Lateral Izquierdo */}
          <aside className="flex h-full border-r border-white/10 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20" 
                 style={{ width: '300px', backgroundColor: '#0a0a0a' }}>
            
            {/* Tira de Iconos de Navegación */}
            <nav className="w-[52px] flex flex-col items-center pt-5 pb-3 gap-2 shrink-0 border-r border-white/10 bg-[#050505]">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative group"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                    }}
                    title={tab.title}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />}
                  </button>
                )
              })}
            </nav>

            {/* Contenido del Panel Activo */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#0a0a0a]">
              {activeTab === 'phase' && <MoonPhaseDetailPanel />}
              {activeTab === 'design' && <DesignSection />}
              {activeTab === 'editorpro' && <EditorProSection />}
              {activeTab === 'palette' && <PaletteSection />}
              {activeTab === 'period' && <PeriodoSection />}
              {activeTab === 'astro' && <AstroToolsPanel />}
            </div>
          </aside>

          {/* Área Principal del Lienzo */}
          <main className="flex-1 relative overflow-hidden flex flex-col" style={{ background: state.bgColor }}>
            {/* Viñeteado sutil de fondo */}
            <div className="absolute inset-0 pointer-events-none z-10" 
                 style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.8) 150%)' }} />
            
            <Starfield />
            
            <LunarCalendarSVG 
              state={state} 
              scale={scale} 
              setScale={setScale}
              pan={pan} 
              setPan={setPan}
              isDragging={isDragging} 
              handleMouseDown={handleMouseDown} 
              handleMouseMove={handleMouseMove} 
              handleMouseUp={handleMouseUp} 
              handleWheel={handleWheel}
            />
            
            <div className="absolute bottom-5 right-5 flex gap-2 z-30 bg-[#050505] p-2 rounded-lg border border-white/10">
                <button onClick={() => { setScale(1); setPan({x: 0, y: 0}); }} className="p-2 text-white/60 hover:text-white transition" title="Reset Zoom">
                    <Focus size={16} />
                </button>
                <button onClick={() => setPan({x: 0, y: 0})} className="p-2 text-white/60 hover:text-white transition" title="Snap to Center">
                    <ZoomIn size={16} />
                </button>
            </div>
            
            <SeasonalPrintBatch state={state} />
            
          </main>
        </div>

        <BottomBar />
      </div>
    </LunarContext.Provider>
  );
}
