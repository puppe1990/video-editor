import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "./projectStore";
import { createMockProject, createMockTrack, createMockClip } from "../test/utils";

describe("projectStore", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      currentTime: 0,
      isPlaying: false,
      zoom: 1,
      selectedClipId: null,
      selectedTrackId: null,
    });
  });

  describe("project operations", () => {
    it("should create a new project", () => {
      const store = useProjectStore.getState();
      store.createProject("My Video");

      const { project } = useProjectStore.getState();
      expect(project).not.toBeNull();
      expect(project?.name).toBe("My Video");
      expect(project?.tracks).toHaveLength(0);
    });

    it("should set a project", () => {
      const mockProject = createMockProject({ name: "Loaded Project" });
      const store = useProjectStore.getState();
      store.setProject(mockProject);

      expect(useProjectStore.getState().project?.name).toBe("Loaded Project");
      expect(useProjectStore.getState().currentTime).toBe(0);
    });

    it("should clear the project", () => {
      useProjectStore.getState().createProject("Test");
      useProjectStore.getState().clearProject();

      expect(useProjectStore.getState().project).toBeNull();
      expect(useProjectStore.getState().currentTime).toBe(0);
    });
  });

  describe("track operations", () => {
    it("should add a track", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");

      const { project } = useProjectStore.getState();
      expect(project?.tracks).toHaveLength(1);
      expect(project?.tracks[0].id).toBe(trackId);
      expect(project?.tracks[0].name).toBe("Video 1");
      expect(project?.tracks[0].track_type).toBe("Video");
    });

    it("should remove a track", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");
      useProjectStore.getState().removeTrack(trackId);

      expect(useProjectStore.getState().project?.tracks).toHaveLength(0);
    });

    it("should toggle track mute", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Audio 1", "Audio");

      expect(useProjectStore.getState().project?.tracks[0].muted).toBe(false);
      useProjectStore.getState().toggleTrackMute(trackId);
      expect(useProjectStore.getState().project?.tracks[0].muted).toBe(true);
    });

    it("should toggle track lock", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");

      expect(useProjectStore.getState().project?.tracks[0].locked).toBe(false);
      useProjectStore.getState().toggleTrackLock(trackId);
      expect(useProjectStore.getState().project?.tracks[0].locked).toBe(true);
    });
  });

  describe("clip operations", () => {
    it("should add a clip to a track", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");
      const clip = createMockClip({ start_time: 0, duration: 5 });

      const result = useProjectStore.getState().addClip(trackId, clip);

      expect(result).toBe(true);
      expect(useProjectStore.getState().project?.tracks[0].clips).toHaveLength(1);
    });

    it("should not add overlapping clip", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");

      const clip1 = createMockClip({ start_time: 0, duration: 5 });
      const clip2 = createMockClip({ start_time: 3, duration: 5 });

      useProjectStore.getState().addClip(trackId, clip1);
      const result = useProjectStore.getState().addClip(trackId, clip2);

      expect(result).toBe(false);
      expect(useProjectStore.getState().project?.tracks[0].clips).toHaveLength(1);
    });

    it("should not add clip to locked track", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");
      useProjectStore.getState().toggleTrackLock(trackId);

      const clip = createMockClip({ start_time: 0, duration: 5 });
      const result = useProjectStore.getState().addClip(trackId, clip);

      expect(result).toBe(false);
    });

    it("should remove a clip", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");
      const clip = createMockClip();
      useProjectStore.getState().addClip(trackId, clip);

      useProjectStore.getState().removeClip(trackId, clip.id);

      expect(useProjectStore.getState().project?.tracks[0].clips).toHaveLength(0);
    });

    it("should move a clip", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");
      const clip = createMockClip({ start_time: 0, duration: 5 });
      useProjectStore.getState().addClip(trackId, clip);

      const result = useProjectStore.getState().moveClip(trackId, clip.id, 10);

      expect(result).toBe(true);
      expect(useProjectStore.getState().project?.tracks[0].clips[0].start_time).toBe(10);
    });

    it("should not move clip if overlap", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");

      const clip1 = createMockClip({ start_time: 0, duration: 5 });
      const clip2 = createMockClip({ start_time: 10, duration: 5 });
      useProjectStore.getState().addClip(trackId, clip1);
      useProjectStore.getState().addClip(trackId, clip2);

      const result = useProjectStore.getState().moveClip(trackId, clip1.id, 8);

      expect(result).toBe(false);
    });

    it("should trim a clip", () => {
      useProjectStore.getState().createProject("Test");
      const trackId = useProjectStore.getState().addTrack("Video 1", "Video");
      const clip = createMockClip({ start_time: 0, duration: 10 });
      useProjectStore.getState().addClip(trackId, clip);

      useProjectStore.getState().trimClip(trackId, clip.id, 2, 8);

      const updatedClip = useProjectStore.getState().project?.tracks[0].clips[0];
      expect(updatedClip?.in_point).toBe(2);
      expect(updatedClip?.out_point).toBe(8);
      expect(updatedClip?.duration).toBe(6);
    });
  });

  describe("playback operations", () => {
    it("should set current time", () => {
      useProjectStore.getState().setCurrentTime(10.5);
      expect(useProjectStore.getState().currentTime).toBe(10.5);
    });

    it("should not allow negative time", () => {
      useProjectStore.getState().setCurrentTime(-5);
      expect(useProjectStore.getState().currentTime).toBe(0);
    });

    it("should toggle playback", () => {
      expect(useProjectStore.getState().isPlaying).toBe(false);
      useProjectStore.getState().togglePlayback();
      expect(useProjectStore.getState().isPlaying).toBe(true);
      useProjectStore.getState().togglePlayback();
      expect(useProjectStore.getState().isPlaying).toBe(false);
    });

    it("should set isPlaying", () => {
      useProjectStore.getState().setIsPlaying(true);
      expect(useProjectStore.getState().isPlaying).toBe(true);
    });
  });

  describe("selection operations", () => {
    it("should select a clip", () => {
      useProjectStore.getState().selectClip("clip-123");
      expect(useProjectStore.getState().selectedClipId).toBe("clip-123");
    });

    it("should select a track", () => {
      useProjectStore.getState().selectTrack("track-123");
      expect(useProjectStore.getState().selectedTrackId).toBe("track-123");
    });

    it("should clear selection when setting null", () => {
      useProjectStore.getState().selectClip("clip-1");
      useProjectStore.getState().selectClip(null);
      expect(useProjectStore.getState().selectedClipId).toBeNull();
    });
  });

  describe("zoom operations", () => {
    it("should set zoom level", () => {
      useProjectStore.getState().setZoom(2);
      expect(useProjectStore.getState().zoom).toBe(2);
    });

    it("should clamp zoom to min 0.1", () => {
      useProjectStore.getState().setZoom(0.01);
      expect(useProjectStore.getState().zoom).toBe(0.1);
    });

    it("should clamp zoom to max 10", () => {
      useProjectStore.getState().setZoom(15);
      expect(useProjectStore.getState().zoom).toBe(10);
    });

    it("should zoom in", () => {
      useProjectStore.getState().setZoom(1);
      useProjectStore.getState().zoomIn();
      expect(useProjectStore.getState().zoom).toBeCloseTo(1.2);
    });

    it("should zoom out", () => {
      useProjectStore.getState().setZoom(1);
      useProjectStore.getState().zoomOut();
      expect(useProjectStore.getState().zoom).toBeCloseTo(0.833, 2);
    });
  });
});
