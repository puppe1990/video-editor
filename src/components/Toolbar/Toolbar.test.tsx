import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./Toolbar";
import { useProjectStore } from "../../stores/projectStore";

describe("Toolbar", () => {
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

  it("should disable buttons when no project", () => {
    render(<Toolbar />);

    expect(screen.getByTestId("add-video-track")).toBeDisabled();
    expect(screen.getByTestId("add-audio-track")).toBeDisabled();
    expect(screen.getByTestId("zoom-out")).toBeDisabled();
    expect(screen.getByTestId("zoom-in")).toBeDisabled();
  });

  it("should enable buttons when project exists", () => {
    useProjectStore.getState().createProject("Test");

    render(<Toolbar />);

    expect(screen.getByTestId("add-video-track")).toBeEnabled();
    expect(screen.getByTestId("add-audio-track")).toBeEnabled();
  });

  it("should add video track on click", () => {
    useProjectStore.getState().createProject("Test");

    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("add-video-track"));

    expect(useProjectStore.getState().project?.tracks).toHaveLength(1);
    expect(useProjectStore.getState().project?.tracks[0].track_type).toBe("Video");
  });

  it("should add audio track on click", () => {
    useProjectStore.getState().createProject("Test");

    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("add-audio-track"));

    expect(useProjectStore.getState().project?.tracks).toHaveLength(1);
    expect(useProjectStore.getState().project?.tracks[0].track_type).toBe("Audio");
  });

  it("should zoom in", () => {
    useProjectStore.getState().createProject("Test");

    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("zoom-in"));

    expect(useProjectStore.getState().zoom).toBeGreaterThan(1);
  });

  it("should zoom out", () => {
    useProjectStore.getState().createProject("Test");

    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("zoom-out"));

    expect(useProjectStore.getState().zoom).toBeLessThan(1);
  });

  it("should display zoom level", () => {
    useProjectStore.getState().createProject("Test");
    useProjectStore.getState().setZoom(1.5);

    render(<Toolbar />);

    expect(screen.getByTestId("zoom-level")).toHaveTextContent("150%");
  });

  it("should show project name", () => {
    useProjectStore.getState().createProject("My Project");

    render(<Toolbar />);

    expect(screen.getByTestId("project-name")).toHaveTextContent("My Project");
  });

  it("should show 'No Project' when no project", () => {
    render(<Toolbar />);

    expect(screen.getByTestId("project-name")).toHaveTextContent("No Project");
  });

  it("should show mute/lock buttons when track selected", () => {
    useProjectStore.getState().createProject("Test");
    const trackId = useProjectStore.getState().addTrack("Video 1", "Video");
    useProjectStore.getState().selectTrack(trackId);

    render(<Toolbar />);

    expect(screen.getByTestId("mute-track")).toBeInTheDocument();
    expect(screen.getByTestId("lock-track")).toBeInTheDocument();
  });

  it("should toggle mute on selected track", () => {
    useProjectStore.getState().createProject("Test");
    const trackId = useProjectStore.getState().addTrack("Audio 1", "Audio");
    useProjectStore.getState().selectTrack(trackId);

    render(<Toolbar />);

    fireEvent.click(screen.getByTestId("mute-track"));

    expect(useProjectStore.getState().project?.tracks[0].muted).toBe(true);
  });
});
