# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**qhat** is a lightweight, no-account 1:1 video chat web app with live text translation. Users generate a room link, share it, and both parties connect with WebRTC video and a chat panel that auto-translates messages via DeepL API.

See `PRD_VideoChat_v1.md` for full product requirements.

## Architecture

- **Frontend:** React + Vite + Tailwind CSS (in `frontend/`)
- **Backend:** Go signaling server with `gorilla/websocket` (in `server/`)
- **Video:** WebRTC peer-to-peer (browser-native, no SFU)
- **Translation:** DeepL REST API (server-side only, key never exposed to client)
- **State:** In-memory Go maps (no database, rooms are ephemeral)
- **TURN:** coturn (self-hosted on Hetzner VPS)

Communication flow: browsers connect to Go server via WebSocket for signaling (offer/answer/ICE) and chat messages. Video/audio goes P2P via WebRTC. Translation requests go from Go server to DeepL API, translated messages are relayed back via WebSocket.

## Build & Run Commands

### Go Backend
```bash
cd server
go build ./...              # Compile check (always run after Go changes)
go test ./...               # Run all tests
go test ./internal/room     # Run tests for a specific package
go test -run TestRoomJoin ./internal/room  # Run a single test
go vet ./...                # Static analysis
```

### React Frontend
```bash
cd frontend
npm install                 # Install dependencies
npm run dev                 # Dev server
npm run build               # Production build
npm run lint                # Lint
npm run test                # Run tests
```

## WebSocket Message Protocol

All messages are JSON over WebSocket. Key types: `join`, `offer`, `answer`, `ice`, `chat`, `peer_joined`, `peer_left`, `room_full`. See PRD section 8 for full schema.

## Key Constraints

- Max 2 users per room; third connection rejected
- Room destroyed when both users disconnect
- Room ID: UUID v4; room code: first 6 chars of UUID
- Rate limits: 10 room creations/IP/hour, 60 messages/user/minute, 5 failed joins/IP/10min
- All comments and Swagger annotations must be in English
