import { useEffect, useRef } from "react";
import { useProjectStore } from "../../stores/projectStore";
import type { Clip, Project, Track } from "../../types";
import "./Preview.css";

interface PreviewProps {
  className?: string;
}

function findActiveClip(project: Project, time: number): { track: Track; clip: Clip } | null {
  const videoTracks = project.tracks.filter((t) => t.track_type === "Video" && !t.muted);
  for (let i = videoTracks.length - 1; i >= 0; i--) {
    const track = videoTracks[i];
    const clip = track.clips.find((c) => time >= c.start_time && time < c.start_time + c.duration);
    if (clip) return { track, clip };
  }
  return null;
}

export function Preview({ className = "" }: PreviewProps) {
  const currentTime = useProjectStore((s) => s.currentTime);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const togglePlayback = useProjectStore((s) => s.togglePlayback);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const project = useProjectStore((s) => s.project);
  const media = useProjectStore((s) => s.media);
  const videoRef = useRef<HTMLVideoElement>(null);

  const active = project ? findActiveClip(project, currentTime) : null;
  const activeMedia = active ? media.find((m) => m.id === active.clip.media_id) : undefined;

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    const video = videoRef.current;
    if (project && video && activeMedia) {
      const found = findActiveClip(project, t);
      const foundMedia = found ? media.find((m) => m.id === found.clip.media_id) : undefined;
      if (found && foundMedia?.url === activeMedia.url) {
        video.currentTime = found.clip.in_point + (t - found.clip.start_time);
      }
    }
    setCurrentTime(t);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      void video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    const target = active.clip.in_point + (currentTime - active.clip.start_time);
    if (Math.abs(video.currentTime - target) > 0.35) {
      video.currentTime = Math.max(0, target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.clip.id, activeMedia?.url]);

  const handleVideoTime = () => {
    const video = videoRef.current;
    if (!video || !active || !isPlaying) return;
    const timelineTime = active.clip.start_time + (video.currentTime - active.clip.in_point);
    if (timelineTime >= active.clip.start_time + active.clip.duration) {
      setCurrentTime(active.clip.start_time + active.clip.duration);
      setIsPlaying(false);
      return;
    }
    setCurrentTime(Math.max(0, timelineTime));
  };

  const duration = project
    ? Math.max(30, ...project.tracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)))
    : 0;

  const res = project?.config.resolution;

  return (
    <div className={`preview ${className}`} data-testid="preview">
      <div className="preview__topbar">
        <span className="preview__title">PROGRAM</span>
        {res && (
          <span className="preview__res">
            {res.width}×{res.height} • {project?.config.fps}fps
          </span>
        )}
      </div>
      <div className="preview__viewport">
        <div className="preview__canvas">
          {!project ? (
            <span className="preview__placeholder">No project loaded</span>
          ) : active && activeMedia ? (
            <video
              ref={videoRef}
              key={activeMedia.id}
              className="preview__video"
              src={activeMedia.url}
              data-testid="preview-video"
              playsInline
              preload="auto"
              onTimeUpdate={handleVideoTime}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <div className="preview__framebox">
              <span className="preview__frame">Frame at {formatTime(currentTime)}</span>
              <span className="preview__safe">
                {project.tracks.some((t) => t.clips.length > 0)
                  ? "Posicione o playhead sobre um clipe"
                  : "Importe um vídeo e adicione à timeline"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="preview__controls">
        <button className="preview__skip" onClick={() => setCurrentTime(0)} aria-label="rewind">
          {"|◀"}
        </button>
        <button className="preview__play-btn" onClick={togglePlayback} data-testid="play-btn">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button className="preview__skip" onClick={() => setCurrentTime(duration)} aria-label="forward">
          {"▶|"}
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
