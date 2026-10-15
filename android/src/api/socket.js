import { BASE_URL } from './client';

class RealtimeSocketManager {
  constructor() {
    this.ws = null;
    this.token = null;
    this.userId = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
  }

  connect(token, userId) {
    if (!token) return;
    this.token = token;
    this.userId = userId;

    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    const host = BASE_URL.replace('/api', '').replace('http', 'ws');
    const wsUrl = `${host}/ws/socket.io/?EIO=4&transport=websocket&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('⚡ React Native Socket Connected (Zero Latency)');
        // Send Engine.IO probe / handshake if required
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = event.data;
          // Parse Engine.IO / Socket.IO packet frames (42["event_name", payload])
          if (typeof msg === 'string' && msg.startsWith('42')) {
            const parsed = JSON.parse(msg.substring(2));
            if (Array.isArray(parsed) && parsed.length >= 2) {
              const [eventName, payload] = parsed;
              this.notifyListeners(eventName, payload);
            }
          }
        } catch (e) {
          // Socket frame parse handler
        }
      };

      this.ws.onerror = (err) => {
        console.log('Socket note:', err.message);
      };

      this.ws.onclose = () => {
        // Reconnect after 3 seconds
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (this.token) this.connect(this.token, this.userId);
        }, 3000);
      };
    } catch (e) {
      console.log('Socket connect note:', e);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event).filter((cb) => cb !== callback);
    this.listeners.set(event, callbacks);
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => cb(data));
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
  }
}

export const socketManager = new RealtimeSocketManager();
