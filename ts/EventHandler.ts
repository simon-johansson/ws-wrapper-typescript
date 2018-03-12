import WebSocketWrapper from "./WebSocketWrapper";

// TODO: Use native "events" module if in Node.js environment?
import { EventEmitter } from "eventemitter3";

/* A WebSocketChannel exposes an EventEmitter-like API for sending and handling
	events or requests over the channel through the attached WebSocketWrapper.

	`var channel = new WebSocketChannel(name, socketWrapper);`
		- `name` - the namespace for the channel
		- `socketWrapper` - the WebSocketWrapper instance to which data should
			be sent
*/
export default abstract class EventHandler {
  // List of "special" reserved events whose listeners don't need to be wrapped
  public static NO_WRAP_EVENTS = [
    "open",
    "message",
    "error",
    "close",
    "disconnect"
  ];

  public isChannel: boolean = false;
  public channelName: string | undefined = undefined;

  protected abstract wrapper: WebSocketWrapper;

  // This channel's EventEmitter
  private emitter: EventEmitter = new EventEmitter();
  // WeakMap of wrapped event listeners
  private wrappedListeners: WeakMap<any, any> = new WeakMap();
  private tempTimeout: number | undefined = undefined;

  /* Expose EventEmitter-like API
		When `eventName` is one of the `NO_WRAP_EVENTS`, the event handlers
		are left untouched, and the emitted events are just sent to the
		EventEmitter; otherwise, event listeners are wrapped to process the
		incoming request and the emitted events are sent to the WebSocketWrapper
		to be serialized and sent over the WebSocket. */
  public on(eventName: string, listener: () => void) {
    if (this.shouldNotWrapListener(eventName)) {
      /* Note: The following is equivalent to:
					`this._emitter.on(eventName, listener.bind(this));`
				But thanks to eventemitter3, the following is a touch faster. */
      this.emitter.on(eventName, listener, this);
    } else {
      this.emitter.on(eventName, this.wrapListener(listener));
    }
    return this;
  }

  public once(eventName: string, listener: () => void) {
    if (this.shouldNotWrapListener(eventName)) {
      this.emitter.once(eventName, listener, this);
    } else {
      this.emitter.once(eventName, this.wrapListener(listener));
    }
    return this;
  }

  public removeListener(eventName: string, listener: () => void) {
    if (this.shouldNotWrapListener(eventName)) {
      this.emitter.removeListener(eventName, listener);
    } else {
      this.emitter.removeListener(
        eventName,
        this.wrappedListeners.get(listener)
      );
    }
    return this;
  }

  public removeAllListeners(eventName?: string) {
    this.emitter.removeAllListeners(eventName);
    return this;
  }

  public eventNames() {
    return this.emitter.eventNames();
  }

  public listeners(eventName: string) {
    if (this.shouldNotWrapListener(eventName)) {
      return this.emitter.listeners(eventName);
    } else {
      return this.emitter.listeners(eventName).map((wrapper: any) => {
        return wrapper.original;
      });
    }
  }

  /* The following `emit` and `request` methods will serialize and send the
		event over the WebSocket using the WebSocketWrapper. */
  public emit(eventName: string, ...args: any[]) {
    if (this.shouldNotWrapListener(eventName)) {
      // ERROR!!!
      // can not do ws.emit('message', () => {})
      return this.emitter.emit.apply(this.emitter, arguments);
    } else {
      return this.wrapper.sendEvent(this.channelName, eventName, arguments);
    }
  }

  /* Temporarily set the request timeout for the next request. */
  public timeout(tempTimeout: number) {
    this.tempTimeout = tempTimeout;
    return this;
  }

  public request(eventName: string) {
    const oldTimeout = this.wrapper.requestTimeout;
    if (typeof this.tempTimeout !== "undefined") {
      this.wrapper.requestTimeout = this.tempTimeout;
      delete this.tempTimeout;
    }
    const request = this.wrapper.sendEvent(
      this.channelName,
      eventName,
      arguments,
      true
    );
    this.wrapper.requestTimeout = oldTimeout;
    return request;
  }

  private shouldNotWrapListener(eventName: string): boolean {
    return !this.isChannel && EventHandler.NO_WRAP_EVENTS.includes(eventName);
  }

  private wrapListener(listener: any) {
    if (typeof listener !== "function") {
      throw new TypeError('"listener" argument must be a function');
    }
    let wrapped = this.wrappedListeners.get(listener);
    if (!wrapped) {
      let returnVal;
      wrapped = (event: any) => {
        /* This function is called when an event is emitted on this
					WebSocketChannel's `_emitter` when the WebSocketWrapper
					receives an incoming message for this channel.  If this
					event is a request, special processing is needed to
					send the response back over the socket.  Below we use
					the return value from the original `listener` to
					determine what response should be sent back.

					`this` refers to the WebSocketChannel instance
					`event` has the following properties:
					- `name`
					- `args`
					- `requestId`
				*/
        try {
          returnVal = listener.apply(this, event.args);
        } catch (err) {
          if (event.requestId >= 0) {
            /* If event listener throws, pass that Error back
							as a response to the request */
            this.wrapper.sendReject(event.requestId, err);
          }
          // Re-throw
          throw err;
        }
        if (returnVal instanceof Promise) {
          /* If event listener returns a Promise, respond once
						the Promise resolves */
          returnVal
            .then(data => {
              if (event.requestId >= 0) {
                this.wrapper.sendResolve(event.requestId, data);
              }
            })
            .catch(err => {
              if (event.requestId >= 0) {
                this.wrapper.sendReject(event.requestId, err);
              }
              // else silently ignore error
            });
        } else if (event.requestId >= 0) {
          /* Otherwise, assume that the `returnVal` is what
						should be passed back as the response */
          this.wrapper.sendResolve(event.requestId, returnVal);
        }
        // else return value is ignored for simple events
      };
      // Add a reference back to the original listener
      wrapped.original = listener;
      this.wrappedListeners.set(listener, wrapped);
    }
    // Finally, return the wrapped listener
    return wrapped;
  }
}
