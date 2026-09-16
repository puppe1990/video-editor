import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import { useProjectStore } from "./stores/projectStore";

describe("App", () => {
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

  it("should show welcome screen when no project", () => {
    render(<App />);

    expect(screen.getByText("Video Editor")).toBeInTheDocument();
    expect(screen.getByText("Create a new project to start editing")).toBeInTheDocument();
    expect(screen.getByText("New Project")).toBeInTheDocument();
  });

  it("should create project on button click", () => {
    render(<App />);

    fireEvent.click(screen.getByText("New Project"));

    expect(useProjectStore.getState().project).not.toBeNull();
    expect(useProjectStore.getState().project?.name).toBe("Untitled Project");
  });

  it("should show editor when project exists", () => {
    useProjectStore.getState().createProject("My Video");

    render(<App />);

    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("preview")).toBeInTheDocument();
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
  });
});
