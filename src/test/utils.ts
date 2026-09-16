import type { Project, Track, Clip, TrackType } from "../types";
import { defaultProjectConfig } from "../types";

export function createMockClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: crypto.randomUUID(),
    media_id: "media-1",
    start_time: 0,
    duration: 5,
    in_point: 0,
    out_point: 5,
    ...overrides,
  };
}

export function createMockTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: crypto.randomUUID(),
    name: "Video 1",
    track_type: "Video" as TrackType,
    clips: [],
    muted: false,
    locked: false,
    ...overrides,
  };
}

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: crypto.randomUUID(),
    name: "Test Project",
    tracks: [],
    config: defaultProjectConfig,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createProjectWithTracks(numTracks: number): Project {
  const project = createMockProject();
  for (let i = 0; i < numTracks; i++) {
    project.tracks.push(
      createMockTrack({
        name: `Track ${i + 1}`,
        track_type: i === 0 ? "Video" : "Audio",
      })
    );
  }
  return project;
}

export function createTrackWithClips(numClips: number): Track {
  const track = createMockTrack();
  let startTime = 0;
  for (let i = 0; i < numClips; i++) {
    const duration = 5;
    track.clips.push(
      createMockClip({
        start_time: startTime,
        duration,
        in_point: 0,
        out_point: duration,
      })
    );
    startTime += duration;
  }
  return track;
}
