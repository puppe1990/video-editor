import { useProjectStore } from "./stores/projectStore";
import { Timeline } from "./components/Timeline/Timeline";
import { Preview } from "./components/Preview/Preview";
import { Toolbar } from "./components/Toolbar/Toolbar";
import "./App.css";

function App() {
  const createProject = useProjectStore((s) => s.createProject);
  const project = useProjectStore((s) => s.project);

  if (!project) {
    return (
      <div className="app app--welcome">
        <div className="welcome">
          <h1>Video Editor</h1>
          <p>Create a new project to start editing</p>
          <button
            className="welcome__btn"
            onClick={() => createProject("Untitled Project")}
          >
            New Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar className="app__toolbar" />
      <div className="app__main">
        <Preview className="app__preview" />
        <Timeline className="app__timeline" />
      </div>
    </div>
  );
}

export default App;
