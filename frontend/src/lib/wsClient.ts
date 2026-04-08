import type { InboundMessage, MessageType, OutboundMessage } from '../types/ws';

type Handler = (msg: OutboundMessage) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private url = '';
  private shouldReconnect = false;
  private _connected = false;
  private connectListeners = new Set<(connected: boolean) => void>();

  get connected(): boolean {
    return this._connected;
  }

  connect(url: string): void {
    // Clean up any existing connection first
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        return;
      }
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.url = url;
    this.shouldReconnect = true;
    this.reconnectDelay = 1000;
    this.doConnect();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnected(false);
  }

  send(msg: InboundMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on(type: MessageType | '*', handler: Handler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectListeners.add(listener);
    return () => this.connectListeners.delete(listener);
  }

  private doConnect(): void {
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.setConnected(true);
    };

    this.ws.onclose = () => {
      this.setConnected(false);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: OutboundMessage = JSON.parse(event.data);
        this.emit(msg);
      } catch {
        console.error('Failed to parse WS message');
      }
    };
  }

  private emit(msg: OutboundMessage): void {
    this.handlers.get(msg.type)?.forEach((h) => h(msg));
    this.handlers.get('*')?.forEach((h) => h(msg));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.doConnect();
    }, this.reconnectDelay);
  }

  private setConnected(value: boolean): void {
    this._connected = value;
    this.connectListeners.forEach((l) => l(value));
  }
}

export const wsClient = new WSClient();
