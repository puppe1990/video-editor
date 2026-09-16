# Stitch Cut — Editor de Vídeo Multicamadas 4K

Editor de vídeo desktop (Tauri + React) com timeline multicamadas, corte preciso e export em MP4 H.264 via ffmpeg.

## Features

- **Tela inicial padrão**: nome do projeto, presets 4K UHD / Full HD / HD e recentes que reabrem de verdade (localStorage)
- **Media Pool**: import de vídeo/áudio real com duração e resolução detectadas
- **Preview Program**: player sincronizado com o playhead da timeline
- **Timeline multicamadas**: tracks V2/V1/A1, zoom, split no playhead (✂), trim In/Out, mute/lock
- **Inspector**: ajuste numérico de start/In/Out, excluir clipe, export por clipe ou da timeline
- **Export**: clipe ou timeline completa em MP4 H.264 (app Tauri); no browser, export de clipe em WebM

## Stack

- Frontend: React 18 + TypeScript + Vite + Zustand + Vitest
- Backend: Rust + Tauri 2.0 (commands + TimelineService com TDD)
- Vídeo: ffmpeg/ffprobe (sistema) para probe e export

## Pré-requisitos

- Node 22 + npm
- Rust stable
- ffmpeg no PATH: `brew install ffmpeg`

## Desenvolvimento

```bash
npm install
npm run dev          # frontend em http://localhost:1420
npm run tauri dev    # app desktop
```

## Qualidade

```bash
npm run test:run     # 63 testes Vitest
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm run format:check # pre-commit + CI
cargo test --manifest-path src-tauri/Cargo.toml
```

Pre-commit (husky + lint-staged) roda prettier, eslint e typecheck. O CI (`.github/workflows/ci.yml`) valida frontend e backend, incluindo `cargo clippy -- -D warnings`.

## Estrutura

```
src/                    # React: components/, stores/, lib/, types/
src-tauri/src/
  commands/             # media, project, timeline, export (ffmpeg)
  models/               # Project, Track, Clip, MediaInfo
  services/             # TimelineService (split/trim/move)
```
