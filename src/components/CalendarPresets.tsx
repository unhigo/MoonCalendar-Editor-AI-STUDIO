/**
 * Calendar preset templates for quick creation
 */

import React from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Moon, 
  Star, 
  Heart,
  Zap,
  Users,
  Gift
} from 'lucide-react';

export interface CalendarPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  config: {
    layout: string;
    bgColor: string;
    primaryColor: string;
    accentColor: string;
    textColor: string;
    moonSize: number;
    glow: number;
    starField: boolean;
    gridOverlay: boolean;
  };
}

export const CALENDAR_PRESETS: CalendarPreset[] = [
  {
    id: 'classic',
    name: 'Classic Mono',
    description: 'Timeless black and white design',
    icon: <BookOpen size={18} />,
    config: {
      layout: 'ANUAL',
      bgColor: '#000000',
      primaryColor: '#ffffff',
      accentColor: '#ffffff',
      textColor: '#ffffff',
      moonSize: 8,
      glow: 0,
      starField: false,
      gridOverlay: true,
    },
  },
  {
    id: 'mystical',
    name: 'Mystical Purple',
    description: 'Enchanted mystical vibes',
    icon: <Sparkles size={18} />,
    config: {
      layout: 'CIRCULAR',
      bgColor: '#1a0b2e',
      primaryColor: '#c77dff',
      accentColor: '#e0aaff',
      textColor: '#e0aaff',
      moonSize: 6,
      glow: 8,
      starField: true,
      gridOverlay: false,
    },
  },
  {
    id: 'moonlight',
    name: 'Moonlight Blue',
    description: 'Cool night sky aesthetic',
    icon: <Moon size={18} />,
    config: {
      layout: 'ANUAL',
      bgColor: '#0a1428',
      primaryColor: '#90e0ef',
      accentColor: '#00b4d8',
      textColor: '#90e0ef',
      moonSize: 7,
      glow: 5,
      starField: true,
      gridOverlay: true,
    },
  },
  {
    id: 'celestial',
    name: 'Celestial Gold',
    description: 'Luxurious golden night',
    icon: <Star size={18} />,
    config: {
      layout: 'CIRCULAR',
      bgColor: '#0f0f0a',
      primaryColor: '#fbbf24',
      accentColor: '#f59e0b',
      textColor: '#fde68a',
      moonSize: 8,
      glow: 12,
      starField: true,
      gridOverlay: false,
    },
  },
  {
    id: 'romantic',
    name: 'Romantic Pink',
    description: 'Soft romantic design',
    icon: <Heart size={18} />,
    config: {
      layout: 'ESPIRAL',
      bgColor: '#2d1b2e',
      primaryColor: '#ff6b9d',
      accentColor: '#ffc0cb',
      textColor: '#ffc0cb',
      moonSize: 6,
      glow: 10,
      starField: false,
      gridOverlay: false,
    },
  },
  {
    id: 'neon',
    name: 'Neon Cyberpunk',
    description: 'Futuristic neon style',
    icon: <Zap size={18} />,
    config: {
      layout: 'ANUAL',
      bgColor: '#0d0221',
      primaryColor: '#3a86ff',
      accentColor: '#8338ec',
      textColor: '#3a86ff',
      moonSize: 9,
      glow: 15,
      starField: true,
      gridOverlay: true,
    },
  },
  {
    id: 'social',
    name: 'Social Sharing',
    description: 'Optimized for Instagram',
    icon: <Users size={18} />,
    config: {
      layout: 'CIRCULAR',
      bgColor: '#1a1a1a',
      primaryColor: '#ff006e',
      accentColor: '#ffbe0b',
      textColor: '#ffffff',
      moonSize: 10,
      glow: 8,
      starField: true,
      gridOverlay: false,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Chic',
    description: 'Clean and simple',
    icon: <Gift size={18} />,
    config: {
      layout: 'MENSUAL',
      bgColor: '#ffffff',
      primaryColor: '#1f1f1f',
      accentColor: '#d4af37',
      textColor: '#1f1f1f',
      moonSize: 5,
      glow: 0,
      starField: false,
      gridOverlay: false,
    },
  },
];

interface CalendarPresetsProps {
  onPresetSelect: (config: CalendarPreset['config']) => void;
}

export const CalendarPresetsPanel: React.FC<CalendarPresetsProps> = ({
  onPresetSelect,
}) => {
  return (
    <div className="space-y-3">
      <div className="panel-label mb-3 px-1">Preset Templates</div>
      <div className="grid grid-cols-2 gap-2">
        {CALENDAR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset.config)}
            className="relative rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-white/30 hover:bg-white/10 group"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-white/70 group-hover:text-white transition">
                {preset.icon}
              </span>
            </div>
            <div className="text-[9px] font-mono text-white/60 uppercase tracking-wider">
              {preset.name}
            </div>
            <div className="text-[7px] text-white/40 mt-1 line-clamp-1">
              {preset.description}
            </div>
            {/* Color preview */}
            <div className="flex gap-1 mt-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: preset.config.bgColor }}
              />
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: preset.config.primaryColor }}
              />
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: preset.config.accentColor }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
