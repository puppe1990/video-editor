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
  const splitClipAt = useProjectStore((s) => s.splitClipAt);
  const deleteSelectedClip = useProjectStore((s) => s.deleteSelectedClip);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);

  if (!project) {
    return (
      <div className={`timeline timeline--empty ${className}`}>
        <p>No project loaded</p>
      </div>
    );
  }

  const canSplit = Boolean(
    selectedTrackId &&
    selectedClipId &&
    project.tracks
      .find((t) => t.id === selectedTrackId)
      ?.clips.find(
        (c) =>
          c.id === selectedClipId && currentTime > c.start_time && currentTime < c.start_time + c.duration
      )
  );

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

  const ticks = Array.from({ length: 13 }, (_, i) => Math.round((duration / 12) * i));

  return (
    <div className={`timeline ${className}`} data-testid="timeline">
      <div className="timeline__header">
        <span className="timeline__title">TIMELINE • MULTICAMADAS</span>
        <span className="timeline__tools">
          <button
            className="timeline__tool"
            data-testid="split-btn"
            disabled={!canSplit}
            title="Cortar clipe no playhead (C)"
            onClick={() => {
              if (selectedTrackId && selectedClipId)
                splitClipAt(selectedTrackId, selectedClipId, currentTime);
            }}
          >
            ✂ Cortar
          </button>
          <button
            className="timeline__tool timeline__tool--danger"
            data-testid="delete-clip-btn"
            disabled={!selectedClipId}
            title="Excluir clipe selecionado (Del)"
            onClick={deleteSelectedClip}
          >
            Excluir
          </button>
        </span>
        <span className="timeline__duration">{formatTime(duration)}</span>
      </div>
      <div className="timeline__ruler">
        {ticks.map((t) => (
          <span key={t} className="timeline__tick">
            {formatTime(t)}
          </span>
        ))}
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
  const media = useProjectStore((s) => s.media);
  const toggleTrackMute = useProjectStore((s) => s.toggleTrackMute);
  const toggleTrackLock = useProjectStore((s) => s.toggleTrackLock);
  const isVideo = track.track_type === "Video";

  return (
    <div
      className={`track-row ${isSelected ? "track-row--selected" : ""} ${isVideo ? "track-row--video" : "track-row--audio"}`}
      data-testid="track"
      data-track-id={track.id}
      onClick={onSelect}
    >
      <div className="track-row__header">
        <span
          className={`track-row__badge ${isVideo ? "track-row__badge--video" : "track-row__badge--audio"}`}
        >
          {isVideo ? "V" : "A"}
        </span>
        <span className="track-row__name">{track.name}</span>
        <span className="track-row__actions">
          <button
            className="track-row__mini"
            onClick={(e) => {
              e.stopPropagation();
              toggleTrackMute(track.id);
            }}
            title="mute"
          >
            {track.muted ? "M×" : "M"}
          </button>
          <button
            className="track-row__mini"
            onClick={(e) => {
              e.stopPropagation();
              toggleTrackLock(track.id);
            }}
            title="lock"
          >
            {track.locked ? "▪" : "◦"}
          </button>
        </span>
      </div>
      <div className="track-row__clips" style={{ width: `${duration * 10 * zoom}px` }}>
        {track.clips.map((clip) => (
          <div
            key={clip.id}
            className={`clip ${isVideo ? "clip--video" : "clip--audio"} ${clip.id === selectedClipId ? "clip--selected" : ""}`}
            data-testid="clip"
            data-clip-id={clip.id}
            style={{
              left: `${clip.start_time * 10 * zoom}px`,
              width: `${Math.max(48, clip.duration * 10 * zoom)}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectClip(clip.id);
            }}
          >
            <span className="clip__label">
              {media.find((m) => m.id === clip.media_id)?.name ?? clip.media_id} • {formatTime(clip.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Playhead({ time, duration, zoom }: { time: number; duration: number; zoom: number }) {
  const position = (time / duration) * duration * 10 * zoom;
  return <div className="playhead" data-testid="playhead" style={{ left: `${position}px` }} />;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}
