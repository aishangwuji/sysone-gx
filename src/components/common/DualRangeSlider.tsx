import React, { useRef, useCallback, useState } from 'react';

interface DualRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  disabled?: boolean;
  className?: string;
  unit?: string;
}

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min = 0,
  max = 1,
  step = 0.05,
  value,
  onChange,
  disabled = false,
  className = '',
  unit = ''
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | 'range' | null>(null);
  const dragStartRef = useRef<{ clientX: number; startVal: [number, number] }>({ clientX: 0, startVal: [0, 0] });

  // Clamp and ensure minVal <= maxVal
  const minVal = Math.max(min, Math.min(value[0], value[1] - step));
  const maxVal = Math.min(max, Math.max(value[1], value[0] + step));

  const getPercentage = useCallback((val: number) => {
    return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  }, [min, max]);

  const getValueFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawVal = min + ratio * (max - min);
    // Snap to step
    const stepped = Math.round(rawVal / step) * step;
    return Number(Math.max(min, Math.min(max, stepped)).toFixed(2));
  }, [min, max, step]);

  const handlePointerDownThumb = (e: React.PointerEvent, handle: 'min' | 'max') => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(handle);
  };

  const handlePointerDownRange = (e: React.PointerEvent) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging('range');
    dragStartRef.current = {
      clientX: e.clientX,
      startVal: [minVal, maxVal]
    };
  };

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (disabled || dragging) return;
    const clickVal = getValueFromClientX(e.clientX);
    const distMin = Math.abs(clickVal - minVal);
    const distMax = Math.abs(clickVal - maxVal);

    if (distMin <= distMax) {
      const nextMin = Math.min(clickVal, maxVal - step);
      onChange([nextMin, maxVal]);
    } else {
      const nextMax = Math.max(clickVal, minVal + step);
      onChange([minVal, nextMax]);
    }
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || disabled) return;

    if (dragging === 'min') {
      const newVal = getValueFromClientX(e.clientX);
      const safeMin = Math.min(newVal, maxVal - step);
      onChange([safeMin, maxVal]);
    } else if (dragging === 'max') {
      const newVal = getValueFromClientX(e.clientX);
      const safeMax = Math.max(newVal, minVal + step);
      onChange([minVal, safeMax]);
    } else if (dragging === 'range' && trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaVal = (deltaX / rect.width) * (max - min);
      const steppedDelta = Math.round(deltaVal / step) * step;

      const span = dragStartRef.current.startVal[1] - dragStartRef.current.startVal[0];
      let nextMin = Number((dragStartRef.current.startVal[0] + steppedDelta).toFixed(2));
      let nextMax = Number((nextMin + span).toFixed(2));

      if (nextMin < min) {
        nextMin = min;
        nextMax = Number((min + span).toFixed(2));
      } else if (nextMax > max) {
        nextMax = max;
        nextMin = Number((max - span).toFixed(2));
      }

      onChange([nextMin, nextMax]);
    }
  }, [dragging, disabled, getValueFromClientX, maxVal, minVal, step, onChange, max, min]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragging(null);
    }
  }, [dragging]);

  const leftPercent = getPercentage(minVal);
  const rightPercent = getPercentage(maxVal);

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Slider Track Area */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-8 flex items-center cursor-pointer touch-none"
      >
        {/* Background track */}
        <div className="absolute w-full h-2 bg-gray-800 rounded-full border border-gray-700/60 overflow-hidden">
          {/* Subtle tick marks for 25%, 50%, 75% */}
          <div className="absolute left-[25%] top-0 bottom-0 w-[1px] bg-gray-700/40" />
          <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-gray-700/50" />
          <div className="absolute left-[75%] top-0 bottom-0 w-[1px] bg-gray-700/40" />
        </div>

        {/* Selected Middle Range Highlight Bar */}
        <div
          onPointerDown={handlePointerDownRange}
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(0, rightPercent - leftPercent)}%`
          }}
          className={`absolute h-2 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-colors ${
            dragging === 'range' ? 'brightness-125 cursor-grabbing' : 'cursor-grab'
          }`}
          title="可按住拖拽移动整个中间区间"
        />

        {/* Min Thumb (Left Handle) */}
        <div
          style={{ left: `${leftPercent}%` }}
          onPointerDown={(e) => handlePointerDownThumb(e, 'min')}
          className="absolute -translate-x-1/2 z-10 flex flex-col items-center group cursor-ew-resize"
        >
          <div
            className={`w-4 h-4 rounded-full bg-amber-400 border-2 border-[#12141C] shadow-md transition-transform duration-75 flex items-center justify-center ${
              dragging === 'min' ? 'scale-125 ring-4 ring-amber-500/30' : 'group-hover:scale-110'
            }`}
          >
            <div className="w-1 h-1 bg-[#12141C] rounded-full" />
          </div>
          <span className="absolute -top-6 text-[10px] font-mono font-bold text-amber-400 bg-black/80 px-1.5 py-0.5 rounded border border-amber-500/30 shadow whitespace-nowrap opacity-90 group-hover:opacity-100">
            {minVal.toFixed(2)}{unit}
          </span>
        </div>

        {/* Max Thumb (Right Handle) */}
        <div
          style={{ left: `${rightPercent}%` }}
          onPointerDown={(e) => handlePointerDownThumb(e, 'max')}
          className="absolute -translate-x-1/2 z-10 flex flex-col items-center group cursor-ew-resize"
        >
          <div
            className={`w-4 h-4 rounded-full bg-amber-400 border-2 border-[#12141C] shadow-md transition-transform duration-75 flex items-center justify-center ${
              dragging === 'max' ? 'scale-125 ring-4 ring-amber-500/30' : 'group-hover:scale-110'
            }`}
          >
            <div className="w-1 h-1 bg-[#12141C] rounded-full" />
          </div>
          <span className="absolute -top-6 text-[10px] font-mono font-bold text-amber-400 bg-black/80 px-1.5 py-0.5 rounded border border-amber-500/30 shadow whitespace-nowrap opacity-90 group-hover:opacity-100">
            {maxVal.toFixed(2)}{unit}
          </span>
        </div>
      </div>

      {/* Numerical Indicators & Presets Bar */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-800/80">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-medium">区间:</span>
          <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            [{minVal.toFixed(2)} ~ {maxVal.toFixed(2)}]
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            ({Math.round(minVal * 100)}% - {Math.round(maxVal * 100)}%)
          </span>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange([0.30, 0.70])}
            className="px-1.5 py-0.5 text-[10px] rounded bg-gray-800 text-gray-300 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-gray-700/60 transition-colors"
            title="经典模糊判定带 [0.30 ~ 0.70]"
          >
            0.3-0.7
          </button>
          <button
            type="button"
            onClick={() => onChange([0.20, 0.60])}
            className="px-1.5 py-0.5 text-[10px] rounded bg-gray-800 text-gray-300 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-gray-700/60 transition-colors"
            title="宽容带 [0.20 ~ 0.60]"
          >
            0.2-0.6
          </button>
          <button
            type="button"
            onClick={() => onChange([0.00, 0.50])}
            className="px-1.5 py-0.5 text-[10px] rounded bg-gray-800 text-gray-300 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-gray-700/60 transition-colors"
            title="半数低置信度 [0.00 ~ 0.50]"
          >
            0-0.5
          </button>
        </div>
      </div>
    </div>
  );
};
