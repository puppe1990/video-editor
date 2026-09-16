use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{track::Track, Clip};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Resolution {
    pub width: u32,
    pub height: u32,
}

impl Resolution {
    pub const HD: Self = Self {
        width: 1280,
        height: 720,
    };
    pub const FULL_HD: Self = Self {
        width: 1920,
        height: 1080,
    };
    pub const QHD: Self = Self {
        width: 2560,
        height: 1440,
    };
    pub const UHD_4K: Self = Self {
        width: 3840,
        height: 2160,
    };
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProjectConfig {
    pub resolution: Resolution,
    pub fps: f64,
    pub sample_rate: u32,
}

impl Default for ProjectConfig {
    fn default() -> Self {
        Self {
            resolution: Resolution::FULL_HD,
            fps: 30.0,
            sample_rate: 48000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExportConfig {
    pub output_path: String,
    pub format: ExportFormat,
    pub quality: ExportQuality,
    pub resolution: Option<Resolution>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExportFormat {
    Mp4,
    Mov,
    Webm,
    Avi,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExportQuality {
    Low,
    Medium,
    High,
    Lossless,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub tracks: Vec<Track>,
    pub config: ProjectConfig,
    pub created_at: String,
    pub updated_at: String,
}

impl Project {
    pub fn new(name: impl Into<String>, config: ProjectConfig) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            tracks: Vec::new(),
            config,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    pub fn add_track(&mut self, track: Track) {
        self.tracks.push(track);
        self.touch();
    }

    pub fn remove_track(&mut self, track_id: &str) -> Result<Track, String> {
        let pos = self
            .tracks
            .iter()
            .position(|t| t.id == track_id)
            .ok_or_else(|| format!("Track {} not found", track_id))?;

        self.touch();
        Ok(self.tracks.remove(pos))
    }

    pub fn get_track(&self, track_id: &str) -> Option<&Track> {
        self.tracks.iter().find(|t| t.id == track_id)
    }

    pub fn get_track_mut(&mut self, track_id: &str) -> Option<&mut Track> {
        self.tracks.iter_mut().find(|t| t.id == track_id)
    }

    pub fn video_tracks(&self) -> impl Iterator<Item = &Track> {
        self.tracks
            .iter()
            .filter(|t| matches!(t.track_type, super::track::TrackType::Video))
    }

    pub fn audio_tracks(&self) -> impl Iterator<Item = &Track> {
        self.tracks
            .iter()
            .filter(|t| matches!(t.track_type, super::track::TrackType::Audio))
    }

    pub fn duration(&self) -> f64 {
        self.tracks.iter().map(|t| t.duration()).fold(0.0, f64::max)
    }

    pub fn find_clip(&self, clip_id: &str) -> Option<(usize, &Clip)> {
        for (track_idx, track) in self.tracks.iter().enumerate() {
            if let Some(clip) = track.get_clip(clip_id) {
                return Some((track_idx, clip));
            }
        }
        None
    }

    pub fn find_clip_mut(&mut self, clip_id: &str) -> Option<(usize, &mut Clip)> {
        for (track_idx, track) in self.tracks.iter_mut().enumerate() {
            if let Some(clip) = track.get_clip_mut(clip_id) {
                return Some((track_idx, clip));
            }
        }
        None
    }

    fn touch(&mut self) {
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::track::TrackType;

    #[test]
    fn test_project_creation() {
        let config = ProjectConfig::default();
        let project = Project::new("My Video", config.clone());

        assert_eq!(project.name, "My Video");
        assert_eq!(project.config, config);
        assert!(project.tracks.is_empty());
        assert!(!project.id.is_empty());
    }

    #[test]
    fn test_add_track() {
        let mut project = Project::new("Test", ProjectConfig::default());
        let track = Track::new("Video 1", TrackType::Video);

        project.add_track(track);

        assert_eq!(project.tracks.len(), 1);
    }

    #[test]
    fn test_remove_track() {
        let mut project = Project::new("Test", ProjectConfig::default());
        let track = Track::new("Video 1", TrackType::Video);
        let track_id = track.id.clone();
        project.add_track(track);

        let removed = project.remove_track(&track_id).unwrap();
        assert_eq!(removed.id, track_id);
        assert!(project.tracks.is_empty());
    }

    #[test]
    fn test_remove_nonexistent_track_fails() {
        let mut project = Project::new("Test", ProjectConfig::default());
        let result = project.remove_track("nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_duration_single_track() {
        let mut project = Project::new("Test", ProjectConfig::default());
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 0.0, 10.0)).unwrap();
        project.add_track(track);

        assert_eq!(project.duration(), 10.0);
    }

    #[test]
    fn test_duration_multiple_tracks() {
        let mut project = Project::new("Test", ProjectConfig::default());

        let mut video_track = Track::new("Video 1", TrackType::Video);
        video_track.add_clip(Clip::new("media1", 0.0, 10.0)).unwrap();
        project.add_track(video_track);

        let mut audio_track = Track::new("Audio 1", TrackType::Audio);
        audio_track.add_clip(Clip::new("audio1", 0.0, 15.0)).unwrap();
        project.add_track(audio_track);

        assert_eq!(project.duration(), 15.0);
    }

    #[test]
    fn test_find_clip() {
        let mut project = Project::new("Test", ProjectConfig::default());
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip = Clip::new("media1", 0.0, 5.0);
        let clip_id = clip.id.clone();
        track.add_clip(clip).unwrap();
        project.add_track(track);

        let (track_idx, found_clip) = project.find_clip(&clip_id).unwrap();
        assert_eq!(track_idx, 0);
        assert_eq!(found_clip.id, clip_id);
    }

    #[test]
    fn test_find_clip_nonexistent() {
        let project = Project::new("Test", ProjectConfig::default());
        assert!(project.find_clip("nonexistent").is_none());
    }

    #[test]
    fn test_video_tracks_filter() {
        let mut project = Project::new("Test", ProjectConfig::default());
        project.add_track(Track::new("Video 1", TrackType::Video));
        project.add_track(Track::new("Audio 1", TrackType::Audio));
        project.add_track(Track::new("Video 2", TrackType::Video));

        let video_count = project.video_tracks().count();
        assert_eq!(video_count, 2);
    }

    #[test]
    fn test_audio_tracks_filter() {
        let mut project = Project::new("Test", ProjectConfig::default());
        project.add_track(Track::new("Video 1", TrackType::Video));
        project.add_track(Track::new("Audio 1", TrackType::Audio));
        project.add_track(Track::new("Audio 2", TrackType::Audio));

        let audio_count = project.audio_tracks().count();
        assert_eq!(audio_count, 2);
    }

    #[test]
    fn test_resolution_constants() {
        assert_eq!(Resolution::HD.width, 1280);
        assert_eq!(Resolution::HD.height, 720);
        assert_eq!(Resolution::FULL_HD.width, 1920);
        assert_eq!(Resolution::FULL_HD.height, 1080);
        assert_eq!(Resolution::UHD_4K.width, 3840);
        assert_eq!(Resolution::UHD_4K.height, 2160);
    }

    #[test]
    fn test_project_serialization() {
        let mut project = Project::new("Test Project", ProjectConfig::default());
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 0.0, 5.0)).unwrap();
        project.add_track(track);

        let json = serde_json::to_string_pretty(&project).unwrap();
        let deserialized: Project = serde_json::from_str(&json).unwrap();
        assert_eq!(project, deserialized);
    }
}
