import { create } from "zustand";
import type { Project, Track, Clip, TrackType, ProjectConfig } from "../types";
import { defaultProjectConfig } from "../types";

interface ProjectState {
  project: Project | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  selectedClipId: string | null;
  selectedTrackId: string | null;

  // Project actions
  createProject: (name: string, config?: ProjectConfig) => void;
  setProject: (project: Project) => void;
  clearProject: () => void;

  // Track actions
  addTrack: (name: string, type: TrackType) => string;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;

  // Clip actions
  addClip: (trackId: string, clip: Clip) => boolean;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (trackId: string, clipId: string, newStart: number) => boolean;
  trimClip: (
    trackId: string,
    clipId: string,
    inPoint: number,
    outPoint: number
  ) => void;

  // Playback actions
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  setIsPlaying: (playing: boolean) => void;

  // Selection actions
  selectClip: (clipId: string | null) => void;
  selectTrack: (trackId: string | null) => void;

  // Zoom actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  selectedClipId: null,
  selectedTrackId: null,

  createProject: (name, config = defaultProjectConfig) => {
    const now = new Date().toISOString();
    set({
      project: {
        id: generateId(),
        name,
        tracks: [],
        config,
        created_at: now,
        updated_at: now,
      },
      currentTime: 0,
      isPlaying: false,
      selectedClipId: null,
      selectedTrackId: null,
    });
  },

  setProject: (project) => set({ project, currentTime: 0, selectedClipId: null, selectedTrackId: null }),

  clearProject: () =>
    set({
      project: null,
      currentTime: 0,
      isPlaying: false,
      selectedClipId: null,
      selectedTrackId: null,
    }),

  addTrack: (name, type) => {
    const id = generateId();
    set((state) => {
      if (!state.project) return state;
      const newTrack: Track = {
        id,
        name,
        track_type: type,
        clips: [],
        muted: false,
        locked: false,
      };
      return {
        project: {
          ...state.project,
          tracks: [...state.project.tracks, newTrack],
          updated_at: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  removeTrack: (trackId) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.filter((t) => t.id !== trackId),
          updated_at: new Date().toISOString(),
        },
      };
    }),

  toggleTrackMute: (trackId) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id === trackId ? { ...t, muted: !t.muted } : t
          ),
          updated_at: new Date().toISOString(),
        },
      };
    }),

  toggleTrackLock: (trackId) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id === trackId ? { ...t, locked: !t.locked } : t
          ),
          updated_at: new Date().toISOString(),
        },
      };
    }),

  addClip: (trackId, clip) => {
    const state = get();
    if (!state.project) return false;

    const track = state.project.tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return false;

    const hasOverlap = track.clips.some(
      (c) => c.start_time < clip.start_time + clip.duration && clip.start_time < c.start_time + c.duration
    );
    if (hasOverlap) return false;

    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: [...t.clips, clip].sort((a, b) => a.start_time - b.start_time) }
              : t
          ),
          updated_at: new Date().toISOString(),
        },
      };
    });
    return true;
  },

  removeClip: (trackId, clipId) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
              : t
          ),
          updated_at: new Date().toISOString(),
        },
      };
    }),

  moveClip: (trackId, clipId, newStart) => {
    const state = get();
    if (!state.project) return false;

    const track = state.project.tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return false;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return false;

    const adjustedStart = Math.max(0, newStart);
    const hasOverlap = track.clips.some(
      (c) =>
        c.id !== clipId &&
        c.start_time < adjustedStart + clip.duration &&
        adjustedStart < c.start_time + c.duration
    );
    if (hasOverlap) return false;

    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id === trackId
              ? {
                  ...t,
                  clips: t.clips
                    .map((c) => (c.id === clipId ? { ...c, start_time: adjustedStart } : c))
                    .sort((a, b) => a.start_time - b.start_time),
                }
              : t
          ),
          updated_at: new Date().toISOString(),
        },
      };
    });
    return true;
  },

  trimClip: (trackId, clipId, inPoint, outPoint) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((t) =>
            t.id === trackId
              ? {
                  ...t,
                  clips: t.clips.map((c) =>
                    c.id === clipId
                      ? { ...c, in_point: inPoint, out_point: outPoint, duration: outPoint - inPoint }
                      : c
                  ),
                }
              : t
          ),
          updated_at: new Date().toISOString(),
        },
      };
    }),

  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  selectTrack: (trackId) => set({ selectedTrackId: trackId }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  zoomIn: () => set((state) => ({ zoom: Math.min(10, state.zoom * 1.2) })),

  zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom / 1.2) })),
}));
