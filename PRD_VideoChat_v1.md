# PRD — 1:1 Video Chat with Live Translation
**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-04-08

---

## 1. Overview

A lightweight, no-account web application for 1:1 video conversations between people who speak different languages. One person generates a room link, shares it, and both parties connect — with a text chat panel that automatically translates messages into each participant's chosen language.

**Target users:** Anyone on the internet — friends, couples, language exchange partners, lifestyle/social use.  
**Core value prop:** Remove the language barrier from face-to-face video calls, without requiring accounts or downloads.

---

## 2. Goals

| Goal | Description |
|---|---|
| Zero friction | No sign-up, no install, open browser and go |
| Language bridge | Each person writes in their language, sees the other's message translated |
| Privacy-light | No persistent data, no accounts, rooms expire when empty |
| POC scope | 1:1 only, text + video, mobile-friendly but desktop-first |

---

## 3. Out of scope (POC)

- Audio transcription / speech-to-text translation
- Recording or transcript export
- More than 2 participants
- Moderation / reporting system (beyond basic rate limiting)
- Authentication / user accounts
- Mobile native app

---

## 4. User Stories

### Room Creator
- As a user, I want to generate a unique room link so I can share it with someone I want to talk to.
- As a user, I want to enter my name and select my language before entering the room.
- As a user, I want to wait in a lobby and see when my conversation partner joins.
- As a user, I want to see a live video feed of my partner and a small thumbnail of myself.
- As a user, I want to type a message in my language and have my partner see it translated into theirs.
- As a user, I want to see both the original and translated version of every message.
- As a user, I want to leave the room and have the session end cleanly.

### Room Joiner
- As a user, I want to open a link and immediately understand I'm joining a video call.
- As a user, I want to enter my name and select my language before joining.
- As a user, I want to join the room and connect automatically without any technical steps.
- As a user, I want the same chat + video experience as the creator.

---

## 5. UX Flow

```
[Landing / Room Creation]
  User visits app
  → Clicks "Start a conversation"
  → Enters name + selects language
  → Room link + room code generated
  → Share options shown (copy link / copy code)
  → Enters lobby ("Waiting for someone to join...")

[Join Flow]
  Second user opens link (or enters code)
  → Enters name + selects language
  → Clicks "Join"
  → WebRTC connection initiated

[Active Room]
  ┌─────────────────────────────────┐
  │   Partner video (full width)    │
  │                    ┌──────────┐ │
  │                    │ My thumb │ │
  │                    └──────────┘ │
  ├─────────────────────────────────┤
  │ CHAT                            │
  │  [Partner name] 14:32           │
  │  Hola, ¿cómo estás?             │
  │  → Hi, how are you?             │
  │                                 │
  │  [Me] 14:33                     │
  │  I'm good, thanks!              │
  │  → ¡Estoy bien, gracias!        │
  │                                 │
  │  [Type a message...]  [Send]    │
  └─────────────────────────────────┘

[End of Session]
  Either user clicks "Leave"
  → Connection closed
  → Room state cleared from memory
  → Both users see "Conversation ended" screen
```

---

## 6. Functional Requirements

### 6.1 Room Management
- `FR-01` Room ID: UUID v4, used as both URL slug and joinable code
- `FR-02` Room is created on first user arrival, destroyed when both users disconnect
- `FR-03` Room link format: `https://app.domain.com/room/{uuid}`
- `FR-04` Room code: first 6 chars of UUID (human-readable alternative)
- `FR-05` Room is valid indefinitely while at least one user is connected
- `FR-06` Maximum 2 users per room; third connection attempt is rejected

### 6.2 Video
- `FR-07` WebRTC peer-to-peer video connection (no SFU needed for 1:1)
- `FR-08` TURN server required for NAT traversal
- `FR-09` Partner video: full-width top section
- `FR-10` Self video: draggable thumbnail, bottom-right by default
- `FR-11` Camera and microphone permission requested on lobby entry
- `FR-12` Mute / camera-off toggle buttons visible during call

### 6.3 Chat
- `FR-13` Chat messages sent via WebSocket through signaling server
- `FR-14` Message structure: `{ sender, originalText, translatedText, timestamp, langFrom, langTo }`
- `FR-15` If both users have the same language selected → no translation, show text once
- `FR-16` Each message shows: sender name, original text, translated text (if different), timestamp
- `FR-17` Chat history is in-memory only — cleared on room destruction

### 6.4 Translation
- `FR-18` Translation triggered on message send (not while typing)
- `FR-19` DeepL API used for translation
- `FR-20` Language auto-detected on first message as fallback if user didn't select
- `FR-21` Translation happens server-side (API key never exposed to client)
- `FR-22` If translation fails → message delivered with original text + error indicator

### 6.5 Language Selection
- `FR-23` Language selector on lobby screen (before joining)
- `FR-24` Supported languages: all languages available in DeepL API
- `FR-25` Language preference stored in sessionStorage (not persisted across sessions)
- `FR-26` Language can be changed mid-session via settings panel

### 6.6 Rate Limiting
- `FR-27` Max 10 room creations per IP per hour
- `FR-28` Max 60 chat messages per user per minute
- `FR-29` Max 5 failed room join attempts per IP per 10 minutes

---

## 7. Non-Functional Requirements

| NFR | Target |
|---|---|
| Latency (video) | < 300ms P2P (dependent on network) |
| Latency (translation) | < 800ms from send to translated display |
| Browser support | Chrome 90+, Firefox 88+, Safari 15+, Edge 90+ |
| Uptime (POC) | Best-effort, no SLA |
| Concurrent rooms | ~50 simultaneous (single VPS, POC) |
| Mobile | Responsive layout, functional on iOS Safari / Android Chrome |

---

## 8. Technical Architecture

### Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast iteration, component model fits chat+video layout |
| Signaling server | Go + `gorilla/websocket` | Familiar stack, single binary deploy, solid WebSocket support |
| Video | WebRTC (browser-native) | P2P, free, no per-minute cost |
| TURN server | coturn (self-hosted) | Required for NAT traversal in production |
| Translation | DeepL REST API | Best quality for European langs, 500k chars/month free |
| State | In-memory Go map | No DB needed for POC, rooms are ephemeral |
| Hosting | Hetzner VPS (single instance) | Known setup, cheap, sufficient for POC scale |

### Component Overview

```
Browser A                    Hetzner VPS                    Browser B
─────────                    ──────────                     ─────────
React App ──WS──────────► Go Signaling Server ◄──WS──────── React App
          ◄── offer/answer/ICE candidates ──►
          
React App ──────────────────────────────────────────────── React App
          ◄──────── WebRTC P2P (video + audio) ───────────►

React App ──WS──► Go Server ──HTTP──► DeepL API
                      │
                      └── translatedMsg ──WS──► React App (B)
```

### WebSocket Message Protocol

```json
// Room join
{ "type": "join", "roomId": "uuid", "name": "Alice", "lang": "EN" }

// WebRTC signaling
{ "type": "offer",     "sdp": "..." }
{ "type": "answer",    "sdp": "..." }
{ "type": "ice",       "candidate": "..." }

// Chat
{ "type": "chat",      "text": "Hello!", "lang": "EN" }

// Server → client (translated)
{ "type": "chat", "from": "Alice", "original": "Hola!", "translated": "Hello!", "ts": 1712345678 }

// Room state
{ "type": "peer_joined", "name": "Bob",  "lang": "ES" }
{ "type": "peer_left" }
{ "type": "room_full" }
```

---

## 9. Screens / Pages

| Route | Description |
|---|---|
| `/` | Landing page — create room or enter code to join |
| `/room/:id` | Active room — lobby or connected state |
| `/room/:id/join` | Join flow for link recipients |

---

## 10. Future Roadmap (post-POC)

| Feature | Notes |
|---|---|
| Audio transcription + translation | Whisper API or Deepgram for STT, then translate |
| Report / block user | Basic abuse handling |
| Screen sharing | WebRTC `getDisplayMedia` |
| Room password | Optional 4-digit PIN for private rooms |
| Custom room slugs | Vanity URLs like `/room/coffee-with-jan` |
| SFU upgrade | Livekit for group calls (3+) |
| PWA / mobile wrapper | Improved mobile camera handling |

---

## 11. Open Questions

| # | Question | Priority |
|---|---|---|
| OQ-1 | What happens if DeepL API is down? Fallback to Google Translate? | Medium |
| OQ-2 | Should the lobby have a camera preview before joining? | Low |
| OQ-3 | App name / domain? | Low |
| OQ-4 | Should room codes be case-insensitive? | Low |
| OQ-5 | TURN server: same VPS or separate? (bandwidth consideration) | High |

---

## 12. Implementation Phases

### Phase 1 — Core POC
1. Go signaling server with WebSocket room management
2. React app skeleton — landing, lobby, room layout
3. WebRTC P2P video connection
4. Basic text chat (no translation yet)
5. coturn TURN server setup on VPS

### Phase 2 — Translation
6. DeepL API integration (server-side)
7. Language selector UI
8. Translated message display (original + translation)
9. Same-language detection (skip translation)

### Phase 3 — Polish
10. Rate limiting middleware
11. Responsive mobile layout
12. Camera/mic mute controls
13. Connection error handling + reconnect logic
14. Basic loading states, empty states, error screens
