import type { MediaItem, Project } from "../types";

export interface RecentEntry {
  id: string;
  name: string;
  savedAt: string;
  project: Project;
  media: MediaItem[];
}

const KEY = "stitchcut:recents:v1";
const MAX = 8;

export function loadRecents(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stripBlobUrls(media: MediaItem[]): MediaItem[] {
  return media.map((m) => (m.url.startsWith("blob:") ? { ...m, url: "" } : m));
}

export function persistRecent(project: Project, media: MediaItem[]): RecentEntry[] {
  const recents = loadRecents().filter((r) => r.id !== project.id);
  recents.unshift({
    id: project.id,
    name: project.name,
    savedAt: new Date().toISOString(),
    project: { ...project, updated_at: new Date().toISOString() },
    media: stripBlobUrls(media),
  });
  const trimmed = recents.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // quota cheia — ignora
  }
  return trimmed;
}

export function removeRecent(id: string): RecentEntry[] {
  const recents = loadRecents().filter((r) => r.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(recents));
  } catch {
    // ignora
  }
  return recents;
}
