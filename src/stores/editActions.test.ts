import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "./projectStore";
import { createMockClip } from "../test/utils";
import type { MediaItem } from "../types";

function media(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "media-1",
    name: "video.mp4",
    path: "/tmp/video.mp4",
    url: "asset:///tmp/video.mp4",
    duration: 20,
    width: 3840,
    height: 2160,
    fps: 30,
    media_type: "Video",
    ...overrides,
  };
}

describe("edit actions", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      media: [],
      currentTime: 0,
      isPlaying: false,
      zoom: 1,
      selectedClipId: null,
      selectedTrackId: null,
    });
    useProjectStore.getState().createProject("Cut Test");
  });

  it("should add and remove media", () => {
    useProjectStore.getState().addMedia(media());
    expect(useProjectStore.getState().media).toHaveLength(1);
    useProjectStore.getState().removeMedia("media-1");
    expect(useProjectStore.getState().media).toHaveLength(0);
  });

  it("should split a clip at playhead time", () => {
    const st = useProjectStore.getState();
    const trackId = st.addTrack("V1", "Video");
    const clip = createMockClip({
      media_id: "media-1",
      start_time: 0,
      duration: 10,
      in_point: 0,
      out_point: 10,
    });
    st.addClip(trackId, clip);

    const ok = useProjectStore.getState().splitClipAt(trackId, clip.id, 4);
    expect(ok).toBe(true);

    const track = useProjectStore.getState().project?.tracks.find((t) => t.id === trackId);
    expect(track?.clips).toHaveLength(2);
    expect(track?.clips[0].duration).toBe(4);
    expect(track?.clips[1].start_time).toBe(4);
    expect(track?.clips[1].in_point).toBe(4);
  });

  it("should refuse split outside clip bounds", () => {
    const st = useProjectStore.getState();
    const trackId = st.addTrack("V1", "Video");
    const clip = createMockClip({ start_time: 0, duration: 10, in_point: 0, out_point: 10 });
    st.addClip(trackId, clip);

    expect(useProjectStore.getState().splitClipAt(trackId, clip.id, 0)).toBe(false);
    expect(useProjectStore.getState().splitClipAt(trackId, clip.id, 10)).toBe(false);
    expect(useProjectStore.getState().project?.tracks[0].clips).toHaveLength(1);
  });

  it("should delete the selected clip", () => {
    const st = useProjectStore.getState();
    const trackId = st.addTrack("V1", "Video");
    const clip = createMockClip({ start_time: 0, duration: 5, in_point: 0, out_point: 5 });
    st.addClip(trackId, clip);
    useProjectStore.getState().selectTrack(trackId);
    useProjectStore.getState().selectClip(clip.id);

    useProjectStore.getState().deleteSelectedClip();
    expect(useProjectStore.getState().project?.tracks[0].clips).toHaveLength(0);
    expect(useProjectStore.getState().selectedClipId).toBeNull();
  });

  it("should trim clip in/out points", () => {
    const st = useProjectStore.getState();
    const trackId = st.addTrack("V1", "Video");
    const clip = createMockClip({ start_time: 0, duration: 10, in_point: 0, out_point: 10 });
    st.addClip(trackId, clip);

    const ok = useProjectStore.getState().updateClipBounds(trackId, clip.id, { in_point: 2, out_point: 8 });
    expect(ok).toBe(true);
    const updated = useProjectStore.getState().project?.tracks[0].clips[0];
    expect(updated?.duration).toBe(6);
    expect(updated?.in_point).toBe(2);
  });

  it("should refuse invalid trim range", () => {
    const st = useProjectStore.getState();
    const trackId = st.addTrack("V1", "Video");
    const clip = createMockClip({ start_time: 0, duration: 10, in_point: 0, out_point: 10 });
    st.addClip(trackId, clip);

    expect(useProjectStore.getState().updateClipBounds(trackId, clip.id, { in_point: 8, out_point: 5 })).toBe(
      false
    );
  });
});
