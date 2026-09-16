import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Timeline } from "./Timeline";
import { useProjectStore } from "../../stores/projectStore";
import { createMockProject, createProjectWithTracks, createTrackWithClips } from "../../test/utils";

describe("Timeline", () => {
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

  it("should show empty state when no project", () => {
    render(<Timeline />);
    expect(screen.getByText("No project loaded")).toBeInTheDocument();
  });

  it("should render tracks when project has tracks", () => {
    const project = createProjectWithTracks(3);
    useProjectStore.getState().setProject(project);

    render(<Timeline />);

    expect(screen.getAllByTestId("track")).toHaveLength(3);
  });

  it("should render clips in tracks", () => {
    const project = createMockProject();
    const track = createTrackWithClips(3);
    project.tracks.push(track);
    useProjectStore.getState().setProject(project);

    render(<Timeline />);

    expect(screen.getAllByTestId("clip")).toHaveLength(3);
  });

  it("should display track names", () => {
    const project = createMockProject();
    const track = createTrackWithClips(0);
    track.name = "My Video Track";
    project.tracks.push(track);
    useProjectStore.getState().setProject(project);

    render(<Timeline />);

    expect(screen.getByText("My Video Track")).toBeInTheDocument();
  });

  it("should select track on click", () => {
    const project = createProjectWithTracks(1);
    useProjectStore.getState().setProject(project);

    render(<Timeline />);

    const track = screen.getByTestId("track");
    fireEvent.click(track);

    expect(useProjectStore.getState().selectedTrackId).toBe(project.tracks[0].id);
  });

  it("should select clip on click", () => {
    const project = createMockProject();
    const track = createTrackWithClips(1);
    project.tracks.push(track);
    useProjectStore.getState().setProject(project);

    render(<Timeline />);

    const clip = screen.getByTestId("clip");
    fireEvent.click(clip);

    expect(useProjectStore.getState().selectedClipId).toBe(track.clips[0].id);
  });

  it("should show playhead", () => {
    const project = createMockProject();
    project.tracks.push(createTrackWithClips(1));
    useProjectStore.getState().setProject(project);

    render(<Timeline />);

    expect(screen.getByTestId("playhead")).toBeInTheDocument();
  });

  it("should show empty message when no tracks", () => {
    useProjectStore.getState().createProject("Empty Project");

    render(<Timeline />);

    expect(screen.getByText("Add a track to start editing")).toBeInTheDocument();
  });
});
