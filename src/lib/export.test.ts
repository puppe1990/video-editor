import { describe, it, expect } from "vitest";
import { buildTimelineSegments } from "./export";
import type { MediaItem } from "../types";

const mediaItem: MediaItem = {
  id: "m1",
  name: "video.mp4",
  path: "/tmp/video.mp4",
  url: "asset:///tmp/video.mp4",
  duration: 20,
  width: 3840,
  height: 2160,
  fps: 30,
  media_type: "Video",
};

describe("buildTimelineSegments", () => {
  it("should build ordered segments from video tracks", () => {
    const segments = buildTimelineSegments(
      [
        {
          track_type: "Video",
          clips: [
            { id: "c2", media_id: "m1", start_time: 5, duration: 3, in_point: 10, out_point: 13 },
            { id: "c1", media_id: "m1", start_time: 0, duration: 5, in_point: 0, out_point: 5 },
          ],
        },
      ],
      new Map([["m1", mediaItem]])
    );
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ path: "/tmp/video.mp4", ss: 0, t: 5 });
    expect(segments[1]).toEqual({ path: "/tmp/video.mp4", ss: 10, t: 3 });
  });

  it("should ignore audio tracks", () => {
    const segments = buildTimelineSegments(
      [
        {
          track_type: "Audio",
          clips: [{ id: "c1", media_id: "m1", start_time: 0, duration: 5, in_point: 0, out_point: 5 }],
        },
      ],
      new Map([["m1", mediaItem]])
    );
    expect(segments).toHaveLength(0);
  });

  it("should return empty when media has no disk path", () => {
    const browserOnly = { ...mediaItem, path: "" };
    const segments = buildTimelineSegments(
      [
        {
          track_type: "Video",
          clips: [{ id: "c1", media_id: "m1", start_time: 0, duration: 5, in_point: 0, out_point: 5 }],
        },
      ],
      new Map([["m1", browserOnly]])
    );
    expect(segments).toHaveLength(0);
  });
});
