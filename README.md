# Stitch Cut — Multitrack 4K Video Editor

Desktop video editor (Tauri + React) with a multitrack timeline, precise cutting, and MP4 H.264 export via ffmpeg.

## Features

- **Standard home screen**: project name, 4K UHD / Full HD / HD presets, and recents that actually reopen (localStorage)
- **Media Pool**: real video/audio import with detected duration and resolution
- **Program Preview**: player synced to the timeline playhead
- **Multitrack timeline**: V2/V1/A1 tracks, zoom, split at playhead (✂), In/Out trim, mute/lock
- **Inspector**: numeric start/In/Out trimming, clip delete, per-clip or full-timeline export
- **Export**: clip or full timeline as MP4 H.264 (Tauri app); in-browser clip export as WebM

## Stack

- Frontend: React 18 + TypeScript + Vite + Zustand + Vitest
- Backend: Rust + Tauri 2.0 (commands + TDD TimelineService)
- Video: system ffmpeg/ffprobe for probing and export

## Prerequisites

- Node 22 + npm
- Stable Rust
- ffmpeg on PATH: `brew install ffmpeg`

## Development

```bash
npm install
npm run dev          # frontend at http://localhost:1420
npm run tauri dev    # desktop app
```

## Quality Gates

```bash
npm run test:run     # 63 Vitest tests
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm run format:check # pre-commit + CI
cargo test --manifest-path src-tauri/Cargo.toml
```

The pre-commit hook (husky + lint-staged) runs prettier, eslint, and typecheck. CI (`.github/workflows/ci.yml`) validates frontend and backend, including `cargo clippy -- -D warnings`.

## Layout

```
src/                    # React: components/, stores/, lib/, types/
src-tauri/src/
  commands/             # media, project, timeline, export (ffmpeg)
  models/               # Project, Track, Clip, MediaInfo
  services/             # TimelineService (split/trim/move)
```
