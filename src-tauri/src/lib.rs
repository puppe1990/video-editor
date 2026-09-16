pub mod commands;
pub mod models;
pub mod services;

use commands::timeline::ProjectState;
use commands::{export, media, project, timeline};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ProjectState::new())
        .invoke_handler(tauri::generate_handler![
            project::create_project,
            project::save_project,
            project::load_project,
            media::import_media,
            media::get_media_thumbnail,
            timeline::add_clip_to_track,
            timeline::move_clip,
            timeline::trim_clip,
            timeline::delete_clip,
            timeline::split_clip,
            timeline::add_track,
            timeline::remove_track,
            export::export_clip,
            export::export_timeline,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::models::*;

    #[test]
    fn test_project_creation() {
        let config = ProjectConfig::default();
        let project = Project::new("Test", config);
        assert_eq!(project.name, "Test");
    }
}
