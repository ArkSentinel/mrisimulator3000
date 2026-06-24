import { useCallback } from 'react';

interface WindowLevelSliderProps {
  wc: number;
  ww: number;
  onChange: (wc: number, ww: number) => void;
}

export function WindowLevelSlider({ wc, ww, onChange }: WindowLevelSliderProps) {
  const handleWcChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value), ww);
    },
    [ww, onChange]
  );

  const handleWwChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(wc, parseInt(e.target.value));
    },
    [wc, onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-gray-400 w-12">WC</label>
        <input
          type="range"
          min="0"
          max="255"
          value={wc}
          onChange={handleWcChange}
          className="flex-1 h-1 bg-slate-700 appearance-none cursor-pointer"
        />
        <span className="text-[10px] text-gray-300 w-8 text-right">{wc}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-gray-400 w-12">WW</label>
        <input
          type="range"
          min="1"
          max="255"
          value={ww}
          onChange={handleWwChange}
          className="flex-1 h-1 bg-slate-700 appearance-none cursor-pointer"
        />
        <span className="text-[10px] text-gray-300 w-8 text-right">{ww}</span>
      </div>
    </div>
  );
}
