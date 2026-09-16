use crate::models::clip::{MediaInfo, MediaType};

#[tauri::command]
pub async fn import_media(path: String) -> Result<MediaInfo, String> {
    let path_obj = std::path::Path::new(&path);
    let name = path_obj
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let media_type = match path_obj.extension().and_then(|e| e.to_str()) {
        Some("mp4") | Some("mov") | Some("avi") | Some("webm") | Some("mkv") => MediaType::Video,
        Some("mp3") | Some("wav") | Some("aac") | Some("ogg") | Some("flac") => MediaType::Audio,
        Some("png") | Some("jpg") | Some("jpeg") | Some("webp") | Some("gif") => MediaType::Image,
        _ => return Err(format!("Unsupported file type: {}", path)),
    };

    Ok(MediaInfo {
        id: uuid::Uuid::new_v4().to_string(),
        path,
        name,
        duration: 0.0,
        width: 0,
        height: 0,
        fps: 0.0,
        media_type,
    })
}

#[tauri::command]
pub async fn get_media_thumbnail(
    _path: String,
    _time: f64,
) -> Result<Vec<u8>, String> {
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_import_video_media() {
        let result = import_media("/path/to/video.mp4".to_string()).await.unwrap();
        assert_eq!(result.name, "video.mp4");
        assert_eq!(result.media_type, MediaType::Video);
    }

    #[tokio::test]
    async fn test_import_audio_media() {
        let result = import_media("/path/to/audio.mp3".to_string()).await.unwrap();
        assert_eq!(result.name, "audio.mp3");
        assert_eq!(result.media_type, MediaType::Audio);
    }

    #[tokio::test]
    async fn test_import_image_media() {
        let result = import_media("/path/to/image.png".to_string()).await.unwrap();
        assert_eq!(result.name, "image.png");
        assert_eq!(result.media_type, MediaType::Image);
    }

    #[tokio::test]
    async fn test_import_unsupported_format_fails() {
        let result = import_media("/path/to/file.xyz".to_string()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_thumbnail_returns_empty() {
        let result = get_media_thumbnail("/path/to/video.mp4".to_string(), 5.0).await.unwrap();
        assert!(result.is_empty());
    }
}
