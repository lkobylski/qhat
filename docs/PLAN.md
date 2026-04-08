# Implementation Plan: qhat — 1:1 Video Chat with Live Translation

## Status: 🟡 In Progress
<!-- Use: 🔴 Not Started | 🟡 In Progress | 🟢 Complete | ⏸️ On Hold -->

**Last Updated**: 2026-04-08
**Started**: 2026-04-08

---

## Progress Summary

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Core Signaling + Video | Complete | 100% |
| Phase 2: Chat + Translation | Complete | 100% |
| Phase 3: Rate Limiting + Deploy | Complete | 100% |
| Phase 4: Bug Fixes | In Progress | 70% |
| Phase 5: Polish + Testing | Not Started | 0% |

---

## Feature Overview

### Business Context

qhat is a greenfield POC web application for 1:1 video conversations with automatic text chat translation. Users can create or join a room via link or code, select their language, and communicate via WebRTC video + WebSocket-relayed chat — with DeepL translating each message server-side so each participant reads in their own language. No accounts, no installs, no persistent data.

### Goals

- [x] Zero-friction room creation (no sign-up, share link or 6-char code)
- [x] WebRTC P2P video + audio between two participants
- [x] Server-side translation via DeepL (API key never exposed to client)
- [x] Same-language short-circuit (no unnecessary DeepL calls)
- [x] Rate limiting (room creation, join attempts, chat messages)
- [x] Deploy-ready configuration (nginx, systemd, coturn, docker-compose)
- [ ] End-to-end verified working (manual two-tab smoke test)
- [ ] Reconnect banner UI
- [ ] Draggable self-video thumbnail (FR-10)
- [ ] Language change mid-session (FR-26)
- [ ] Mobile responsive polish
- [ ] Unit tests for ratelimit, translation, chat packages

---

## Architecture Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Go + gorilla/websocket for signaling | Single binary deploy, familiar stack, solid WS support | 2026-04-08 |
| Hub pattern with central Dispatch() | Thread-safe routing of all WS message types in one place | 2026-04-08 |
| Fixed [2]*Participant array per room | Enforces max-2 constraint at the type level | 2026-04-08 |
| WebRTC P2P (no SFU) | 1:1 only scope, free, no per-minute cost | 2026-04-08 |
| DeepL for translation, NoOp fallback | Best quality for European languages; graceful degradation on failure | 2026-04-08 |
| In-memory state only | No DB needed for POC; rooms are ephemeral | 2026-04-08 |
| ICE candidate queuing in useWebRTC | Buffer candidates before setRemoteDescription completes — most common WebRTC bug | 2026-04-08 |
| Creator initiates offer on peer_joined | Avoids race between both sides trying to create offer | 2026-04-08 |
| TURN on same VPS (Hetzner) | Sufficient for POC ~50 rooms; simplifies ops | 2026-04-08 |
| sessionStorage for language preference | No persistence across sessions per FR-25 | 2026-04-08 |
| Vite proxy /wss -> /ws | Prevents Vite HMR WebSocket from colliding with app WebSocket in dev | 2026-04-08 |

---

## Implementation Phases

### Phase 1: Core Signaling + Video

- [x] 1.1: Initialize Go module (`github.com/lkobylski/qhat/server`) with gorilla/websocket, google/uuid, x/time/rate
- [x] 1.2: Config package (`server/internal/config/`) — LoadFromEnv()
- [x] 1.3: WebSocket message types + Client with ReadPump/WritePump (`server/internal/ws/`)
- [x] 1.4: Room, Participant, RoomManager with sync.RWMutex + periodic cleanup (`server/internal/room/`)
- [x] 1.5: Room package unit tests
- [x] 1.6: Signaling Hub with thread-safe client registry, offer/answer/ICE relay (`server/internal/signaling/`)
- [x] 1.7: Entry point — HTTP server, CORS, health check, room code lookup (`server/cmd/server/main.go`)
- [x] 1.8: React + Vite + Tailwind scaffold (`frontend/`)
- [x] 1.9: WebSocket client singleton with exponential backoff reconnect (`frontend/src/lib/wsClient.ts`)
- [x] 1.10: Hooks — useWebSocket, useMedia, useWebRTC (with ICE queuing), useRoom (state machine), useChat
- [x] 1.11: Pages — LandingPage, RoomPage, EndedPage
- [x] 1.12: Components — LobbyForm, WaitingScreen, VideoPanel, SelfVideo, MediaControls, ChatPanel, MessageBubble, ChatInput, LanguageSelect, ErrorBanner

### Phase 2: Chat + Translation

- [x] 2.1: Translator interface + DeepLTranslator (3s timeout) + NoOpTranslator fallback (`server/internal/translation/`)
- [x] 2.2: ChatProcessor with same-language short-circuit, separate sender/receiver message builds (`server/internal/chat/`)
- [x] 2.3: Wire ChatProcessor into Hub.handleChat
- [x] 2.4: useChat hook wired to ChatPanel, MessageBubble, ChatInput
- [x] 2.5: LanguageSelect component with full DeepL language list

### Phase 3: Rate Limiting + Deploy

- [x] 3.1: Token bucket rate limiter + HTTP middleware (`server/internal/ratelimit/`)
- [x] 3.2: Wire rate limits — room creation by IP, failed joins by IP, chat by client ID
- [x] 3.3: `.env.example` with all required env vars
- [x] 3.4: `docker-compose.yml` for local coturn
- [x] 3.5: `coturn/` config template
- [x] 3.6: `deploy/nginx.conf` + systemd service file
- [x] 3.7: `Makefile` with `make dev` (runs backend + frontend concurrently)

### Phase 4: Bug Fixes

- [x] 4.1: Fix Vite HMR WebSocket collision — proxy `/wss` to `/ws` in vite.config
- [x] 4.2: Fix race condition — WS connect triggered on join action, not on component mount
- [x] 4.3: Fix media permissions — camera/mic awaited before WebRTC setup begins
- [x] 4.4: Fix Hub data race — client/room maps protected by sync.RWMutex
- [x] 4.5: Fix text-only fallback — room transitions to `connected` after 5s even without WebRTC
- [ ] 4.6: Reconnect banner UI — show "Reconnecting..." during WS backoff
- [ ] 4.7: End-to-end manual smoke test (video + chat + translation across 2 tabs)

### Phase 5: Polish + Testing

- [ ] 5.1: Unit tests for `ratelimit` package
- [ ] 5.2: Unit tests for `translation` package
- [ ] 5.3: Unit tests for `chat` package
- [ ] 5.4: Draggable SelfVideo thumbnail (FR-10)
- [ ] 5.5: Language change mid-session settings panel (FR-26)
- [ ] 5.6: Mobile responsive layout polish
- [ ] 5.7: Better icons for MediaControls (replace text labels with SVG/icon components)

---

## File Manifest

### Go Backend (`server/`)

| File | Action | Phase | Status |
|------|--------|-------|--------|
| `server/go.mod` | Create | Phase 1 | Done |
| `server/cmd/server/main.go` | Create | Phase 1 | Done |
| `server/internal/config/config.go` | Create | Phase 1 | Done |
| `server/internal/ws/message.go` | Create | Phase 1 | Done |
| `server/internal/ws/client.go` | Create | Phase 1 | Done |
| `server/internal/room/room.go` | Create | Phase 1 | Done |
| `server/internal/room/manager.go` | Create | Phase 1 | Done |
| `server/internal/room/room_test.go` | Create | Phase 1 | Done |
| `server/internal/signaling/hub.go` | Create | Phase 1 | Done |
| `server/internal/translation/service.go` | Create | Phase 2 | Done |
| `server/internal/chat/processor.go` | Create | Phase 2 | Done |
| `server/internal/ratelimit/limiter.go` | Create | Phase 3 | Done |
| `server/internal/ratelimit/middleware.go` | Create | Phase 3 | Done |
| `server/internal/ratelimit/limiter_test.go` | Create | Phase 5 | Pending |
| `server/internal/translation/service_test.go` | Create | Phase 5 | Pending |
| `server/internal/chat/processor_test.go` | Create | Phase 5 | Pending |

### React Frontend (`frontend/`)

| File | Action | Phase | Status |
|------|--------|-------|--------|
| `frontend/src/lib/wsClient.ts` | Create | Phase 1 | Done |
| `frontend/src/types/ws.ts` | Create | Phase 1 | Done |
| `frontend/src/hooks/useWebSocket.ts` | Create | Phase 1 | Done |
| `frontend/src/hooks/useMedia.ts` | Create | Phase 1 | Done |
| `frontend/src/hooks/useWebRTC.ts` | Create | Phase 1 | Done |
| `frontend/src/hooks/useRoom.ts` | Create | Phase 1 | Done |
| `frontend/src/hooks/useChat.ts` | Create | Phase 2 | Done |
| `frontend/src/pages/LandingPage.tsx` | Create | Phase 1 | Done |
| `frontend/src/pages/RoomPage.tsx` | Create | Phase 1 | Done |
| `frontend/src/pages/EndedPage.tsx` | Create | Phase 1 | Done |
| `frontend/src/components/LobbyForm.tsx` | Create | Phase 1 | Done |
| `frontend/src/components/WaitingScreen.tsx` | Create | Phase 1 | Done |
| `frontend/src/components/VideoPanel.tsx` | Create | Phase 1 | Done |
| `frontend/src/components/SelfVideo.tsx` | Create | Phase 1 | Done |
| `frontend/src/components/MediaControls.tsx` | Create | Phase 1 | Done |
| `frontend/src/components/ChatPanel.tsx` | Create | Phase 2 | Done |
| `frontend/src/components/MessageBubble.tsx` | Create | Phase 2 | Done |
| `frontend/src/components/ChatInput.tsx` | Create | Phase 2 | Done |
| `frontend/src/components/LanguageSelect.tsx` | Create | Phase 2 | Done |
| `frontend/src/components/ErrorBanner.tsx` | Create | Phase 1 | Done |
| `frontend/src/components/ReconnectBanner.tsx` | Create | Phase 4 | Pending |

### Deploy + Config

| File | Action | Phase | Status |
|------|--------|-------|--------|
| `.env.example` | Create | Phase 3 | Done |
| `docker-compose.yml` | Create | Phase 3 | Done |
| `coturn/turnserver.conf` | Create | Phase 3 | Done |
| `deploy/nginx.conf` | Create | Phase 3 | Done |
| `deploy/qhat.service` | Create | Phase 3 | Done |
| `Makefile` | Create | Phase 3 | Done |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation | Status |
|------|--------|------------|------------|--------|
| ICE candidate race condition (before setRemoteDescription) | High | High | ICE queuing implemented in useWebRTC | Resolved |
| WebRTC fails behind symmetric NAT without TURN | High | Medium | coturn configured and wired | Mitigated |
| DeepL API outage or quota exhaustion | Medium | Low | NoOpTranslator fallback; error indicator in UI | Mitigated |
| Vite HMR WS collides with app WS in dev | Medium | High | Proxy /wss -> /ws in vite.config | Resolved |
| Race condition: WS connect before room join | High | Medium | WS connect now triggered on join action | Resolved |
| Hub map data race under concurrent connections | High | Medium | sync.RWMutex on client/room maps | Resolved |
| Text-only mode: room stuck in "connecting" forever | Medium | Medium | 5s timeout transitions to connected | Resolved |
| Mobile camera handling differences (iOS Safari) | Medium | Medium | Polish pass planned in Phase 5 | Open |
| DeepL language codes must be uppercase + compound formats (PT-BR) | Low | High | Canonical mapping in both Go and TS | Resolved |

---

## Blockers & Issues

| Issue | Raised | Resolved | Notes |
|-------|--------|----------|-------|
| Vite HMR WS collision | 2026-04-08 | 2026-04-08 | Fixed via vite.config proxy |
| Race: WS connect on mount | 2026-04-08 | 2026-04-08 | Fixed: connect on join action |
| Media permissions not awaited | 2026-04-08 | 2026-04-08 | Fixed: await before WebRTC setup |
| Hub maps unprotected | 2026-04-08 | 2026-04-08 | Fixed: sync.RWMutex added |
| Text-only stuck in connecting | 2026-04-08 | 2026-04-08 | Fixed: 5s fallback transition |

---

## Definition of Done

- [ ] All code implemented and compiling (`go build ./...` passes)
- [ ] Frontend build passes (`npm run build`)
- [ ] Room package tests passing
- [ ] Unit tests for ratelimit, translation, chat packages written and passing
- [ ] Manual end-to-end test: 2 browser tabs — create room, join, verify video + chat + translation
- [ ] Manual test: rate limiting with rapid requests
- [ ] Manual test: camera permission denied -> text-only mode banner
- [ ] Manual test: DeepL key invalid -> message delivered with error indicator
- [ ] Reconnect banner visible during WS backoff
- [ ] Mobile layout verified on iOS Safari / Android Chrome
- [ ] Deploy configs reviewed and ready

---

## Functional Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| FR-01 | Room ID: UUID v4 | Done |
| FR-02 | Room created on arrival, destroyed on empty | Done |
| FR-03 | Room link format: `/room/{uuid}` | Done |
| FR-04 | Room code: first 6 chars of UUID | Done |
| FR-05 | Room valid while at least one user connected | Done |
| FR-06 | Max 2 users per room | Done |
| FR-07 | WebRTC P2P video | Done |
| FR-08 | TURN server for NAT traversal | Done (coturn config) |
| FR-09 | Partner video full-width | Done |
| FR-10 | Self video draggable thumbnail | Pending (Phase 5) |
| FR-11 | Camera/mic permission requested before lobby | Done |
| FR-12 | Mute / camera-off toggle | Done |
| FR-13 | Chat via WebSocket through signaling server | Done |
| FR-14 | Message structure with original + translated | Done |
| FR-15 | Same-language: no translation, show text once | Done |
| FR-16 | Message shows sender, original, translated, timestamp | Done |
| FR-17 | Chat history in-memory only | Done |
| FR-18 | Translation triggered on send | Done |
| FR-19 | DeepL API for translation | Done |
| FR-20 | Language auto-detected as fallback | Done (DeepL handles) |
| FR-21 | Translation server-side only | Done |
| FR-22 | Translation fail: deliver original + error indicator | Done (NoOpTranslator) |
| FR-23 | Language selector on lobby screen | Done |
| FR-24 | All DeepL languages supported | Done |
| FR-25 | Language stored in sessionStorage | Done |
| FR-26 | Language changeable mid-session | Pending (Phase 5) |
| FR-27 | Max 10 room creations/IP/hour | Done |
| FR-28 | Max 60 chat messages/user/minute | Done |
| FR-29 | Max 5 failed joins/IP/10 min | Done |

---

## Change Log

| Date | Change | Details |
|------|--------|---------|
| 2026-04-08 | Plan created | Initial tracking document; captured Phase 1-3 as complete, Phase 4 bug fixes 5/7 done, Phase 5 not started |
