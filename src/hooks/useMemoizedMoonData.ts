/**
 * Performance-optimized hook for calculating moon data
 * Uses memoization and workers-like patterns
 */

import { useMemo, useCallback } from 'react';
import { getMoonPhase, getMoonPhaseData, moonPhasePath } from '@/src/lib/moonPhase';
import type { CalendarDay } from '@/src/types';

interface UseMemoizedMoonDataOptions {
  year: number;
  hemisphere: 'N' | 'S';
  moonSize: number;
  primaryColor: string;
}

/**
 * Memoizes moon phase calculations for all days in a year
 */
export function useMemoizedYearMoonData(year: number) {
  return useMemo(() => {
    const data: CalendarDay[][] = [];

    for (let m = 0; m < 12; m++) {
      const monthDays: CalendarDay[] = [];
      const daysInMonth = new Date(year, m + 1, 0).getDate();

      for (let d = 1; d <= 31; d++) {
        const date = new Date(Date.UTC(year, m, d));
        const exists = date.getUTCMonth() === m;
        const phase = exists ? getMoonPhase(date) : 0;

        monthDays.push({
          exists,
          phase,
          isSpecialPhase:
            exists && (phase < 0.02 || phase > 0.98 || Math.abs(phase - 0.5) < 0.02),
        });
      }

      data.push(monthDays);
    }

    return data;
  }, [year]);
}

/**
 * Memoizes moon phase paths for rendering
 */
export function useMemoizedMoonPaths(
  phase: number,
  moonSize: number,
  hemisphere: 'N' | 'S'
) {
  return useMemo(() => {
    return moonPhasePath(phase, moonSize, hemisphere);
  }, [phase, moonSize, hemisphere]);
}

/**
 * Calculates visible moons within a range for performance
 */
export function useVisibleMoons(
  calendarData: CalendarDay[][],
  year: number,
  viewportSize: number = 1000,
  scale: number = 1,
  pan: { x: number; y: number }
) {
  return useMemo(() => {
    // Calculate which moons are visible in the current viewport
    const visibleMoons: Array<{
      monthIndex: number;
      dayIndex: number;
      x: number;
      y: number;
    }> = [];

    const cx = viewportSize / 2;
    const cy = viewportSize / 2;

    calendarData.forEach((month, mi) => {
      month.forEach((day, di) => {
        if (!day.exists) return;

        // Rough calculation - would be more precise in actual rendering
        const angle = ((mi + 1) / 12) * 2 * Math.PI - Math.PI / 2;
        const r = 70 + mi * 27;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        // Check if within viewport (with padding)
        const screenX = (x + pan.x) * scale;
        const screenY = (y + pan.y) * scale;

        if (
          screenX > -100 &&
          screenX < viewportSize + 100 &&
          screenY > -100 &&
          screenY < viewportSize + 100
        ) {
          visibleMoons.push({ monthIndex: mi, dayIndex: di, x, y });
        }
      });
    });

    return visibleMoons;
  }, [calendarData, year, viewportSize, scale, pan.x, pan.y]);
}

/**
 * Debounced state updater for performance during animations
 */
export function useDebouncedUpdate(
  updateFn: (value: any) => void,
  delay: number = 100
) {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const debouncedUpdate = useCallback(
    (value: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        updateFn(value);
      }, delay);
    },
    [updateFn, delay]
  );

  return debouncedUpdate;
}

import React from 'react';
