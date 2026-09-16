import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { exportClip, buildTimelineSegments } from "../../lib/export";
import { isTauri, tauriInvoke, tauriSaveVideo } from "../../lib/tauri";
import "./Inspector.css";

interface InspectorProps {
  className?: string;
}

export function Inspector({ className = "" }: InspectorProps) {
  const project = useProjectStore((s) => s.project);
  const media = useProjectStore((s) => s.media);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const selectedTrackId = useProjectStore((s) => s.selectedTrackId);
  const updateClipBounds = useProjectStore((s) => s.updateClipBounds);
  const deleteSelectedClip = useProjectStore((s) => s.deleteSelectedClip);

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const track = project?.tracks.find((t) => t.id === selectedTrackId);
  const clip = track?.clips.find((c) => c.id === selectedClipId);
  const clipMedia = clip ? media.find((m) => m.id === clip.media_id) : undefined;

  const [start, setStart] = useState("");
  const [inPoint, setInPoint] = useState("");
  const [outPoint, setOutPoint] = useState("");

  const applyTrim = () => {
    if (!track || !clip) return;
    const ok = updateClipBounds(track.id, clip.id, {
      start_time: start === "" ? undefined : parseFloat(start),
      in_point: inPoint === "" ? undefined : parseFloat(inPoint),
      out_point: outPoint === "" ? undefined : parseFloat(outPoint),
    });
    setStatus(ok ? "Corte aplicado." : "Valores inválidos ou colidem com outro clipe.");
    setStart("");
    setInPoint("");
    setOutPoint("");
  };

  const handleExportClip = async () => {
    if (!clip || !clipMedia) return;
    setBusy(true);
    setStatus(null);
    try {
      const videoEl = document.querySelector<HTMLVideoElement>('[data-testid="preview-video"]');
      const result = await exportClip(clipMedia, clip, videoEl);
      setStatus(result === "cancelled" ? "Exportação cancelada." : `Clipe exportado: ${result}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha ao exportar clipe.");
    } finally {
      setBusy(false);
    }
  };

  const handleExportTimeline = async () => {
    if (!project) return;
    setBusy(true);
    setStatus(null);
    try {
      const mediaById = new Map(media.map((m) => [m.id, m]));
      const segments = buildTimelineSegments(project.tracks, mediaById);
      if (segments.length === 0) {
        setStatus("Nada para exportar: adicione vídeos com arquivo em disco à timeline.");
        return;
      }
      if (!isTauri()) {
        setStatus("Export da timeline completa só no app Tauri. Exporte por clipe aqui no browser.");
        return;
      }
      const output = await tauriSaveVideo(`${project.name || "video"}-final.mp4`);
      if (!output) {
        setStatus("Exportação cancelada.");
        return;
      }
      await tauriInvoke<string>("export_timeline", { segments, output });
      setStatus(`Timeline exportada: ${output}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha ao exportar timeline.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`inspector ${className}`} data-testid="inspector">
      <div className="inspector__header">
        <span className="inspector__title">INSPECTOR</span>
      </div>
      <div className="inspector__section">
        <h4>Project</h4>
        <div className="inspector__row">
          <span>Name</span>
          <strong>{project?.name ?? "—"}</strong>
        </div>
        <div className="inspector__row">
          <span>Resolution</span>
          <strong>
            {project ? `${project.config.resolution.width}×${project.config.resolution.height}` : "—"}
          </strong>
        </div>
        <div className="inspector__row">
          <span>FPS</span>
          <strong>{project?.config.fps ?? "—"}</strong>
        </div>
        <div className="inspector__row">
          <span>Tracks</span>
          <strong>
            {project?.tracks.length ?? 0} (V
            {project?.tracks.filter((t) => t.track_type === "Video").length ?? 0} / A
            {project?.tracks.filter((t) => t.track_type === "Audio").length ?? 0})
          </strong>
        </div>
        <div className="inspector__row">
          <span>Mídias</span>
          <strong>{media.length}</strong>
        </div>
      </div>
      <div className="inspector__section">
        <h4>Corte do clipe</h4>
        {!clip ? (
          <p className="inspector__empty">Selecione um clipe na timeline.</p>
        ) : (
          <>
            <div className="inspector__row">
              <span>Arquivo</span>
              <strong>{clipMedia?.name ?? clip.media_id}</strong>
            </div>
            <div className="inspector__row">
              <span>Start</span>
              <strong>{clip.start_time.toFixed(2)}s</strong>
            </div>
            <div className="inspector__row">
              <span>Duration</span>
              <strong>{clip.duration.toFixed(2)}s</strong>
            </div>
            <div className="inspector__row">
              <span>In/Out</span>
              <strong>
                {clip.in_point.toFixed(1)} / {clip.out_point.toFixed(1)}
              </strong>
            </div>
            <div className="inspector__grid">
              <label>
                Início na timeline (s)
                <input
                  data-testid="trim-start"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  placeholder={clip.start_time.toFixed(2)}
                  inputMode="decimal"
                />
              </label>
              <label>
                In (s)
                <input
                  data-testid="trim-in"
                  value={inPoint}
                  onChange={(e) => setInPoint(e.target.value)}
                  placeholder={clip.in_point.toFixed(2)}
                  inputMode="decimal"
                />
              </label>
              <label>
                Out (s)
                <input
                  data-testid="trim-out"
                  value={outPoint}
                  onChange={(e) => setOutPoint(e.target.value)}
                  placeholder={clip.out_point.toFixed(2)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="inspector__btnrow">
              <button className="inspector__secondary" data-testid="trim-apply" onClick={applyTrim}>
                Aplicar corte
              </button>
              <button className="inspector__danger" data-testid="clip-delete" onClick={deleteSelectedClip}>
                Excluir
              </button>
            </div>
            <button
              className="inspector__export"
              data-testid="clip-export"
              onClick={handleExportClip}
              disabled={busy}
            >
              {busy ? "Exportando…" : "Exportar clipe"}
            </button>
          </>
        )}
      </div>
      <div className="inspector__section">
        <h4>Export</h4>
        <div className="inspector__row">
          <span>Format</span>
          <strong>MP4 H.264 4K</strong>
        </div>
        <button
          className="inspector__export"
          data-testid="timeline-export"
          onClick={handleExportTimeline}
          disabled={busy}
        >
          {busy ? "Exportando…" : "Export timeline"}
        </button>
        {status && (
          <p className="inspector__status" data-testid="export-status">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
