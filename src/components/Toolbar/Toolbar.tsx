import { useProjectStore } from "../../stores/projectStore";
import "./Toolbar.css";

interface ToolbarProps {
  className?: string;
}

export function Toolbar({ className = "" }: ToolbarProps) {
  const project = useProjectStore((s) => s.project);
  const addTrack = useProjectStore((s) => s.addTrack);
  const zoomIn = useProjectStore((s) => s.zoomIn);
  const zoomOut = useProjectStore((s) => s.zoomOut);
  const zoom = useProjectStore((s) => s.zoom);
  const toggleTrackMute = useProjectStore((s) => s.toggleTrackMute);
  const toggleTrackLock = useProjectStore((s) => s.toggleTrackLock);
  const clearProject = useProjectStore((s) => s.clearProject);
  const selectedTrackId = useProjectStore((s) => s.selectedTrackId);

  const selectedTrack = project?.tracks.find((t) => t.id === selectedTrackId);

  const res = project?.config.resolution;
  const resLabel = res ? (res.width >= 3840 ? "4K UHD" : res.width >= 1920 ? "FHD" : "HD") : "";
  const videoCount = project?.tracks.filter((t) => t.track_type === "Video").length ?? 0;
  const audioCount = project?.tracks.filter((t) => t.track_type === "Audio").length ?? 0;

  return (
    <div className={`toolbar ${className}`} data-testid="toolbar">
      <div className="toolbar__section">
        <button
          className="toolbar__home"
          data-testid="close-project"
          title="Voltar ao início"
          onClick={clearProject}
        >
          ◉
        </button>
        <span className="toolbar__logo">STITCH&nbsp;CUT</span>
        <span className="toolbar__project-name" data-testid="project-name">
          {project?.name ?? "No Project"}
        </span>
        {res && (
          <span className="toolbar__badge" data-testid="res-badge">
            {resLabel} {res.width}×{res.height} • {project?.config.fps}fps
          </span>
        )}
      </div>

      <div className="toolbar__section">
        <button
          className="toolbar__btn"
          onClick={() => addTrack(`V${videoCount + 1}`, "Video")}
          disabled={!project}
          data-testid="add-video-track"
        >
          + V
        </button>
        <button
          className="toolbar__btn"
          onClick={() => addTrack(`A${audioCount + 1}`, "Audio")}
          disabled={!project}
          data-testid="add-audio-track"
        >
          + A
        </button>
        <button className="toolbar__btn" onClick={zoomOut} disabled={!project} data-testid="zoom-out">
          −
        </button>
        <span className="toolbar__zoom" data-testid="zoom-level">
          {Math.round(zoom * 100)}%
        </span>
        <button className="toolbar__btn" onClick={zoomIn} disabled={!project} data-testid="zoom-in">
          +
        </button>
      </div>

      {selectedTrack && (
        <div className="toolbar__section">
          <button
            className={`toolbar__btn ${selectedTrack.muted ? "toolbar__btn--active" : ""}`}
            onClick={() => toggleTrackMute(selectedTrack.id)}
            data-testid="mute-track"
          >
            {selectedTrack.muted ? "MUTED" : "MUTE"}
          </button>
          <button
            className={`toolbar__btn ${selectedTrack.locked ? "toolbar__btn--active" : ""}`}
            onClick={() => toggleTrackLock(selectedTrack.id)}
            data-testid="lock-track"
          >
            {selectedTrack.locked ? "LOCKED" : "LOCK"}
          </button>
        </div>
      )}

      <div className="toolbar__section toolbar__section--right">
        <span className="toolbar__status">● Auto-save</span>
        <button
          className="toolbar__export"
          data-testid="export-btn"
          onClick={() =>
            document.querySelector<HTMLButtonElement>('[data-testid="timeline-export"]')?.click()
          }
        >
          Export 4K
        </button>
      </div>
    </div>
  );
}
