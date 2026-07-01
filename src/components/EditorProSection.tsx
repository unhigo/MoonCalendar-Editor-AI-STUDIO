import React from 'react';
import { useLunarContext } from '../context';

export function EditorProSection() {
  const { state, updateState, scale, setScale, pan, setPan } = useLunarContext();
  
  const setVal = (key: string, val: any) => updateState((prev: any) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="panel-label mb-4 px-1">Editor Profesional</div>
        <div className="space-y-4">
            <div className="bg-white/5 p-3 rounded-lg space-y-3">
                <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono">Filtros Visuales</span>
                <select value={state.filter} onChange={(e) => setVal('filter', e.target.value)} className="w-full bg-black text-white p-2 rounded border border-white/10 text-[10px]">
                    <option value="none">Sin Filtro</option>
                    <option value="grayscale">Escala de Grises</option>
                    <option value="sepia">Sepia</option>
                </select>
            </div>
            
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono">Modo Alto Contraste</span>
                <button onClick={() => setVal('highContrast', !state.highContrast)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${state.highContrast ? 'bg-white' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 rounded-full transition-transform ${state.highContrast ? 'bg-black translate-x-5' : 'bg-black/50 translate-x-0'}`} />
                </button>
            </div>
            
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono">Mostrar Etiquetas</span>
                <button onClick={() => setVal('showLabels', !state.showLabels)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${state.showLabels ? 'bg-white' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 rounded-full transition-transform ${state.showLabels ? 'bg-black translate-x-5' : 'bg-black/50 translate-x-0'}`} />
                </button>
            </div>
            
            <div className="bg-white/5 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                    <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono">Zoom</span>
                    <span className="text-[10px] text-white/50">{Math.round(scale * 100)}%</span>
                </div>
                <input type="range" min="0.2" max="4" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="bg-white/5 p-3 rounded-lg space-y-2">
                <button onClick={() => window.print()} className="w-full py-2 bg-white text-black font-bold font-mono text-[10px] rounded hover:bg-white/80 transition">
                    Imprimir Calendario
                </button>
                <button onClick={() => window.print()} className="w-full py-2 bg-white/10 text-white font-bold font-mono text-[10px] rounded hover:bg-white/20 transition">
                    Imprimir Serie Estacional
                </button>
            </div>
        </div>
    </div>
  );
}
