import { useProjectStore } from "../../stores/projectStore";
import "./Preview.css";

interface PreviewProps {
  className?: string;
}

export function Preview({ className = "" }: PreviewProps) {
  const currentTime = useProjectStore((s) => s.currentTime);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const togglePlayback = useProjectStore((s) => s.togglePlayback);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const project = useProjectStore((s) => s.project);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const duration = project
    ? Math.max(30, ...project.tracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)))
    : 0;

  return (
    <div className={`preview ${className}`} data-testid="preview">
      <div className="preview__viewport">
        <div className="preview__canvas">
          {project ? (
            <span className="preview__frame">Frame at {formatTime(currentTime)}</span>
          ) : (
            <span className="preview__placeholder">No project loaded</span>
          )}
        </div>
      </div>
      <div className="preview__controls">
        <button
          className="preview__play-btn"
          onClick={togglePlayback}
          data-testid="play-btn"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <input
          type="range"
          className="preview__seek"
          min={0}
          max={duration}
          step={0.01}
          value={currentTime}
          onChange={handleTimeChange}
          data-testid="seek-bar"
        />
        <span className="preview__time" data-testid="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}
