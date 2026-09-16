use crate::models::{Project, ProjectConfig};

#[tauri::command]
pub async fn create_project(name: String, config: ProjectConfig) -> Result<Project, String> {
    Ok(Project::new(name, config))
}

#[tauri::command]
pub async fn save_project(project: Project, path: String) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_project(path: String) -> Result<Project, String> {
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::track::{Track, TrackType};
    use crate::models::Resolution;

    #[test]
    fn test_create_project() {
        let config = ProjectConfig::default();
        let project = crate::models::Project::new("Test Project", config);

        assert_eq!(project.name, "Test Project");
        assert!(project.tracks.is_empty());
    }

    #[tokio::test]
    async fn test_save_and_load_project() {
        let config = ProjectConfig {
            resolution: Resolution::FULL_HD,
            fps: 30.0,
            sample_rate: 48000,
        };

        let mut project = Project::new("Test Save", config);
        let track = Track::new("Video 1", TrackType::Video);
        project.add_track(track);

        let temp_path = "/tmp/test_project.json";
        save_project(project.clone(), temp_path.to_string())
            .await
            .unwrap();

        let loaded = load_project(temp_path.to_string()).await.unwrap();
        assert_eq!(loaded.name, project.name);
        assert_eq!(loaded.tracks.len(), project.tracks.len());
        assert_eq!(loaded.config.resolution.width, 1920);

        std::fs::remove_file(temp_path).ok();
    }

    #[test]
    fn test_project_config_default() {
        let config = ProjectConfig::default();
        assert_eq!(config.resolution.width, 1920);
        assert_eq!(config.resolution.height, 1080);
        assert_eq!(config.fps, 30.0);
    }
}
