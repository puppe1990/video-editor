export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export async function tauriOpenVideo(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    filters: [{ name: "Vídeo", extensions: ["mp4", "mov", "webm", "mkv", "avi"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function tauriSaveVideo(suggestedName: string): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({
    defaultPath: suggestedName,
    filters: [{ name: "Vídeo MP4", extensions: ["mp4"] }],
  });
}

export async function tauriAssetUrl(path: string): Promise<string> {
  const { convertFileSrc } = await import("@tauri-apps/api/core");
  return convertFileSrc(path);
}
