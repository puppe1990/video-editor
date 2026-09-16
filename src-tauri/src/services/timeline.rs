use crate::models::{Clip, Project, Track};

#[derive(Debug, thiserror::Error)]
pub enum TimelineError {
    #[error("Track not found: {0}")]
    TrackNotFound(String),
    #[error("Clip not found: {0}")]
    ClipNotFound(String),
    #[error("Overlap detected: {0}")]
    OverlapError(String),
    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
}

pub struct TimelineService;

impl TimelineService {
    pub fn add_clip_to_track(
        project: &mut Project,
        track_id: &str,
        clip: Clip,
    ) -> Result<(), TimelineError> {
        let track = project
            .get_track_mut(track_id)
            .ok_or_else(|| TimelineError::TrackNotFound(track_id.to_string()))?;

        track.add_clip(clip).map_err(TimelineError::OverlapError)
    }

    pub fn move_clip(
        project: &mut Project,
        track_id: &str,
        clip_id: &str,
        new_start: f64,
    ) -> Result<(), TimelineError> {
        let track = project
            .get_track_mut(track_id)
            .ok_or_else(|| TimelineError::TrackNotFound(track_id.to_string()))?;

        track
            .move_clip(clip_id, new_start)
            .map_err(|e| match e.as_str() {
                "Track is locked" => TimelineError::InvalidOperation("Track is locked".to_string()),
                s if s.starts_with("Clip") && s.ends_with("not found") => {
                    TimelineError::ClipNotFound(clip_id.to_string())
                }
                _ => TimelineError::OverlapError(e),
            })
    }

    pub fn trim_clip(
        project: &mut Project,
        track_id: &str,
        clip_id: &str,
        in_point: f64,
        out_point: f64,
    ) -> Result<(), TimelineError> {
        let track = project
            .get_track_mut(track_id)
            .ok_or_else(|| TimelineError::TrackNotFound(track_id.to_string()))?;

        track.trim_clip(clip_id, in_point, out_point).map_err(|e| {
            if e.ends_with("not found") {
                TimelineError::ClipNotFound(clip_id.to_string())
            } else {
                TimelineError::InvalidOperation(e)
            }
        })
    }

    pub fn delete_clip(
        project: &mut Project,
        track_id: &str,
        clip_id: &str,
    ) -> Result<Clip, TimelineError> {
        let track = project
            .get_track_mut(track_id)
            .ok_or_else(|| TimelineError::TrackNotFound(track_id.to_string()))?;

        track
            .remove_clip(clip_id)
            .map_err(TimelineError::ClipNotFound)
    }

    pub fn split_clip(
        project: &mut Project,
        track_id: &str,
        clip_id: &str,
        split_time: f64,
    ) -> Result<Clip, TimelineError> {
        let track = project
            .get_track_mut(track_id)
            .ok_or_else(|| TimelineError::TrackNotFound(track_id.to_string()))?;

        let clip = track
            .get_clip(clip_id)
            .ok_or_else(|| TimelineError::ClipNotFound(clip_id.to_string()))?
            .clone();

        if split_time <= clip.start_time || split_time >= clip.end_time() {
            return Err(TimelineError::InvalidOperation(
                "Split time must be within clip bounds".to_string(),
            ));
        }

        let split_duration = split_time - clip.start_time;
        let remaining_duration = clip.duration - split_duration;

        track
            .trim_clip(clip_id, clip.in_point, clip.in_point + split_duration)
            .map_err(TimelineError::InvalidOperation)?;

        let new_clip = Clip {
            id: uuid::Uuid::new_v4().to_string(),
            media_id: clip.media_id.clone(),
            start_time: split_time,
            duration: remaining_duration,
            in_point: clip.in_point + split_duration,
            out_point: clip.out_point,
        };

        track
            .add_clip(new_clip.clone())
            .map_err(TimelineError::OverlapError)?;

        Ok(new_clip)
    }

    pub fn add_track(project: &mut Project, track: Track) -> String {
        let id = track.id.clone();
        project.add_track(track);
        id
    }

    pub fn remove_track(project: &mut Project, track_id: &str) -> Result<Track, TimelineError> {
        project
            .remove_track(track_id)
            .map_err(|_| TimelineError::TrackNotFound(track_id.to_string()))
    }

    pub fn reorder_tracks(
        project: &mut Project,
        track_order: &[String],
    ) -> Result<(), TimelineError> {
        if track_order.len() != project.tracks.len() {
            return Err(TimelineError::InvalidOperation(
                "Track order length mismatch".to_string(),
            ));
        }

        let mut new_tracks = Vec::with_capacity(project.tracks.len());
        for id in track_order {
            let pos = project
                .tracks
                .iter()
                .position(|t| t.id == *id)
                .ok_or_else(|| TimelineError::TrackNotFound(id.clone()))?;
            new_tracks.push(project.tracks[pos].clone());
        }

        project.tracks = new_tracks;
        Ok(())
    }

    pub fn snap_to_grid(time: f64, grid_size: f64) -> f64 {
        (time / grid_size).round() * grid_size
    }

    pub fn snap_to_clip_edge(time: f64, track: &Track, threshold: f64) -> f64 {
        for clip in &track.clips {
            let start_diff = (clip.start_time - time).abs();
            let end_diff = (clip.end_time() - time).abs();

            if start_diff < threshold {
                return clip.start_time;
            }
            if end_diff < threshold {
                return clip.end_time();
            }
        }
        time
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::track::TrackType;
    use crate::models::ProjectConfig;

    fn create_test_project() -> (Project, String) {
        let mut project = Project::new("Test", ProjectConfig::default());
        let track = Track::new("Video 1", TrackType::Video);
        let track_id = track.id.clone();
        project.add_track(track);
        (project, track_id)
    }

    #[test]
    fn test_add_clip_to_track() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 5.0);

        let result = TimelineService::add_clip_to_track(&mut project, &track_id, clip);
        assert!(result.is_ok());
        assert_eq!(project.get_track(&track_id).unwrap().clips.len(), 1);
    }

    #[test]
    fn test_add_clip_to_nonexistent_track_fails() {
        let (mut project, _) = create_test_project();
        let clip = Clip::new("media1", 0.0, 5.0);

        let result = TimelineService::add_clip_to_track(&mut project, "bad-id", clip);
        assert!(matches!(result, Err(TimelineError::TrackNotFound(_))));
    }

    #[test]
    fn test_add_overlapping_clip_fails() {
        let (mut project, track_id) = create_test_project();
        TimelineService::add_clip_to_track(&mut project, &track_id, Clip::new("media1", 0.0, 5.0))
            .unwrap();

        let result = TimelineService::add_clip_to_track(
            &mut project,
            &track_id,
            Clip::new("media2", 3.0, 5.0),
        );
        assert!(matches!(result, Err(TimelineError::OverlapError(_))));
    }

    #[test]
    fn test_move_clip() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 5.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        let result = TimelineService::move_clip(&mut project, &track_id, &clip_id, 10.0);
        assert!(result.is_ok());

        let track = project.get_track(&track_id).unwrap();
        assert_eq!(track.get_clip(&clip_id).unwrap().start_time, 10.0);
    }

    #[test]
    fn test_move_clip_overlap_fails() {
        let (mut project, track_id) = create_test_project();
        let clip1 = Clip::new("media1", 0.0, 5.0);
        let clip2 = Clip::new("media2", 10.0, 5.0);
        let clip1_id = clip1.id.clone();

        TimelineService::add_clip_to_track(&mut project, &track_id, clip1).unwrap();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip2).unwrap();

        let result = TimelineService::move_clip(&mut project, &track_id, &clip1_id, 8.0);
        assert!(matches!(result, Err(TimelineError::OverlapError(_))));
    }

    #[test]
    fn test_move_clip_locked_track_fails() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 5.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        project.get_track_mut(&track_id).unwrap().locked = true;

        let result = TimelineService::move_clip(&mut project, &track_id, &clip_id, 10.0);
        assert!(matches!(result, Err(TimelineError::InvalidOperation(_))));
    }

    #[test]
    fn test_trim_clip() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 10.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        let result = TimelineService::trim_clip(&mut project, &track_id, &clip_id, 2.0, 8.0);
        assert!(result.is_ok());

        let track = project.get_track(&track_id).unwrap();
        assert_eq!(track.get_clip(&clip_id).unwrap().duration, 6.0);
    }

    #[test]
    fn test_trim_clip_invalid_range_fails() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 10.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        let result = TimelineService::trim_clip(&mut project, &track_id, &clip_id, 8.0, 2.0);
        assert!(matches!(result, Err(TimelineError::InvalidOperation(_))));
    }

    #[test]
    fn test_delete_clip() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 5.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        let result = TimelineService::delete_clip(&mut project, &track_id, &clip_id);
        assert!(result.is_ok());
        assert_eq!(project.get_track(&track_id).unwrap().clips.len(), 0);
    }

    #[test]
    fn test_delete_nonexistent_clip_fails() {
        let (mut project, track_id) = create_test_project();

        let result = TimelineService::delete_clip(&mut project, &track_id, "bad-id");
        assert!(matches!(result, Err(TimelineError::ClipNotFound(_))));
    }

    #[test]
    fn test_split_clip() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 10.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        let result = TimelineService::split_clip(&mut project, &track_id, &clip_id, 4.0);
        assert!(result.is_ok());

        let track = project.get_track(&track_id).unwrap();
        assert_eq!(track.clips.len(), 2);
    }

    #[test]
    fn test_split_clip_at_start_fails() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 5.0, 10.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        let result = TimelineService::split_clip(&mut project, &track_id, &clip_id, 5.0);
        assert!(matches!(result, Err(TimelineError::InvalidOperation(_))));
    }

    #[test]
    fn test_split_clip_outside_bounds_fails() {
        let (mut project, track_id) = create_test_project();
        let clip = Clip::new("media1", 0.0, 10.0);
        let clip_id = clip.id.clone();
        TimelineService::add_clip_to_track(&mut project, &track_id, clip).unwrap();

        let result = TimelineService::split_clip(&mut project, &track_id, &clip_id, 15.0);
        assert!(matches!(result, Err(TimelineError::InvalidOperation(_))));
    }

    #[test]
    fn test_add_track_to_project() {
        let (mut project, _) = create_test_project();
        let new_track = Track::new("Audio 1", TrackType::Audio);

        let track_id = TimelineService::add_track(&mut project, new_track);

        assert_eq!(project.tracks.len(), 2);
        assert!(project.get_track(&track_id).is_some());
    }

    #[test]
    fn test_remove_track_from_project() {
        let (mut project, track_id) = create_test_project();

        let result = TimelineService::remove_track(&mut project, &track_id);
        assert!(result.is_ok());
        assert!(project.tracks.is_empty());
    }

    #[test]
    fn test_remove_nonexistent_track_fails() {
        let (mut project, _) = create_test_project();

        let result = TimelineService::remove_track(&mut project, "bad-id");
        assert!(matches!(result, Err(TimelineError::TrackNotFound(_))));
    }

    #[test]
    fn test_reorder_tracks() {
        let (mut project, first_id) = create_test_project();
        let second_track = Track::new("Video 2", TrackType::Video);
        let second_id = second_track.id.clone();
        project.add_track(second_track);

        let result =
            TimelineService::reorder_tracks(&mut project, &[second_id.clone(), first_id.clone()]);
        assert!(result.is_ok());
        assert_eq!(project.tracks[0].id, second_id);
        assert_eq!(project.tracks[1].id, first_id);
    }

    #[test]
    fn test_reorder_tracks_invalid_length_fails() {
        let (mut project, _first_id) = create_test_project();

        let result = TimelineService::reorder_tracks(&mut project, &[]);
        assert!(matches!(result, Err(TimelineError::InvalidOperation(_))));
    }

    #[test]
    fn test_reorder_tracks_with_bad_id_fails() {
        let (mut project, _first_id) = create_test_project();
        let second_track = Track::new("Video 2", TrackType::Video);
        let second_id = second_track.id.clone();
        project.add_track(second_track);

        let result =
            TimelineService::reorder_tracks(&mut project, &[second_id, "bad-id".to_string()]);
        assert!(matches!(result, Err(TimelineError::TrackNotFound(_))));
    }

    #[test]
    fn test_snap_to_grid() {
        assert_eq!(TimelineService::snap_to_grid(4.5, 1.0), 5.0);
        assert_eq!(TimelineService::snap_to_grid(4.4, 1.0), 4.0);
        assert_eq!(TimelineService::snap_to_grid(7.5, 5.0), 10.0);
        assert_eq!(TimelineService::snap_to_grid(0.0, 1.0), 0.0);
    }

    #[test]
    fn test_snap_to_clip_edge() {
        let mut track = Track::new("Video 1", TrackType::Video);
        track.add_clip(Clip::new("media1", 5.0, 10.0)).unwrap();

        assert_eq!(TimelineService::snap_to_clip_edge(4.9, &track, 0.2), 5.0);
        assert_eq!(TimelineService::snap_to_clip_edge(15.1, &track, 0.2), 15.0);
        assert_eq!(TimelineService::snap_to_clip_edge(8.0, &track, 0.2), 8.0);
    }

    #[test]
    fn test_move_clip_nonexistent_fails() {
        let (mut project, track_id) = create_test_project();

        let result = TimelineService::move_clip(&mut project, &track_id, "bad-id", 10.0);
        assert!(matches!(result, Err(TimelineError::ClipNotFound(_))));
    }

    #[test]
    fn test_trim_clip_nonexistent_fails() {
        let (mut project, track_id) = create_test_project();

        let result = TimelineService::trim_clip(&mut project, &track_id, "bad-id", 0.0, 5.0);
        assert!(matches!(result, Err(TimelineError::ClipNotFound(_))));
    }
}
