import { Trash2, SkipForward, Square, Pause, Play, Copy } from 'lucide-react';

interface ControlButtonsProps {
  onDelete: () => void;
  onSkip: () => void;
  onStop: () => void;
  onPause: () => void;
  onContinue: () => void;
  onCopyGo: () => void;
}

export function ControlButtons({
  onDelete,
  onSkip,
  onStop,
  onPause,
  onContinue,
  onCopyGo,
}: ControlButtonsProps) {
  const btnClass = 'flex items-center justify-center w-8 h-8 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 transition-colors';
  const iconClass = 'w-4 h-4';

  return (
    <div className="flex items-center gap-1">
      <button onClick={onDelete} className={btnClass} title="Delete">
        <Trash2 className={iconClass} />
      </button>
      <button onClick={onSkip} className={btnClass} title="Skip">
        <SkipForward className={iconClass} />
      </button>
      <button onClick={onStop} className={btnClass} title="Stop">
        <Square className={iconClass} />
      </button>
      <button onClick={onPause} className={btnClass} title="Pause">
        <Pause className={iconClass} />
      </button>
      <button onClick={onContinue} className={btnClass} title="Continue">
        <Play className={iconClass} />
      </button>

      <div className="flex-1" />

      <button
        onClick={onCopyGo}
        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Copy&Go</span>
      </button>
    </div>
  );
}