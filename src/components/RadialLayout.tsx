import React, { useMemo } from 'react';
import type { CalendarSettings, CalendarDay } from '@/src/types';
import { MONTH_SHORT } from '@/src/constants';
import { moonPhasePath } from '../lib/moonPhase'; // Fixed import
import { getDaysInMonth, generateStars } from '@/src/utils';

interface Props {
  settings: CalendarSettings;
  calendarData: CalendarDay[][];
  isSpiral?: boolean;
}

const RadialLayout: React.FC<Props> = ({ settings, calendarData, isSpiral = false }) => {
  const {
    bgColor, moonLitColor, moonDarkColor, textColor, accentColor, gridColor,
    bgPattern, year, language, hemisphere, showTitle, showSpecialPhases, moonStyle, showGlow,
  } = settings;

  const svgSize = 900;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const innerR = 70;
  const outerR = 390;
  const ringW = (outerR - innerR) / 12;

  const titleFont = settings.titleFont === 'cinzel' ? 'Cinzel, serif' : 'Space Mono, monospace';
  const bodyFont = settings.bodyFont === 'mono' ? 'Space Mono, monospace' : 'Inter, sans-serif';

  const monthLabels = MONTH_SHORT[language] || MONTH_SHORT['es'];

  const moonR = Math.min(8, ringW * 0.4);

  const stars = useMemo(
    () => bgPattern === 'stars' ? generateStars(svgSize, svgSize, 300) : [],
    [bgPattern]
  );

  // Angle for day d in month (1-31), day of year doy (1-365)
  const dayAngle = (d: number, totalDays: number, doy?: number) => {
    if (isSpiral && doy) {
      return (doy / 365.25) * 2 * Math.PI - Math.PI / 2;
    }
    return ((d - 0.5) / totalDays) * 2 * Math.PI - Math.PI / 2;
  };

  // Radius for month m (1-12) or day of year doy
  const getRadius = (m: number, doy: number) => {
    if (isSpiral) {
      return innerR + (doy / 365.25) * (outerR - innerR);
    }
    return innerR + (m - 0.5) * ringW;
  };

  return (
    <svg
      id="calendar-svg"
      width={svgSize} height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        {showGlow && (
          <filter id="mglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        <radialGradient id="bgRad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.05" />
          <stop offset="100%" stopColor={bgColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width={svgSize} height={svgSize} fill={bgColor} />
      <rect width={svgSize} height={svgSize} fill="url(#bgRad)" />

      {/* Stars */}
      {bgPattern === 'stars' && stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={textColor} opacity={s.opacity * 0.35} />
      ))}

      {/* Dividers */}
      {!isSpiral && Array.from({ length: 13 }, (_, i) => {
        const rr = innerR + i * ringW;
        return (
          <circle key={i} cx={cx} cy={cy} r={rr}
            fill="none" stroke={gridColor} strokeWidth={0.5} opacity={0.5}
          />
        );
      })}

      {/* Radial spoke dividers */}
      {!isSpiral && Array.from({ length: 31 }, (_, d) => {
        const angle = (d / 31) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={d}
            x1={cx + innerR * Math.cos(angle)} y1={cy + innerR * Math.sin(angle)}
            x2={cx + outerR * Math.cos(angle)} y2={cy + outerR * Math.sin(angle)}
            stroke={gridColor} strokeWidth={0.3} opacity={0.35}
          />
        );
      })}

      {/* Moon phase icons */}
      {(() => {
        let doy = 0;
        return calendarData.map((monthDays, mi) => {
          const m = mi + 1;
          const daysInMonth = getDaysInMonth(year, m);

          return (
            <g key={mi}>
              {monthDays.slice(0, daysInMonth).map((day, di) => {
                doy++;
                if (!day.exists) return null;
                const angle = dayAngle(di + 1, daysInMonth, doy);
                const r = getRadius(m, doy);
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                const litPath = moonPhasePath(day.phase, moonR, hemisphere);

                return (
                  <g key={di} transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}>
                    {showSpecialPhases && day.isSpecialPhase && (
                      <circle cx={0} cy={0} r={moonR + 2} fill="none" stroke={accentColor} strokeWidth={0.7} opacity={0.65} />
                    )}
                    <circle cx={0} cy={0} r={moonR} fill={moonDarkColor} />
                    {litPath && (
                      <path d={litPath} fill={moonLitColor}
                        filter={showGlow ? 'url(#mglow)' : undefined}
                        opacity={moonStyle === 'flat' ? 0.9 : 1}
                      />
                    )}
                    {moonStyle === 'outline' && (
                      <>
                        <circle cx={0} cy={0} r={moonR} fill="none" stroke={moonLitColor} strokeWidth={0.5} opacity={0.3} />
                        {litPath && <path d={litPath} fill="none" stroke={moonLitColor} strokeWidth={0.7} />}
                      </>
                    )}
                  </g>
                );
              })}

              {/* Month label */}
              {!isSpiral && (() => {
                const mAngle = ((mi) / 12) * 2 * Math.PI - Math.PI / 2;
                const mlx = cx + (outerR + 20) * Math.cos(mAngle);
                const mly = cy + (outerR + 20) * Math.sin(mAngle);
                return (
                  <text
                    key={`label-${mi}`}
                    x={mlx} y={mly}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={textColor} fontSize={7} fontFamily={bodyFont}
                    fontWeight="600" letterSpacing="0.5" opacity={0.75}
                  >
                    {monthLabels[mi]}
                  </text>
                );
              })()}
            </g>
          );
        });
      })()}

      {/* Day number labels */}
      {!isSpiral && [1, 5, 10, 15, 20, 25, 31].map(d => {
        const angle = dayAngle(d, 31);
        const lr = outerR + 8;
        return (
          <text
            key={d}
            x={cx + lr * Math.cos(angle)} y={cy + lr * Math.sin(angle)}
            textAnchor="middle" dominantBaseline="middle"
            fill={textColor} fontSize={6} fontFamily={bodyFont} opacity={0.5}
          >
            {d}
          </text>
        );
      })}

      {/* Center decoration */}
      <circle cx={cx} cy={cy} r={innerR - 4} fill={bgColor} />
      <circle cx={cx} cy={cy} r={innerR - 6} fill="none" stroke={accentColor} strokeWidth={0.5} opacity={0.3} />
      {showTitle && (
        <>
          <text x={cx} y={cy - 10} textAnchor="middle"
            fill={accentColor} fontSize={9} fontFamily={titleFont} letterSpacing="2" opacity={0.85}
          >
            {isSpiral ? 'ESPIRAL' : 'LUNAR'}
          </text>
          <text x={cx} y={cy + 5} textAnchor="middle"
            fill={textColor} fontSize={14} fontFamily={titleFont} fontWeight="600" letterSpacing="1"
          >
            {year}
          </text>
        </>
      )}
    </svg>
  );
};

export default RadialLayout;
