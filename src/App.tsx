import { useEffect, useState } from "react";
import { useProjectStore } from "./stores/projectStore";
import { Timeline } from "./components/Timeline/Timeline";
import { Preview } from "./components/Preview/Preview";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { MediaPool } from "./components/MediaPool/MediaPool";
import { Inspector } from "./components/Inspector/Inspector";
import { loadRecents, persistRecent, removeRecent, type RecentEntry } from "./lib/persistence";
import { UHD_4K, FULL_HD, HD, type ProjectConfig } from "./types";
import "./App.css";

const PRESETS: { label: string; hint: string; config: ProjectConfig }[] = [
  {
    label: "4K UHD",
    hint: "3840 × 2160 • 30fps",
    config: { resolution: UHD_4K, fps: 30, sample_rate: 48000 },
  },
  {
    label: "Full HD",
    hint: "1920 × 1080 • 30fps",
    config: { resolution: FULL_HD, fps: 30, sample_rate: 48000 },
  },
  { label: "HD", hint: "1280 × 720 • 30fps", config: { resolution: HD, fps: 30, sample_rate: 48000 } },
];

function App() {
  const createProject = useProjectStore((s) => s.createProject);
  const setProject = useProjectStore((s) => s.setProject);
  const project = useProjectStore((s) => s.project);
  const media = useProjectStore((s) => s.media);

  const [projectName, setProjectName] = useState("Untitled Project");
  const [presetIdx, setPresetIdx] = useState(0);
  const [recents, setRecents] = useState<RecentEntry[]>(() => loadRecents());

  useEffect(() => {
    if (!project) return;
    const t = window.setTimeout(() => {
      setRecents(persistRecent(project, useProjectStore.getState().media));
    }, 600);
    return () => window.clearTimeout(t);
  }, [project, media]);

  const handleNewProject = () => {
    const name = projectName.trim() || "Untitled Project";
    createProject(name, PRESETS[presetIdx].config);
    const st = useProjectStore.getState();
    if (st.project && st.project.tracks.length === 0) {
      st.addTrack("V2", "Video");
      const v1 = st.addTrack("V1", "Video");
      st.addTrack("A1", "Audio");
      st.selectTrack(v1);
    }
  };

  const handleOpenRecent = (entry: RecentEntry) => {
    setProject(entry.project);
    useProjectStore.setState({
      media: entry.media,
      currentTime: 0,
      isPlaying: false,
      selectedClipId: null,
      selectedTrackId: entry.project.tracks[0]?.id ?? null,
    });
  };

  if (!project) {
    return (
      <div className="app app--welcome">
        <div className="welcome">
          <div className="welcome__brand">
            <span className="welcome__badge">MULTICAMADAS • 4K • TAURI</span>
            <h1>Video Editor</h1>
            <p>Create a new project to start editing</p>
            <ul className="welcome__features">
              <li>
                <strong>Timeline multicamadas</strong>
                <span>V2 • V1 • A1 com zoom e snap</span>
              </li>
              <li>
                <strong>Corte preciso</strong>
                <span>Split no playhead, trim In/Out</span>
              </li>
              <li>
                <strong>Export MP4 4K</strong>
                <span>H.264 via ffmpeg no app Tauri</span>
              </li>
            </ul>
          </div>
          <div className="welcome__card">
            <label className="welcome__label">
              Nome do projeto
              <input
                className="welcome__input"
                data-testid="project-name-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Untitled Project"
                maxLength={60}
              />
            </label>
            <span className="welcome__label">Formato</span>
            <div className="welcome__presets">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  className={`welcome__preset ${i === presetIdx ? "welcome__preset--active" : ""}`}
                  data-testid={`preset-${p.label}`}
                  onClick={() => setPresetIdx(i)}
                >
                  <strong>{p.label}</strong>
                  <span>{p.hint}</span>
                </button>
              ))}
            </div>
            <button className="welcome__btn" onClick={handleNewProject}>
              New Project
            </button>
            {recents.length > 0 && (
              <div className="welcome__recents">
                <span className="welcome__label">Recentes</span>
                {recents.map((r) => (
                  <div key={r.id} className="recent-row" data-testid="recent-item">
                    <button
                      className="recent-row__open"
                      onClick={() => handleOpenRecent(r)}
                      title="Abrir projeto"
                    >
                      <strong>{r.name}</strong>
                      <span>
                        {r.project.config.resolution.width}×{r.project.config.resolution.height} •{" "}
                        {r.project.tracks.length} tracks
                      </span>
                    </button>
                    <button
                      className="recent-row__remove"
                      aria-label={`Remover ${r.name}`}
                      onClick={() => setRecents(removeRecent(r.id))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar className="app__toolbar" />
      <div className="app__workspace">
        <MediaPool className="app__mediapool" />
        <Preview className="app__preview" />
        <Inspector className="app__inspector" />
      </div>
      <Timeline className="app__timeline" />
    </div>
  );
}

export default App;
