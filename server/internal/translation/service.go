package translation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Translator translates text between languages.
type Translator interface {
	Translate(ctx context.Context, text, sourceLang, targetLang string) (string, error)
}

// DeepLTranslator calls the DeepL API for translation.
type DeepLTranslator struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// NewDeepLTranslator creates a translator using the DeepL API.
func NewDeepLTranslator(apiKey, baseURL string) *DeepLTranslator {
	return &DeepLTranslator{
		apiKey:  apiKey,
		baseURL: strings.TrimSuffix(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type deepLResponse struct {
	Translations []struct {
		Text string `json:"text"`
	} `json:"translations"`
}

// Translate sends text to DeepL and returns the translated string.
func (d *DeepLTranslator) Translate(ctx context.Context, text, sourceLang, targetLang string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	form := url.Values{}
	form.Set("text", text)
	form.Set("source_lang", strings.ToUpper(sourceLang))
	form.Set("target_lang", strings.ToUpper(targetLang))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.baseURL+"/translate", strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("deepl: create request: %w", err)
	}
	req.Header.Set("Authorization", "DeepL-Auth-Key "+d.apiKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("deepl: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("deepl: status %d", resp.StatusCode)
	}

	var result deepLResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("deepl: decode response: %w", err)
	}

	if len(result.Translations) == 0 {
		return "", fmt.Errorf("deepl: empty translation response")
	}

	return result.Translations[0].Text, nil
}

// NoOpTranslator returns text unchanged. Used when no API key is configured.
type NoOpTranslator struct{}

// Translate returns the original text without translation.
func (n *NoOpTranslator) Translate(_ context.Context, text, _, _ string) (string, error) {
	return text, nil
}
