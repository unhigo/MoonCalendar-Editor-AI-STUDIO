/**
 * Development performance monitoring component
 */

import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage?: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let lastFpsTime = performance.now();
    let animationId: number;

    const measureFrame = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastFpsTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastFpsTime));
        const renderTime = currentTime - lastTime;

        setMetrics({
          fps,
          renderTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize
            ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
            : undefined,
        });

        frameCount = 0;
        lastFpsTime = currentTime;
      }

      lastTime = currentTime;
      animationId = requestAnimationFrame(measureFrame);
    };

    animationId = requestAnimationFrame(measureFrame);

    return () => cancelAnimationFrame(animationId);
  }, [enabled]);

  if (!enabled) return null;

  const fpsColor =
    metrics.fps >= 50 ? '#22c55e' : metrics.fps >= 30 ? '#eab308' : '#ef4444';

  return (
    <div
      className="fixed bottom-20 right-4 z-50 transition-all"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        onClick={() => setVisible(!visible)}
        className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center hover:border-white/40 transition text-white"
      >
        <Activity size={16} />
      </button>

      {visible && (
        <div className="absolute bottom-12 right-0 bg-black/80 border border-white/10 rounded-lg p-3 text-[10px] font-mono text-white/70 space-y-1 min-w-[150px] backdrop-blur">
          <div>
            FPS: <span style={{ color: fpsColor }}>{metrics.fps}</span>
          </div>
          <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
          {metrics.memoryUsage && <div>Memory: {metrics.memoryUsage}MB</div>}
        </div>
      )}
    </div>
  );
};
