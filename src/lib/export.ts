import { isTauri, tauriInvoke } from "./tauri";
import type { Clip, MediaItem } from "../types";

export interface TimelineSegment {
  path: string;
  ss: number;
  t: number;
}

/** Monta segmentos exportáveis a partir dos clips de vídeo da timeline. */
export function buildTimelineSegments(
  tracks: { track_type: string; clips: Clip[] }[],
  mediaById: Map<string, MediaItem>
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  for (const track of tracks) {
    if (track.track_type !== "Video") continue;
    const ordered = [...track.clips].sort((a, b) => a.start_time - b.start_time);
    for (const clip of ordered) {
      const media = mediaById.get(clip.media_id);
      if (!media || !media.path) return [];
      segments.push({ path: media.path, ss: clip.in_point, t: clip.duration });
    }
  }
  return segments;
}

/** Exporta um clipe. No Tauri usa ffmpeg; no browser regrava o trecho via MediaRecorder. */
export async function exportClip(
  media: MediaItem,
  clip: Clip,
  videoEl?: HTMLVideoElement | null
): Promise<string> {
  if (isTauri()) {
    if (!media.path) throw new Error("Mídia sem caminho em disco — reimporte o arquivo.");
    const suggested = `${stripExt(media.name)}-corte.mp4`;
    const { tauriSaveVideo } = await import("./tauri");
    const output = await tauriSaveVideo(suggested);
    if (!output) return "cancelled";
    await tauriInvoke<string>("export_clip", {
      input: media.path,
      output,
      ss: clip.in_point,
      t: clip.duration,
    });
    return output;
  }
  if (!videoEl) throw new Error("Preview de vídeo indisponível no browser.");
  const url = await recordSegment(videoEl, clip.in_point, clip.duration);
  downloadUrl(url, `${stripExt(media.name)}-corte.webm`);
  return "downloaded";
}

function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

function downloadUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Regrava um trecho do vídeo via captureStream + MediaRecorder (fallback browser). */
function recordSegment(video: HTMLVideoElement, ss: number, duration: number): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const stream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
      if (!stream) {
        reject(new Error("captureStream não suportado neste browser."));
        return;
      }
      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => resolve(URL.createObjectURL(new Blob(chunks, { type: "video/webm" })));
      video.muted = true;
      video.currentTime = Math.min(ss, Math.max(0, (video.duration || ss + 1) - 0.2));
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        void video.play().catch(reject);
        rec.start();
        window.setTimeout(() => {
          rec.stop();
          video.pause();
        }, duration * 1000);
      };
      video.addEventListener("seeked", onSeeked);
    } catch (e) {
      reject(e);
    }
  });
}
