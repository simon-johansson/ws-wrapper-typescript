import Channel from "./Channel";
import EventHandler from "./EventHandler";

export interface IConstructorOptions {
  debug?: any;
  errorToJSON?: any;
  requestTimeout?: number;
}

export interface IEvent {
  name: string,
  args: any[],
  requestId: number;
}

// export interface IWebsocket {
//   readyState: number;
//   CONNECTING: number;
//   OPEN: number;
//   onopen: (event?: any) => void;
//   send: (event?: any) => void;
//   onmessage: (event: any) => void;
//   onerror: (event: any) => void;
//   onclose: (event: any) => void;
//   close: () => void;
// }

export default class WebSocketWrapper extends EventHandler {
  /* Maximum number of items in the send queue.  If a user tries to send more
	messages than this number while a WebSocket is not connected, errors will
	be thrown. */
  public static MAX_SEND_QUEUE_SIZE = 10;

  /* Object of WebSocketChannels (except `this` associated with this
  WebSocket); keys are the channel name. */
  public channels: any = {};
  // Object containing user-assigned socket data
  public data: any = {};
  public socket: any;
  public requestTimeout: number;

  protected wrapper: WebSocketWrapper;

  // private wrapper: WebSocketWrapper;
  private debug: (msg: string, ...rest: string[]) => void;
  private errorToJSON: (err: any) => string;
  // Flag set once the socket is opened
  private opened: boolean = false;
  // Array of data to be sent once the connection is opened
  private pendingSend: any[] = [];
  // Incrementing request ID counter for this WebSocket
  private lastRequestId: number = 0;
  /* Object of pending requests; keys are the request ID, values are
  Objects containing `resolve` and `reject` functions used to
  resolve the request's Promise. */
  private pendingRequests: any = {};

  constructor(socket: WebSocket, options: IConstructorOptions = {}) {
    // Make `this` a WebSocketChannel
    super();
    this.wrapper = this;

    options = options || {};
    if (typeof options.debug === "function") {
      this.debug = options.debug;
    } else if (options.debug === true) {
      this.debug = console.log.bind(console);
    } else {
      this.debug = () => {
        return;
      }; // no-op
    }
    if (typeof options.errorToJSON !== "function") {
      this.errorToJSON = (err: any) => {
        if (typeof window === "undefined") {
          return JSON.stringify({
            message: err.message
          });
        } else {
          return JSON.stringify(err, Object.getOwnPropertyNames(err));
        }
      };
    } else {
      this.errorToJSON = options.errorToJSON;
    }
    if (
      typeof options.requestTimeout === "number" &&
      options.requestTimeout > 0
    ) {
      this.requestTimeout = options.requestTimeout || 0;
    }

    if (socket && socket.constructor) {
      this.bind(socket);
    }
  }

  get isConnecting() {
    return this.socket && this.socket.readyState === this.socket.CONNECTING; // this.socket.readyState? === this.socket.constructor.CONNECTING
  }

  get isConnected() {
    // console.log(this.socket);
    // console.log(this.socket.readyState);
    // console.log(this.socket.OPEN);

    return (
      // this.socket && this.socket.readyState === this.socket.constructor.OPEN
      this.socket && this.socket.readyState === this.socket.OPEN
    );
  }

  // Rejects all pending requests and then clears the send queue
  public abort() {
    for (const id in this.pendingRequests) {
      if (this.pendingRequests.hasOwnProperty(id)) {
        this.pendingRequests[id].reject(new Error("Request was aborted"));
      }
    }
    this.pendingRequests = {};
    this.pendingSend = [];
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close.apply(this.socket, arguments);
    }
  }

  public get(key: string) {
    return this.data[key];
  }

  public set(key: string, value: any) {
    this.data[key] = value;
  }

  // Returns a channel with the specified `namespace`
  public of(namespace: string | null) {
    if (namespace == null) {
      return this;
    }
    if (!this.channels[namespace]) {
      this.channels[namespace] = new Channel(namespace, this);
    }
    return this.channels[namespace];
  }

  public send(data: any, ignoreMaxQueueSize?: boolean) {
    if (this.isConnected) {
      this.debug("wrapper: Sending message:", data);
      this.socket.send(data);
    } else if (
      ignoreMaxQueueSize ||
      this.pendingSend.length < WebSocketWrapper.MAX_SEND_QUEUE_SIZE
    ) {
      this.debug("wrapper: Queuing message:", data);
      this.pendingSend.push(data);
    } else {
      throw new Error("WebSocket is not connected and send queue is full");
    }
  }

  /* The following methods are called by a WebSocketChannel to send data
		to the Socket. */
  public sendEvent(channel: any, eventName: any, args: any, isRequest?: any) {
    // Serialize data for sending over the socket
    const data: any = { a: args };
    if (channel != null) {
      data.c = channel;
    }
    let request;
    if (isRequest) {
      /* Unless we send petabytes of data using the same socket,
				we won't worry about `_lastRequestId` getting too big. */
      data.i = ++this.lastRequestId;
      // Return a Promise to the caller to be resolved later
      request = new Promise((resolve, reject) => {
        const pendReq: any = (this.pendingRequests[data.i] = {
          reject,
          resolve
        });
        if (this.requestTimeout > 0) {
          pendReq.timer = setTimeout(() => {
            reject(new Error("Request timed out"));
            delete this.pendingRequests[data.i];
          }, this.requestTimeout);
        }
      });
    }
    // Send the message
    this.send(JSON.stringify(data));
    // Return the request, if needed
    return request;
  }

  public sendResolve(id: any, data: any) {
    this.send(
      JSON.stringify({
        d: data,
        i: id
      }),
      true /* ignore max queue length */
    );
  }

  public sendReject(id: any, err: any) {
    const isError = err instanceof Error;
    if (isError) {
      err = JSON.parse(this.errorToJSON(err));
    }
    this.send(
      JSON.stringify({
        _: isError ? 1 : undefined,
        e: err,
        i: id
      }),
      true /* ignore max queue length */
    );
  }

  private bind(socket: WebSocket) {
    // Save the `socket` and add event listeners
    this.socket = socket;
    socket.onopen = (event: any) => {
      let i: number;
      this.opened = true;
      this.debug("socket: onopen");
      // Send all pending messages
      for (i = 0; i < this.pendingSend.length; i++) {
        if (this.isConnected) {
          this.debug("wrapper: Sending pending message:", this.pendingSend[i]);
          this.socket.send(this.pendingSend[i]);
        } else {
          break;
        }
      }
      this.pendingSend = this.pendingSend.slice(i);
      this.emit("open", event);
    };
    socket.onmessage = (event: any) => {
      // console.log(event.data);
      this.debug("socket: onmessage", event.data);
      this.emit("message", event, event.data);
      this.onMessage(event.data);
    };
    socket.onerror = (event: any) => {
      this.debug("socket: onerror", event);
      this.emit("error", event);
    };
    socket.onclose = (event: any) => {
      const opened = this.opened;
      this.opened = false;
      this.debug("socket: onclose", event);
      this.emit("close", event, opened);
      this.emit("disconnect", event, opened);
    };
    // If the socket is already open, send all pending messages now
    if (this.isConnected) {
      // console.log(true);
      // socket.onopen();
    }
  }

  // Called whenever the bound Socket receives a message
  private onMessage(msg: any) {
    try {
      msg = JSON.parse(msg);
      // If `msg` contains special ignore property, we'll ignore it
      // if (msg["ws-wrapper"] === false) {
      //   return;
      // }
      if (msg.a) {
        const argsArray: any = [];
        for (const i in msg.a) {
          if (msg.a.hasOwnProperty(i)) {
            argsArray[i] = msg.a[i];
          }
        }
        msg.a = argsArray;
      }
      // console.log(msg.a instanceof Array)
      // console.log(msg.a.length >= 1);
      // console.log(msg.c);
      // console.log(WebSocketChannel.NO_WRAP_EVENTS.indexOf(msg.a[0]) < 0);

      /* If `msg` does not have an `a` Array with at least 1 element,
        ignore the message because it is not a valid event/request */
      if (
        msg.a instanceof Array &&
        msg.a.length >= 1 &&
        (msg.c || Channel.NO_WRAP_EVENTS.indexOf(msg.a[0]) < 0)
      ) {
        // Process inbound event/request
        const event: IEvent = { name: msg.a.shift(), args: msg.a, requestId: msg.i };
        const channel = msg.c == null ? this : this.channels[msg.c];
        if (!channel) {
          if (msg.i >= 0) {
            this.sendReject(
              msg.i,
              new Error(`Channel '${msg.c}' does not exist`)
            );
          }
          this.debug(
            `wrapper: Event '${event.name}' ignored ` +
              `because channel '${msg.c}' does not exist.`
          );
        } else if (channel.emitter.emit(event.name, event)) {
          this.debug(
            `wrapper: Event '${event.name}' sent to ` + "event listener"
          );
        } else {
          if (msg.i >= 0) {
            this.sendReject(
              msg.i,
              new Error(
                "No event listener for '" +
                  event.name +
                  "'" +
                  (msg.c ? " on channel '" + msg.c + "'" : "")
              )
            );
          }
          this.debug(
            `wrapper: Event '${event.name}' had no ` + "event listener"
          );
        }
      } else if (this.pendingRequests[msg.i]) {
        this.debug("wrapper: Processing response for request", msg.i);
        // Process response to prior request
        if (msg.e !== undefined) {
          let err = msg.e;
          // `msg._` indicates that `msg.e` is an Error
          if (msg._ && err) {
            err = new Error(err.message);
            // Copy other properties to Error
            for (const key in msg.e) {
              if (msg.e.hasOwnProperty(key)) {
                err[key] = msg.e[key];
              }
            }
          }
          this.pendingRequests[msg.i].reject(err);
        } else {
          this.pendingRequests[msg.i].resolve(msg.d);
        }
        clearTimeout(this.pendingRequests[msg.i].timer);
        delete this.pendingRequests[msg.i];
      }
      // else ignore the message because it's not valid
    } catch (e) {
      // Non-JSON messages are ignored
      /* Note: It's also possible for uncaught exceptions from event
				handlers to end up here. */
    }
  }
}
