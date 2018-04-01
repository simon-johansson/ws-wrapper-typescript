import { QueryEvent } from "./EventFactory";
import WrappedListener from "./WrappedListener";

export interface IListenerCollection {
  [eventName: string]: IListenerCollectionItem[];
}
export interface IListenerCollectionItem {
  wrapped: WrappedListenerFn;
  original: ListenerFn;
  once: boolean;
}
export type WrappedListenerFn = (event: QueryEvent) => void;
export type ListenerFn = (...args: any[]) => void;
export type SendResponseFn = (...args: any[]) => void;
// export type WrappedListeners = WeakMap<ListenerFn, IWrappedListenerFn>;

export default class EventListenerWrapper {
  private listenerCollection: IListenerCollection = {};
  // private wrappedListeners: WrappedListeners = new WeakMap();

  constructor(private sendResolve: SendResponseFn, private sendReject: SendResponseFn) {}

  public addListener(eventName: string, listener: ListenerFn, once: boolean = false) {
    this.listenerCollection[eventName] = this.listenerCollection[eventName] || [];
    this.listenerCollection[eventName].push({ wrapped: this.wrap(listener), original: listener, once });
  }

  public removeListener(eventName: string, listener?: ListenerFn) {
    if (this.listenerCollection[eventName]) {
      if (listener) {
        this.listenerCollection[eventName] = this.listenerCollection[eventName].filter(
          (item: IListenerCollectionItem) => {
            return listener !== item.original;
          }
        );
        if (!this.listenerCollection[eventName].length) {
          this.removeAllListeners(eventName);
        }
      } else {
        this.removeAllListeners(eventName);
      }
    }
  }

  public removeAllListeners(eventName?: string) {
    if (eventName) {
      delete this.listenerCollection[eventName];
    } else {
      this.listenerCollection = {};
    }
    return this;
  }

  public eventNames(): string[] {
    return Object.keys(this.listenerCollection);
  }

  public listeners(eventName: string): ListenerFn[] {
    if (this.listenerCollection[eventName]) {
      return this.listenerCollection[eventName].map(
        (item: IListenerCollectionItem) => item.original
      );
    } else {
      return [];
    }
  }

  public callListeners(event: QueryEvent) {
    if (this.listenerCollection[event.eventName]) {
      this.listenerCollection[event.eventName].forEach((item: IListenerCollectionItem) => {
        item.wrapped(event);
        if (item.once) {
          this.removeListener(event.eventName, item.original);
        }
      });
    }
  }

  private wrap(listener: ListenerFn) {
    if (typeof listener !== "function") {
      throw new TypeError('"listener" argument must be a function');
    }
    return new WrappedListener(listener, this.sendResolve, this.sendReject).create();
  }
}
