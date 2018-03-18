import WebSocketWrapper, { IEvent } from "./WebSocketWrapper";

// TODO: Use native "events" module if in Node.js environment?
import { EventEmitter, ListenerFn } from "eventemitter3";

interface IWrappedListenerFn {
  (event: IEvent): void;
  original: ListenerFn;
}

type IWrappedListeners = WeakMap<ListenerFn, IWrappedListenerFn>;

export default abstract class EventHandler {
  // List of "special" reserved events whose listeners don't need to be wrapped
  public static NO_WRAP_EVENTS = ["open", "message", "error", "close", "disconnect"];

  public isChannel: boolean = false;
  public channelName: string | undefined = undefined;

  // behöver inte vara publik?
  public emitter: EventEmitter = new EventEmitter();

  protected abstract wrapper: WebSocketWrapper;

  // This channel's EventEmitter
  // WeakMap of wrapped event listeners
  private wrappedListeners: IWrappedListeners = new WeakMap();
  private tempTimeout: number | undefined = undefined;

  /*
  Expose EventEmitter-like API
	When `eventName` is one of the `NO_WRAP_EVENTS`, the event handlers
	are left untouched, and the emitted events are just sent to the
	EventEmitter; otherwise, event listeners are wrapped to process the
	incoming request and the emitted events are sent to the WebSocketWrapper
  to be serialized and sent over the WebSocket.
  */

  public on(eventName: string, listener: ListenerFn) {
    if (this.shouldNotWrapListener(eventName)) {
      this.emitter.on(eventName, listener);
    } else {
      this.emitter.on(eventName, this.wrapListener(listener));
    }
    return this;
  }

  public once(eventName: string, listener: ListenerFn) {
    if (this.shouldNotWrapListener(eventName)) {
      this.emitter.once(eventName, listener);
    } else {
      this.emitter.once(eventName, this.wrapListener(listener));
    }
    return this;
  }

  public removeListener(eventName: string, listener: ListenerFn) {
    if (this.shouldNotWrapListener(eventName)) {
      this.emitter.removeListener(eventName, listener);
    } else {
      this.emitter.removeListener(eventName, this.wrappedListeners.get(listener));
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
      return this.emitter.listeners(eventName).map((wrapper: IWrappedListenerFn) => wrapper.original);
    }
  }

  public emit(eventName: string, ...args: any[]) {
    if (this.shouldNotWrapListener(eventName)) {
      // ERROR!!!
      // can not do ws.emit('message', () => {})
      return this.emitter.emit.apply(this.emitter, arguments);
    } else {
      const message = this.wrapper.messageCreator.createEmit({
        channelName: this.channelName,
        data: args,
        eventName
      });
      return this.wrapper.sendEvent(message);
    }
  }

  // Temporarily set the request timeout for the next request.
  public timeout(tempTimeout: number) {
    this.tempTimeout = tempTimeout;
    return this;
  }

  public request(eventName: string, ...args: any[]) {
    // const oldTimeout = this.wrapper.requestTimeout;
    // if (typeof this.tempTimeout !== "undefined") {
    //   this.wrapper.requestTimeout = this.tempTimeout;
    //   delete this.tempTimeout;
    // }

    const message = this.wrapper.messageCreator.createRequest({
      channelName: this.channelName,
      data: args,
      eventName,
      timeout: this.getTimeout()
    });
    const request = this.wrapper.sendEvent(message);
    // this.wrapper.requestTimeout = oldTimeout;
    return request;
  }

  private shouldNotWrapListener(eventName: string): boolean {
    return !this.isChannel && EventHandler.NO_WRAP_EVENTS.includes(eventName);
  }

  private getTimeout(): number {
    let timeout: number;
    if (typeof this.tempTimeout !== "undefined") {
      timeout = this.tempTimeout;
      delete this.tempTimeout;
    } else {
      timeout = this.wrapper.requestTimeout;
    }
    return timeout;
  }

  private wrapListener(listener: ListenerFn) {
    if (typeof listener !== "function") {
      throw new TypeError('"listener" argument must be a function');
    }
    const existingWrappedFn = this.wrappedListeners.get(listener);
    if (typeof existingWrappedFn !== "undefined") {
      return existingWrappedFn;
    }

    const newWrappedFn: IWrappedListenerFn = Object.assign(
      (event: IEvent): void => {
        /*
        This function is called when an event is emitted on this
        WebSocketChannel's `_emitter` when the WebSocketWrapper
        receives an incoming message for this channel.  If this
        event is a request, special processing is needed to
        send the response back over the socket.  Below we use
        the return value from the original `listener` to
        determine what response should be sent back.

        `this` refers to the WebSocketChannel instance
        */

        const eventIsRequest: boolean = event.requestId >= 0;
        let listenerReturnValue: any;

        try {
          listenerReturnValue = listener(...event.args);
        } catch (err) {
          if (eventIsRequest) {
            // If event listener throws, pass that Error back
            // as a response to the request
            this.wrapper.sendReject(event.requestId, err);
          }
          // Re-throw
          throw err;
        }

        if (listenerReturnValue instanceof Promise && eventIsRequest) {
          // If event listener returns a Promise, respond once
          // the Promise resolves
          listenerReturnValue
            .then(data => {
              const message = this.wrapper.messageCreator.createResponse({
                data,
                id: event.requestId
              });
              this.wrapper.sendResolve(event.requestId, data);
            })
            .catch(err => this.wrapper.sendReject(event.requestId, err));
        } else if (eventIsRequest) {
          // Otherwise, assume that the `returnVal` is what
          // should be passed back as the response
          this.wrapper.sendResolve(event.requestId, listenerReturnValue);
        }
        // else return value is ignored for simple events
      },
      {
        // Add a reference back to the original listener
        original: listener as ListenerFn
      }
    );

    this.wrappedListeners.set(listener, newWrappedFn);
    // Finally, return the wrapped listener
    return newWrappedFn;
  }
}
