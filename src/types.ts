export interface CalendarSettings {
  year: number;
  bgColor: string;
  moonLitColor: string;
  moonDarkColor: string;
  textColor: string;
  accentColor: string;
  gridColor: string;
  bgPattern: string;
  language: string;
  hemisphere: 'N' | 'S';
  showTitle: boolean;
  showSpecialPhases: boolean;
  moonStyle: 'flat' | 'outline';
  showGlow: boolean;
  titleFont: string;
  bodyFont: string;
  highContrast: boolean;
  filter: 'none' | 'grayscale' | 'sepia';
  showLabels: boolean;
}

export interface CalendarDay {
  exists: boolean;
  phase: number;
  isSpecialPhase: boolean;
}
