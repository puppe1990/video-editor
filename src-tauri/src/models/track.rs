use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Clip;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TrackType {
    Video,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub track_type: TrackType,
    pub clips: Vec<Clip>,
    pub muted: bool,
    pub locked: bool,
}

impl Track {
    pub fn new(name: impl Into<String>, track_type: TrackType) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            track_type,
            clips: Vec::new(),
            muted: false,
            locked: false,
        }
    }

    pub fn duration(&self) -> f64 {
        self.clips
            .iter()
            .map(|c| c.end_time())
            .fold(0.0, f64::max)
    }

    pub fn add_clip(&mut self, clip: Clip) -> Result<(), String> {
        if self.locked {
            return Err("Track is locked".to_string());
        }

        for existing in &self.clips {
            if existing.overlaps_with(&clip) {
                return Err(format!(
                    "Clip overlaps with existing clip at {:.2}s-{:.2}s",
                    existing.start_time,
                    existing.end_time()
                ));
            }
        }

        self.clips.push(clip);
        self.clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());
        Ok(())
    }

    pub fn remove_clip(&mut self, clip_id: &str) -> Result<Clip, String> {
        if self.locked {
            return Err("Track is locked".to_string());
        }

        let pos = self
            .clips
            .iter()
            .position(|c| c.id == clip_id)
            .ok_or_else(|| format!("Clip {} not found", clip_id))?;

        Ok(self.clips.remove(pos))
    }

    pub fn get_clip(&self, clip_id: &str) -> Option<&Clip> {
        self.clips.iter().find(|c| c.id == clip_id)
    }

    pub fn get_clip_mut(&mut self, clip_id: &str) -> Option<&mut Clip> {
        self.clips.iter_mut().find(|c| c.id == clip_id)
    }

    pub fn move_clip(&mut self, clip_id: &str, new_start: f64) -> Result<(), String> {
        if self.locked {
            return Err("Track is locked".to_string());
        }

        let mut temp_clip = self
            .get_clip(clip_id)
            .ok_or_else(|| format!("Clip {} not found", clip_id))?
            .clone();
        temp_clip.move_to(new_start);

        for other in &self.clips {
            if other.id != clip_id && other.overlaps_with(&temp_clip) {
                return Err("Move would cause overlap".to_string());
            }
        }

        self.get_clip_mut(clip_id).unwrap().move_to(new_start);
        self.clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());
        Ok(())
    }

    pub fn trim_clip(&mut self, clip_id: &str, in_point: f64, out_point: f64) -> Result<(), String> {
        if self.locked {
            return Err("Track is locked".to_string());
        }

        let clip = self
            .get_clip_mut(clip_id)
            .ok_or_else(|| format!("Clip {} not found", clip_id))?;

        clip.trim(in_point, out_point)
    }

    pub fn toggle_mute(&mut self) {
        self.muted = !self.muted;
    }

    pub fn toggle_lock(&mut self) {
        self.locked = !self.locked;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_track_creation() {
        let track = Track::new("Video 1", TrackType::Video);
        assert_eq!(track.name, "Video 1");
        assert_eq!(track.track_type, TrackType::Video);
        assert!(track.clips.is_empty());
        assert!(!track.muted);
        assert!(!track.locked);
        assert!(!track.id.is_empty());
    }

    #[test]
    fn test_add_clip_to_empty_track() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip = Clip::new("media1", 0.0, 5.0);

        track.add_clip(clip).unwrap();

        assert_eq!(track.clips.len(), 1);
        assert_eq!(track.duration(), 5.0);
    }

    #[test]
    fn test_add_clip_with_overlap_fails() {
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 0.0, 5.0)).unwrap();

        let result = track.add_clip(Clip::new("media2", 3.0, 5.0));
        assert!(result.is_err());
        assert_eq!(track.clips.len(), 1);
    }

    #[test]
    fn test_add_clip_no_overlap_succeeds() {
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 0.0, 5.0)).unwrap();

        let result = track.add_clip(Clip::new("media2", 5.0, 5.0));
        assert!(result.is_ok());
        assert_eq!(track.clips.len(), 2);
    }

    #[test]
    fn test_add_clip_to_locked_track_fails() {
        let mut track = Track::new("Video 1", TrackType::Video);
        track.locked = true;

        let result = track.add_clip(Clip::new("media1", 0.0, 5.0));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Track is locked");
    }

    #[test]
    fn test_remove_clip() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip = Clip::new("media1", 0.0, 5.0);
        let clip_id = clip.id.clone();
        track.add_clip(clip).unwrap();

        let removed = track.remove_clip(&clip_id).unwrap();
        assert_eq!(removed.id, clip_id);
        assert!(track.clips.is_empty());
    }

    #[test]
    fn test_remove_clip_from_locked_track_fails() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip = Clip::new("media1", 0.0, 5.0);
        let clip_id = clip.id.clone();
        track.add_clip(clip).unwrap();
        track.locked = true;

        let result = track.remove_clip(&clip_id);
        assert!(result.is_err());
    }

    #[test]
    fn test_remove_nonexistent_clip_fails() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let result = track.remove_clip("nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_move_clip() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip = Clip::new("media1", 0.0, 5.0);
        let clip_id = clip.id.clone();
        track.add_clip(clip).unwrap();

        track.move_clip(&clip_id, 10.0).unwrap();
        assert_eq!(track.clips[0].start_time, 10.0);
    }

    #[test]
    fn test_move_clip_causes_overlap_fails() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip1 = Clip::new("media1", 0.0, 5.0);
        let clip2 = Clip::new("media2", 10.0, 5.0);
        let clip1_id = clip1.id.clone();
        track.add_clip(clip1).unwrap();
        track.add_clip(clip2).unwrap();

        let result = track.move_clip(&clip1_id, 8.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_trim_clip() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip = Clip::new("media1", 0.0, 10.0);
        let clip_id = clip.id.clone();
        track.add_clip(clip).unwrap();

        track.trim_clip(&clip_id, 2.0, 8.0).unwrap();
        assert_eq!(track.clips[0].duration, 6.0);
    }

    #[test]
    fn test_trim_clip_locked_track_fails() {
        let mut track = Track::new("Video 1", TrackType::Video);
        let clip = Clip::new("media1", 0.0, 10.0);
        let clip_id = clip.id.clone();
        track.add_clip(clip).unwrap();
        track.locked = true;

        let result = track.trim_clip(&clip_id, 2.0, 8.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_clips_auto_sorted_by_start_time() {
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 10.0, 5.0)).unwrap();
        track.add_clip(Clip::new("media2", 0.0, 5.0)).unwrap();
        track.add_clip(Clip::new("media3", 5.0, 5.0)).unwrap();

        assert_eq!(track.clips[0].start_time, 0.0);
        assert_eq!(track.clips[1].start_time, 5.0);
        assert_eq!(track.clips[2].start_time, 10.0);
    }

    #[test]
    fn test_duration_with_multiple_clips() {
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 0.0, 5.0)).unwrap();
        track.add_clip(Clip::new("media2", 10.0, 8.0)).unwrap();

        assert_eq!(track.duration(), 18.0);
    }

    #[test]
    fn test_toggle_mute() {
        let mut track = Track::new("Audio 1", TrackType::Audio);
        assert!(!track.muted);

        track.toggle_mute();
        assert!(track.muted);

        track.toggle_mute();
        assert!(!track.muted);
    }

    #[test]
    fn test_toggle_lock() {
        let mut track = Track::new("Video 1", TrackType::Video);
        assert!(!track.locked);

        track.toggle_lock();
        assert!(track.locked);

        track.toggle_lock();
        assert!(!track.locked);
    }

    #[test]
    fn test_serialization() {
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 0.0, 5.0)).unwrap();

        let json = serde_json::to_string(&track).unwrap();
        let deserialized: Track = serde_json::from_str(&json).unwrap();
        assert_eq!(track, deserialized);
    }
}
