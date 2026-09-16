import { useRef, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { isTauri } from "../../lib/tauri";
import type { MediaItem, MediaType } from "../../types";
import "./MediaPool.css";

interface MediaPoolProps {
  className?: string;
}

function kindOf(name: string): MediaType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp3", "wav", "aac", "ogg", "flac"].includes(ext)) return "Audio";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "Image";
  return "Video";
}

function probeBrowserFile(url: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
    video.src = url;
  });
}

function formatDuration(s: number): string {
  if (!s || !isFinite(s)) return "--:--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function MediaPool({ className = "" }: MediaPoolProps) {
  const [filter, setFilter] = useState("All");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const media = useProjectStore((s) => s.media);
  const addMedia = useProjectStore((s) => s.addMedia);
  const removeMedia = useProjectStore((s) => s.removeMedia);
  const project = useProjectStore((s) => s.project);
  const addTrack = useProjectStore((s) => s.addTrack);
  const addClip = useProjectStore((s) => s.addClip);
  const selectedTrackId = useProjectStore((s) => s.selectedTrackId);

  const addClipFor = (item: MediaItem) => {
    if (!project || item.duration <= 0) return;
    const wantVideo = item.media_type !== "Audio";
    let target =
      project.tracks.find(
        (t) => t.id === selectedTrackId && (wantVideo ? t.track_type === "Video" : t.track_type === "Audio")
      ) ?? project.tracks.find((t) => (wantVideo ? t.track_type === "Video" : t.track_type === "Audio"));
    if (!target) {
      const name = wantVideo
        ? `V${project.tracks.filter((t) => t.track_type === "Video").length + 1}`
        : `A${project.tracks.filter((t) => t.track_type === "Audio").length + 1}`;
      const id = addTrack(name, wantVideo ? "Video" : "Audio");
      target = useProjectStore.getState().project?.tracks.find((t) => t.id === id);
    }
    if (!target) return;
    const end = target.clips.reduce((m, c) => Math.max(m, c.start_time + c.duration), 0);
    addClip(target.id, {
      id: crypto.randomUUID(),
      media_id: item.id,
      start_time: end,
      duration: item.duration,
      in_point: 0,
      out_point: item.duration,
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        const meta = await probeBrowserFile(url);
        addMedia({
          id: crypto.randomUUID(),
          name: file.name,
          path: "",
          url,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          fps: 30,
          media_type: kindOf(file.name),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao importar");
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    setError(null);
    if (isTauri()) {
      setImporting(true);
      try {
        const { tauriOpenVideo, tauriAssetUrl, tauriInvoke } = await import("../../lib/tauri");
        const path = await tauriOpenVideo();
        if (!path) return;
        const info = await tauriInvoke<{
          id: string;
          path: string;
          name: string;
          duration: number;
          width: number;
          height: number;
          fps: number;
          media_type: MediaType;
        }>("import_media", { path });
        addMedia({
          id: info.id,
          name: info.name,
          path: info.path,
          url: await tauriAssetUrl(info.path),
          duration: info.duration,
          width: info.width,
          height: info.height,
          fps: info.fps,
          media_type: info.media_type,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setImporting(false);
      }
      return;
    }
    fileRef.current?.click();
  };

  const visible = media.filter((m) => {
    if (filter === "All") return true;
    if (filter === "Video") return m.media_type === "Video";
    return m.media_type === "Audio";
  });

  return (
    <div className={`mediapool ${className}`} data-testid="mediapool">
      <div className="mediapool__header">
        <span className="mediapool__title">MEDIA POOL</span>
        <button
          className="mediapool__import"
          data-testid="import-btn"
          onClick={handleImport}
          disabled={importing || !project}
        >
          {importing ? "Importando…" : "+ Importar vídeo"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/*,audio/*"
        multiple
        hidden
        data-testid="file-input"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="mediapool__error" data-testid="import-error">
          {error}
        </p>
      )}
      <div className="mediapool__filters">
        {["All", "Video", "Audio"].map((f) => (
          <button
            key={f}
            className={`mediapool__filter ${filter === f ? "mediapool__filter--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="mediapool__list">
        {visible.length === 0 && (
          <p className="mediapool__empty">Nenhuma mídia. Importe um vídeo para começar.</p>
        )}
        {visible.map((m) => {
          const isVideo = m.media_type !== "Audio";
          return (
            <div key={m.id} className="media-card" data-testid="media-item">
              {m.url && isVideo ? (
                <video className="media-card__video" src={m.url} preload="metadata" muted playsInline />
              ) : (
                <span
                  className={`media-card__thumb ${isVideo ? "media-card__thumb--video" : "media-card__thumb--audio"}`}
                >
                  {isVideo ? "16:9" : "♪"}
                </span>
              )}
              <div className="media-card__info">
                <strong title={m.name}>{m.name}</strong>
                <span>
                  {formatDuration(m.duration)}
                  {m.width ? ` • ${m.width}×${m.height}` : ""}
                </span>
              </div>
              <button
                className="media-card__add"
                onClick={() => addClipFor(m)}
                title="Adicionar à timeline"
                disabled={!project || m.duration <= 0}
              >
                +
              </button>
              <button className="media-card__remove" onClick={() => removeMedia(m.id)} title="Remover">
                ×
              </button>
            </div>
          );
        })}
      </div>
      <p className="mediapool__hint">Importe o vídeo e clique + para jogar na timeline.</p>
    </div>
  );
}
