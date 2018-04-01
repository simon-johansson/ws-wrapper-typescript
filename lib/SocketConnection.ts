import Debug from "./Debug";

export interface IWebsocket {
  readyState: number;
  CONNECTING: number;
  OPEN: number;
  send: (event?: any) => void;
  onopen: (event?: any) => void;
  onmessage: (event: any) => void;
  onerror: (event: any) => void;
  onclose: (event: any) => void;
  close: () => void;
}

export type IBindFn = (data: any) => void;

export default class SocketConnection {
  constructor(private webSocket: IWebsocket) {}

  public bindEvents(onConnected: IBindFn, onMessage: IBindFn, onError: IBindFn, onDisconnected: IBindFn) {
    this.webSocket.onopen = (event: any) => {
      Debug.log("WebSocket is connected");
      onConnected(event);
    };
    this.webSocket.onmessage = (event: any) => {
      Debug.log("WebSocket received message: %o", event.data);
      onMessage(event);
    };
    this.webSocket.onerror = (event: any) => {
      Debug.log("WebSocket encountered an error");
      onError(event);
    };
    this.webSocket.onclose = (event: any) => {
      Debug.log("WebSocket connection closed with status code: %d", event.code);
      onDisconnected(event);
    };

    // Run onConnected if socket is already connected
  }

  get isConnecting() {
    return this.webSocket.readyState === this.webSocket.CONNECTING;
  }

  get isConnected() {
    return this.webSocket.readyState === this.webSocket.OPEN;
  }

  public disconnect(...args: any[]) {
    this.webSocket.close.apply(this.webSocket, args);
  }

  public send(event: any) {
    Debug.log("WebSocket is sending message: %o", event);
    this.webSocket.send(event);
  }
}
