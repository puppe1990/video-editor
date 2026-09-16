use serde::{Deserialize, Serialize};
use std::fmt::Write as _;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeResult {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
}

impl Default for ProbeResult {
    fn default() -> Self {
        Self {
            duration: 0.0,
            width: 0,
            height: 0,
            fps: 0.0,
        }
    }
}

pub fn probe_media(path: &str) -> ProbeResult {
    let out = std::process::Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,avg_frame_rate,duration",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            path,
        ])
        .output();
    let Ok(out) = out else {
        return ProbeResult::default();
    };
    let Ok(json): Result<serde_json::Value, _> = serde_json::from_slice(&out.stdout) else {
        return ProbeResult::default();
    };
    let stream = json.get("streams").and_then(|s| s.get(0));
    let width = stream
        .and_then(|s| s.get("width"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let height = stream
        .and_then(|s| s.get("height"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let fps_str = stream
        .and_then(|s| s.get("avg_frame_rate"))
        .and_then(|v| v.as_str())
        .unwrap_or("0/1");
    let fps = parse_fps(fps_str);
    let duration = stream
        .and_then(|s| s.get("duration"))
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .or_else(|| {
            json.get("format")
                .and_then(|f| f.get("duration"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f64>().ok())
        })
        .unwrap_or(0.0);
    ProbeResult {
        duration,
        width,
        height,
        fps,
    }
}

fn parse_fps(s: &str) -> f64 {
    let mut parts = s.split('/');
    let num: f64 = parts.next().and_then(|p| p.parse().ok()).unwrap_or(0.0);
    let den: f64 = parts.next().and_then(|p| p.parse().ok()).unwrap_or(1.0);
    if den == 0.0 {
        0.0
    } else {
        num / den
    }
}

fn run_ffmpeg(args: &[&str]) -> Result<(), String> {
    let status = std::process::Command::new("ffmpeg")
        .arg("-y")
        .args(args)
        .output()
        .map_err(|e| {
            format!("Falha ao executar ffmpeg: {e} (instale via `brew install ffmpeg`)")
        })?;
    if status.status.success() {
        Ok(())
    } else {
        Err(format!(
            "ffmpeg falhou: {}",
            String::from_utf8_lossy(&status.stderr)
                .chars()
                .take(500)
                .collect::<String>()
        ))
    }
}

#[tauri::command]
pub async fn export_clip(input: String, output: String, ss: f64, t: f64) -> Result<String, String> {
    if t <= 0.0 {
        return Err("Duração do corte deve ser maior que zero".to_string());
    }
    run_ffmpeg(&[
        "-ss",
        &ss.to_string(),
        "-i",
        &input,
        "-t",
        &t.to_string(),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        &output,
    ])?;
    Ok(output)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSegment {
    pub path: String,
    pub ss: f64,
    pub t: f64,
}

#[tauri::command]
pub async fn export_timeline(
    segments: Vec<ExportSegment>,
    output: String,
) -> Result<String, String> {
    if segments.is_empty() {
        return Err("Timeline vazia: nada para exportar".to_string());
    }
    if segments.len() == 1 {
        let s = &segments[0];
        return export_clip_inner(&s.path, &output, s.ss, s.t).await;
    }
    let tmp = std::env::temp_dir().join(format!("stitchcut-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;
    let list_file = tmp.join("concat.txt");
    let mut list_content = String::new();
    for (i, s) in segments.iter().enumerate() {
        let part = tmp.join(format!("part{i}.mp4"));
        export_clip_inner(&s.path, &part.to_string_lossy(), s.ss, s.t).await?;
        writeln!(
            list_content,
            "file '{}'",
            part.to_string_lossy().replace('\'', "'\\''")
        )
        .unwrap();
    }
    std::fs::write(&list_file, list_content).map_err(|e| e.to_string())?;
    run_ffmpeg(&[
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        &list_file.to_string_lossy(),
        "-c",
        "copy",
        &output,
    ])?;
    let _ = std::fs::remove_dir_all(&tmp);
    Ok(output)
}

async fn export_clip_inner(input: &str, output: &str, ss: f64, t: f64) -> Result<String, String> {
    export_clip(input.to_string(), output.to_string(), ss, t).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_fps_fraction() {
        assert!((parse_fps("30000/1001") - 29.97).abs() < 0.01);
        assert_eq!(parse_fps("30/1"), 30.0);
        assert_eq!(parse_fps("0/0"), 0.0);
    }

    #[test]
    fn test_probe_missing_file_returns_default() {
        let r = probe_media("/caminho/que/nao/existe.mp4");
        assert_eq!(r.duration, 0.0);
        assert_eq!(r.width, 0);
    }

    #[tokio::test]
    async fn test_export_clip_zero_duration_fails() {
        let r = export_clip("in.mp4".to_string(), "out.mp4".to_string(), 0.0, 0.0).await;
        assert!(r.is_err());
    }

    #[tokio::test]
    async fn test_export_timeline_empty_fails() {
        let r = export_timeline(vec![], "out.mp4".to_string()).await;
        assert!(r.is_err());
    }
}
