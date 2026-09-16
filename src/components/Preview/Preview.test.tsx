import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Preview } from "./Preview";
import { useProjectStore } from "../../stores/projectStore";
import { createMockProject, createTrackWithClips } from "../../test/utils";

describe("Preview", () => {
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

  it("should show placeholder when no project", () => {
    render(<Preview />);
    expect(screen.getByText("No project loaded")).toBeInTheDocument();
  });

  it("should show frame info when project exists", () => {
    useProjectStore.getState().createProject("Test");

    render(<Preview />);

    expect(screen.getByText(/Frame at/)).toBeInTheDocument();
  });

  it("should display current time", () => {
    useProjectStore.getState().createProject("Test");
    useProjectStore.getState().setCurrentTime(5.5);

    render(<Preview />);

    expect(screen.getByTestId("time-display")).toHaveTextContent("00:05:15");
  });

  it("should toggle play on button click", () => {
    render(<Preview />);

    const playBtn = screen.getByTestId("play-btn");
    expect(playBtn).toHaveTextContent("▶");

    fireEvent.click(playBtn);
    expect(useProjectStore.getState().isPlaying).toBe(true);
    expect(playBtn).toHaveTextContent("⏸");

    fireEvent.click(playBtn);
    expect(useProjectStore.getState().isPlaying).toBe(false);
    expect(playBtn).toHaveTextContent("▶");
  });

  it("should update time on seek bar change", () => {
    useProjectStore.getState().createProject("Test");

    render(<Preview />);

    const seekBar = screen.getByTestId("seek-bar");
    fireEvent.change(seekBar, { target: { value: "10" } });

    expect(useProjectStore.getState().currentTime).toBe(10);
  });

  it("should show duration from clips", () => {
    const project = createMockProject();
    const track = createTrackWithClips(2);
    project.tracks.push(track);
    useProjectStore.getState().setProject(project);

    render(<Preview />);

    const timeDisplay = screen.getByTestId("time-display");
    expect(timeDisplay).toBeInTheDocument();
    expect(timeDisplay.textContent).toMatch(/\/\s*\d{2}:\d{2}:\d{2}/);
  });
});
