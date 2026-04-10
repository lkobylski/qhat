package chat

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/lkobylski/qhat/server/internal/room"
	"github.com/lkobylski/qhat/server/internal/translation"
	"github.com/lkobylski/qhat/server/internal/ws"
)

// Processor handles chat message translation and delivery.
type Processor struct {
	translator translation.Translator
}

// Translator returns the underlying translator for direct use (e.g., lobby DMs).
func (p *Processor) Translator() translation.Translator {
	return p.translator
}

// NewProcessor creates a chat processor with the given translator.
func NewProcessor(t translation.Translator) *Processor {
	return &Processor{translator: t}
}

// Process translates a message and returns outbound messages for sender and receiver.
func (p *Processor) Process(
	ctx context.Context,
	sender *room.Participant,
	receiver *room.Participant,
	text string,
) (forSender *ws.OutboundMessage, forReceiver *ws.OutboundMessage) {
	ts := time.Now().Unix()

	base := ws.OutboundMessage{
		Type:      ws.TypeChat,
		From:      sender.Name,
		Original:  text,
		LangFrom:  sender.Lang,
		LangTo:    receiver.Lang,
		Timestamp: ts,
	}

	// Same language: skip translation
	if strings.EqualFold(sender.Lang, receiver.Lang) {
		base.Translated = text
		senderMsg := base
		receiverMsg := base
		return &senderMsg, &receiverMsg
	}

	translated, err := p.translator.Translate(ctx, text, sender.Lang, receiver.Lang)
	if err != nil {
		log.Printf("translation failed (%s→%s): %v", sender.Lang, receiver.Lang, err)
		// Deliver original text with failure flag
		base.Translated = text
		base.TranslationFailed = true
		senderMsg := base
		receiverMsg := base
		return &senderMsg, &receiverMsg
	}

	// Sender sees their original + what was translated
	senderMsg := base
	senderMsg.Translated = translated

	// Receiver sees original + translated version
	receiverMsg := base
	receiverMsg.Translated = translated

	return &senderMsg, &receiverMsg
}
