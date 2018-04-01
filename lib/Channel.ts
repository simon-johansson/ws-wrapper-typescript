import EventListenerWrapper from "./EventListenerWrapper";

export interface IChannel {
  on: (eventName: string, listener: ListenerFn) => Channel;
  once: (eventName: string, listener: ListenerFn) => Channel;
  removeListener: (eventName: string, listener?: ListenerFn) => Channel;
  removeAllListeners: (eventName?: string) => Channel;
  eventNames: () => Array<string | symbol>;
  listeners: (eventName: string) => ListenerFn[];
  emit: (eventName: string, ...args: any[]) => void;
  timeout: (tempTimeout: number) => Channel;
  request: (eventName: string, ...args: any[]) => Promise<any>;
  set: (key: string, value: any) => void;
  get: (key: string) => any;
}

export type ListenerFn = (...args: any[]) => void;

interface IWrappedListenerFn {
  original: ListenerFn;
}

export default class Channel implements IChannel {
  // List of "special" reserved events whose listeners don't need to be wrapped
  public static NO_WRAP_EVENTS = ["open", "message", "error", "close", "disconnect"];

  private data: any = {};
  private tempTimeout: number = 0;

  constructor(
    private sendEmitEvent: (eventName: string, channelName: string | undefined, data: any[]) => void,
    private sendRequestEvent: (
      eventName: string,
      channelName: string | undefined,
      data: any[],
      timeout: number
    ) => Promise<any>,
    private listenerWrapper: EventListenerWrapper,
    private channelName?: string
  ) {}

  public on(eventName: string, listener: ListenerFn): Channel {
    this.listenerWrapper.addListener(eventName, listener);
    return this;
  }

  public once(eventName: string, listener: ListenerFn): Channel {
    this.listenerWrapper.addListener(eventName, listener, true);
    return this;
  }

  public removeListener(eventName: string, listener?: ListenerFn) {
    this.listenerWrapper.removeListener(eventName, listener);
    return this;
  }

  public removeAllListeners(eventName?: string) {
    this.listenerWrapper.removeAllListeners(eventName);
    return this;
  }

  public eventNames(): string[] {
    return this.listenerWrapper.eventNames();
  }

  public listeners(eventName: string): ListenerFn[] {
    return this.listenerWrapper.listeners(eventName);
  }

  // Temporarily set the request timeout for the next request.
  public timeout(tempTimeout: number) {
    this.tempTimeout = tempTimeout;
    return this;
  }

  public emit(eventName: string, ...data: any[]): void {
    return this.sendEmitEvent(eventName, this.channelName, data);
  }

  public request(eventName: string, ...data: any[]): Promise<any> {
    return this.sendRequestEvent(eventName, this.channelName, data, this.getTemporaryTimeout());
  }

  public dispatch(event: any) {
    this.listenerWrapper.callListeners(event);
  }

  public get(key: string) {
    return this.data[key];
  }

  public set(key: string, value: any) {
    this.data[key] = value;
  }

  private shouldNotWrapListener(eventName: string): boolean {
    return Channel.NO_WRAP_EVENTS.includes(eventName);
  }

  private getTemporaryTimeout(): number {
    const timeout: number = this.tempTimeout;
    if (this.tempTimeout > 0) {
      this.tempTimeout = 0;
    }
    return timeout;
  }
}
