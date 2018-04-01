import ApiProxy from "./ApiProxy";
import AwaitingResponseHandler from "./AwaitingResponseHandler";
import Channel from "./Channel";
import ChannelHandler from "./ChannelHandler";
import Debug from "./Debug";
import EventFactory, { IsQueryEvent, IsResponseEvent } from "./EventFactory";
import SocketConnection from "./SocketConnection";

export interface IConstructorOptions {
  requestTimeout?: number;
}

export default class WebSocketWrapper extends ApiProxy {
  public static MAX_SEND_QUEUE_SIZE = 10;

  protected channelHandler: ChannelHandler;

  private pendingSend: any[] = [];
  private socketConnection: SocketConnection;
  private awaitingResponseHandler = new AwaitingResponseHandler();

  constructor(socket: WebSocket, options: IConstructorOptions = {}) {
    super();

    options = options || {};

    if (typeof options.requestTimeout === "number" && options.requestTimeout > 0) {
      this.awaitingResponseHandler.setDefaultTimeout = options.requestTimeout;
    }

    this.channelHandler = new ChannelHandler(
      this.awaitingResponseHandler.register.bind(this.awaitingResponseHandler),
      this.sendEvent.bind(this)
    );

    this.bind(socket);
  }

  get isConnecting() {
    return this.socketConnection.isConnecting;
  }

  get isConnected() {
    return this.socketConnection.isConnected;
  }

  // Rejects all pending requests and then clears the send queue
  public abort() {
    this.awaitingResponseHandler.abort();
    this.pendingSend = [];
  }

  public disconnect(...args: any[]) {
    this.socketConnection.disconnect(...args);
  }

  // Returns a channel with the specified `namespace`
  public of(channelName: string | null) {
    if (channelName == null) {
      return this;
    }
    return this.channelHandler.getOrCreateChannel(channelName);
  }

  public send(data: any, ignoreMaxQueueSize?: boolean) {
    if (this.isConnected) {
      this.socketConnection.send(data);
    } else if (ignoreMaxQueueSize || this.pendingSend.length < WebSocketWrapper.MAX_SEND_QUEUE_SIZE) {
      Debug.log("Queuing message: %o", data);
      this.pendingSend.push(data);
    } else {
      throw new Error("WebSocket is not connected and send queue is full");
    }
  }

  public sendEvent(event: { toJSON: string; type: string }) {
    Debug.log(`Attempting to send %s event`, event.type);
    this.send(event.toJSON);
  }

  public bind(socket: WebSocket) {
    this.socketConnection = new SocketConnection(socket);
    this.socketConnection.bindEvents(
      this.onSocketConnected.bind(this),
      this.onSocketMessage.bind(this),
      this.onSocketError.bind(this),
      this.onSocketDisconnected.bind(this)
    );
  }

  private onSocketConnected(event: any) {
    let i: number;
    // Send all pending messages
    for (i = 0; i < this.pendingSend.length; i++) {
      if (this.isConnected) {
        Debug.log("Sending queued message: %o", this.pendingSend[i]);
        this.socketConnection.send(this.pendingSend[i]);
      } else {
        break;
      }
    }
    this.pendingSend = this.pendingSend.slice(i);
    this.channelHandler.handleSpecialEvent("open", event);
  }
  private onSocketMessage(event: any) {
    this.onMessage(event.data);
    this.channelHandler.handleSpecialEvent("message", event, event.data);
  }
  private onSocketError(event: any) {
    this.channelHandler.handleSpecialEvent("error", event);
  }
  private onSocketDisconnected(event: any) {
    this.channelHandler.handleSpecialEvent("close", event);
  }

  // Called whenever the bound Socket receives a message
  private onMessage(rawEvent: any) {
    try {
      const event = EventFactory.parse(rawEvent);

      if (IsResponseEvent(event)) {
        this.awaitingResponseHandler.respondToEvent(event);
      } else if (IsQueryEvent(event)) {
        this.channelHandler.handleIncomingEvent(event);
      }
    } catch (e) {
      Debug.error(e);
      // Non-JSON messages are ignored
      /* Note: It's also possible for uncaught exceptions from event
				handlers to end up here. */
    }
  }
}
