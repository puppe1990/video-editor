use crate::models::{Clip, Track};
use crate::services::TimelineService;

use std::sync::Mutex;
use tauri::State;

pub struct ProjectState {
    pub project: Mutex<Option<crate::models::Project>>,
}

impl ProjectState {
    pub fn new() -> Self {
        Self {
            project: Mutex::new(None),
        }
    }
}

impl Default for ProjectState {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn add_clip_to_track(
    state: State<'_, ProjectState>,
    track_id: String,
    clip: Clip,
) -> Result<(), String> {
    let mut project = state.project.lock().unwrap();
    let project = project.as_mut().ok_or("No project loaded")?;

    TimelineService::add_clip_to_track(project, &track_id, clip).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn move_clip(
    state: State<'_, ProjectState>,
    track_id: String,
    clip_id: String,
    new_start: f64,
) -> Result<(), String> {
    let mut project = state.project.lock().unwrap();
    let project = project.as_mut().ok_or("No project loaded")?;

    TimelineService::move_clip(project, &track_id, &clip_id, new_start).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn trim_clip(
    state: State<'_, ProjectState>,
    track_id: String,
    clip_id: String,
    in_point: f64,
    out_point: f64,
) -> Result<(), String> {
    let mut project = state.project.lock().unwrap();
    let project = project.as_mut().ok_or("No project loaded")?;

    TimelineService::trim_clip(project, &track_id, &clip_id, in_point, out_point)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_clip(
    state: State<'_, ProjectState>,
    track_id: String,
    clip_id: String,
) -> Result<(), String> {
    let mut project = state.project.lock().unwrap();
    let project = project.as_mut().ok_or("No project loaded")?;

    TimelineService::delete_clip(project, &track_id, &clip_id)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn split_clip(
    state: State<'_, ProjectState>,
    track_id: String,
    clip_id: String,
    at_time: f64,
) -> Result<(), String> {
    let mut project = state.project.lock().unwrap();
    let project = project.as_mut().ok_or("No project loaded")?;

    TimelineService::split_clip(project, &track_id, &clip_id, at_time)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_track(state: State<'_, ProjectState>, track: Track) -> Result<(), String> {
    let mut project = state.project.lock().unwrap();
    let project = project.as_mut().ok_or("No project loaded")?;

    TimelineService::add_track(project, track);
    Ok(())
}

#[tauri::command]
pub async fn remove_track(state: State<'_, ProjectState>, track_id: String) -> Result<(), String> {
    let mut project = state.project.lock().unwrap();
    let project = project.as_mut().ok_or("No project loaded")?;

    TimelineService::remove_track(project, &track_id)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_state_new() {
        let state = ProjectState::new();
        let project = state.project.lock().unwrap();
        assert!(project.is_none());
    }
}
