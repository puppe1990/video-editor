export interface Resolution {
  width: number;
  height: number;
}

export interface ProjectConfig {
  resolution: Resolution;
  fps: number;
  sample_rate: number;
}

export interface ExportConfig {
  output_path: string;
  format: ExportFormat;
  quality: ExportQuality;
  resolution?: Resolution;
}

export type ExportFormat = "Mp4" | "Mov" | "Webm" | "Avi";
export type ExportQuality = "Low" | "Medium" | "High" | "Lossless";

export interface Clip {
  id: string;
  media_id: string;
  start_time: number;
  duration: number;
  in_point: number;
  out_point: number;
}

export interface Track {
  id: string;
  name: string;
  track_type: TrackType;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
}

export type TrackType = "Video" | "Audio";

export interface Project {
  id: string;
  name: string;
  tracks: Track[];
  config: ProjectConfig;
  created_at: string;
  updated_at: string;
}

export interface MediaInfo {
  id: string;
  path: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  media_type: MediaType;
}

export type MediaType = "Video" | "Audio" | "Image";

export const FULL_HD: Resolution = { width: 1920, height: 1080 };
export const HD: Resolution = { width: 1280, height: 720 };
export const UHD_4K: Resolution = { width: 3840, height: 2160 };

export const defaultProjectConfig: ProjectConfig = {
  resolution: FULL_HD,
  fps: 30,
  sample_rate: 48000,
};
