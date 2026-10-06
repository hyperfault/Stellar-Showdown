/**
 * WebSocket transport abstraction. The default factory uses the global
 * `WebSocket` available in browsers and Node >= 22; tests inject fakes.
 */

export interface TransportHandlers {
  onOpen(): void;
  onMessage(data: string): void;
  onClose(code: number, reason: string): void;
  onError(err: unknown): void;
}

export interface Transport {
  send(data: string): void;
  close(): void;
}

export type TransportFactory = (url: string, handlers: TransportHandlers) => Transport;

export const webSocketTransport: TransportFactory = (url, handlers) => {
  const ws = new WebSocket(url);
  let open = false;
  const queue: string[] = [];

  ws.onopen = () => {
    open = true;
    for (const msg of queue) ws.send(msg);
    queue.length = 0;
    handlers.onOpen();
  };
  ws.onmessage = (ev) => {
    handlers.onMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
  };
  ws.onclose = (ev) => handlers.onClose(ev.code, ev.reason);
  ws.onerror = (ev) => handlers.onError(ev);

  return {
    send(data) {
      if (open && ws.readyState === WebSocket.OPEN) ws.send(data);
      else queue.push(data);
    },
    close() {
      ws.close();
    },
  };
};
