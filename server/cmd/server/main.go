package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/lkobylski/qhat/server/internal/chat"
	"github.com/lkobylski/qhat/server/internal/config"
	"github.com/lkobylski/qhat/server/internal/lobby"
	"github.com/lkobylski/qhat/server/internal/ratelimit"
	"github.com/lkobylski/qhat/server/internal/room"
	"github.com/lkobylski/qhat/server/internal/signaling"
	"github.com/lkobylski/qhat/server/internal/translation"
	"github.com/lkobylski/qhat/server/internal/ws"
)

func main() {
	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	rm := room.NewManager()

	var translator translation.Translator
	if cfg.DeepLAPIKey != "" {
		translator = translation.NewDeepLTranslator(cfg.DeepLAPIKey, cfg.DeepLAPIURL)
		log.Println("DeepL translation enabled")
	} else {
		translator = &translation.NoOpTranslator{}
		log.Println("WARNING: No DEEPL_API_KEY set, translation disabled")
	}

	rl := ratelimit.NewLimiter()
	rl.StartCleanup(5 * time.Minute)

	chatProc := chat.NewProcessor(translator)
	lobbyMgr := lobby.NewManager()
	hub := signaling.NewHub(rm, cfg, chatProc, rl, lobbyMgr)

	rm.StartCleanup(5 * time.Minute)

	mux := http.NewServeMux()
	mux.Handle("/ws", ws.NewHandler(hub, cfg.AllowedOrigins))
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/room/code/", roomCodeHandler(rm))
	mux.HandleFunc("/api/debug", debugHandler(cfg, rm, lobbyMgr))

	// Serve frontend static files in production
	if !cfg.IsDevelopment() {
		mux.Handle("/", http.FileServer(http.Dir("./frontend/dist")))
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      corsMiddleware(cfg.AllowedOrigins, mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("qhat server starting on :%s (env=%s)", cfg.Port, cfg.Env)
	log.Fatal(srv.ListenAndServe())
}

// debugHandler returns server stats including DeepL usage.
func debugHandler(cfg *config.Config, rm *room.Manager, lob *lobby.Manager) http.HandlerFunc {
	httpClient := &http.Client{Timeout: 5 * time.Second}

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		result := map[string]interface{}{
			"rooms":      rm.Count(),
			"lobbyUsers": lob.Count(),
			"env":        cfg.Env,
		}

		// Fetch DeepL usage
		if cfg.DeepLAPIKey != "" {
			req, err := http.NewRequest("GET", cfg.DeepLAPIURL+"/usage", nil)
			if err == nil {
				req.Header.Set("Authorization", "DeepL-Auth-Key "+cfg.DeepLAPIKey)
				resp, err := httpClient.Do(req)
				if err == nil {
					defer resp.Body.Close()
					var usage struct {
						CharacterCount int64 `json:"character_count"`
						CharacterLimit int64 `json:"character_limit"`
					}
					if json.NewDecoder(resp.Body).Decode(&usage) == nil {
						pct := float64(0)
						if usage.CharacterLimit > 0 {
							pct = float64(usage.CharacterLimit-usage.CharacterCount) / float64(usage.CharacterLimit) * 100
						}
						result["deepl"] = map[string]interface{}{
							"used":         usage.CharacterCount,
							"limit":        usage.CharacterLimit,
							"remaining":    usage.CharacterLimit - usage.CharacterCount,
							"remainingPct": math.Round(pct*10) / 10,
						}
					}
				}
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// roomCodeHandler resolves a 6-char room code to the full room ID.
// GET /api/room/code/{code}
func roomCodeHandler(rm *room.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		code := strings.TrimPrefix(r.URL.Path, "/api/room/code/")
		if code == "" {
			http.Error(w, "code is required", http.StatusBadRequest)
			return
		}

		room := rm.GetByCode(code)
		if room == nil {
			http.Error(w, "room not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"roomId": room.ID})
	}
}

func corsMiddleware(allowedOrigins []string, next http.Handler) http.Handler {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if originSet[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
