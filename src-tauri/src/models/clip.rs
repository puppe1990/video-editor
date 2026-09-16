use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Clip {
    pub id: String,
    pub media_id: String,
    pub start_time: f64,
    pub duration: f64,
    pub in_point: f64,
    pub out_point: f64,
}

impl Clip {
    pub fn new(media_id: impl Into<String>, start_time: f64, duration: f64) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            media_id: media_id.into(),
            start_time,
            duration,
            in_point: 0.0,
            out_point: duration,
        }
    }

    pub fn end_time(&self) -> f64 {
        self.start_time + self.duration
    }

    pub fn overlaps_with(&self, other: &Clip) -> bool {
        self.start_time < other.end_time() && other.start_time < self.end_time()
    }

    pub fn trim(&mut self, in_point: f64, out_point: f64) -> Result<(), String> {
        if in_point < 0.0 {
            return Err("in_point cannot be negative".to_string());
        }
        if out_point <= in_point {
            return Err("out_point must be greater than in_point".to_string());
        }
        if out_point - in_point > self.duration {
            return Err("trim range exceeds clip duration".to_string());
        }

        self.in_point = in_point;
        self.out_point = out_point;
        self.duration = out_point - in_point;
        Ok(())
    }

    pub fn move_to(&mut self, new_start: f64) {
        self.start_time = new_start.max(0.0);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MediaInfo {
    pub id: String,
    pub path: String,
    pub name: String,
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub media_type: MediaType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MediaType {
    Video,
    Audio,
    Image,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clip_creation() {
        let clip = Clip::new("media1", 0.0, 5.0);
        assert_eq!(clip.media_id, "media1");
        assert_eq!(clip.start_time, 0.0);
        assert_eq!(clip.duration, 5.0);
        assert_eq!(clip.in_point, 0.0);
        assert_eq!(clip.out_point, 5.0);
        assert!(!clip.id.is_empty());
    }

    #[test]
    fn test_clip_end_time() {
        let clip = Clip::new("media1", 10.0, 5.0);
        assert_eq!(clip.end_time(), 15.0);
    }

    #[test]
    fn test_clip_overlap() {
        let clip1 = Clip::new("media1", 0.0, 5.0);
        let clip2 = Clip::new("media2", 3.0, 5.0);
        let clip3 = Clip::new("media3", 10.0, 5.0);

        assert!(clip1.overlaps_with(&clip2));
        assert!(clip2.overlaps_with(&clip1));
        assert!(!clip1.overlaps_with(&clip3));
    }

    #[test]
    fn test_clip_no_overlap_at_boundary() {
        let clip1 = Clip::new("media1", 0.0, 5.0);
        let clip2 = Clip::new("media2", 5.0, 5.0);

        assert!(!clip1.overlaps_with(&clip2));
    }

    #[test]
    fn test_clip_trim_valid() {
        let mut clip = Clip::new("media1", 0.0, 10.0);
        clip.trim(2.0, 8.0).unwrap();

        assert_eq!(clip.in_point, 2.0);
        assert_eq!(clip.out_point, 8.0);
        assert_eq!(clip.duration, 6.0);
    }

    #[test]
    fn test_clip_trim_negative_in_point_fails() {
        let mut clip = Clip::new("media1", 0.0, 10.0);
        let result = clip.trim(-1.0, 5.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_clip_trim_invalid_range_fails() {
        let mut clip = Clip::new("media1", 0.0, 10.0);
        let result = clip.trim(8.0, 5.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_clip_trim_exceeds_duration_fails() {
        let mut clip = Clip::new("media1", 0.0, 10.0);
        let result = clip.trim(0.0, 15.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_clip_move_to() {
        let mut clip = Clip::new("media1", 0.0, 5.0);
        clip.move_to(10.0);
        assert_eq!(clip.start_time, 10.0);
    }

    #[test]
    fn test_clip_move_to_negative_clamps_to_zero() {
        let mut clip = Clip::new("media1", 10.0, 5.0);
        clip.move_to(-5.0);
        assert_eq!(clip.start_time, 0.0);
    }

    #[test]
    fn test_clip_serialization() {
        let clip = Clip::new("media1", 0.0, 5.0);
        let json = serde_json::to_string(&clip).unwrap();
        let deserialized: Clip = serde_json::from_str(&json).unwrap();
        assert_eq!(clip, deserialized);
    }

    #[test]
    fn test_media_info_creation() {
        let info = MediaInfo {
            id: "test-id".to_string(),
            path: "/path/to/video.mp4".to_string(),
            name: "video.mp4".to_string(),
            duration: 120.5,
            width: 1920,
            height: 1080,
            fps: 30.0,
            media_type: MediaType::Video,
        };

        assert_eq!(info.width, 1920);
        assert_eq!(info.media_type, MediaType::Video);
    }
}
