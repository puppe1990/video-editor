import { useProjectStore } from "../../stores/projectStore";
import type { Track } from "../../types";
import "./Timeline.css";

interface TimelineProps {
  className?: string;
}

export function Timeline({ className = "" }: TimelineProps) {
  const project = useProjectStore((s) => s.project);
  const currentTime = useProjectStore((s) => s.currentTime);
  const zoom = useProjectStore((s) => s.zoom);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const selectedTrackId = useProjectStore((s) => s.selectedTrackId);
  const selectTrack = useProjectStore((s) => s.selectTrack);

  if (!project) {
    return (
      <div className={`timeline timeline--empty ${className}`}>
        <p>No project loaded</p>
      </div>
    );
  }

  const duration = Math.max(
    30,
    project.tracks.reduce((max, track) => {
      const trackEnd = track.clips.reduce(
        (clipMax, clip) => Math.max(clipMax, clip.start_time + clip.duration),
        0
      );
      return Math.max(max, trackEnd);
    }, 0)
  );

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / (rect.width * zoom)) * duration;
    setCurrentTime(Math.max(0, time));
  };

  return (
    <div className={`timeline ${className}`} data-testid="timeline">
      <div className="timeline__header">
        <span className="timeline__duration">
          {formatTime(duration)}
        </span>
      </div>
      <div className="timeline__tracks" onClick={handleTimelineClick}>
        {project.tracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            duration={duration}
            zoom={zoom}
            isSelected={track.id === selectedTrackId}
            onSelect={() => selectTrack(track.id)}
          />
        ))}
        {project.tracks.length === 0 && (
          <p className="timeline__empty-message">Add a track to start editing</p>
        )}
      </div>
      <Playhead time={currentTime} duration={duration} zoom={zoom} />
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  duration: number;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
}

function TrackRow({ track, duration, zoom, isSelected, onSelect }: TrackRowProps) {
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const selectClip = useProjectStore((s) => s.selectClip);

  return (
    <div
      className={`track-row ${isSelected ? "track-row--selected" : ""}`}
      data-testid="track"
      data-track-id={track.id}
      onClick={onSelect}
    >
      <div className="track-row__header">
        <span className="track-row__name">{track.name}</span>
        <span className="track-row__type">{track.track_type}</span>
      </div>
      <div className="track-row__clips" style={{ width: `${duration * 10 * zoom}px` }}>
        {track.clips.map((clip) => (
          <div
            key={clip.id}
            className={`clip ${clip.id === selectedClipId ? "clip--selected" : ""}`}
            data-testid="clip"
            data-clip-id={clip.id}
            style={{
              left: `${clip.start_time * 10 * zoom}px`,
              width: `${clip.duration * 10 * zoom}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectClip(clip.id);
            }}
          >
            <span className="clip__label">
              {formatTime(clip.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Playhead({ time, duration, zoom }: { time: number; duration: number; zoom: number }) {
  const position = (time / duration) * duration * 10 * zoom;
  return (
    <div
      className="playhead"
      data-testid="playhead"
      style={{ left: `${position}px` }}
    />
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}
