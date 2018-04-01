import Channel, { IChannel, ListenerFn } from "./Channel";
import ChannelHandler from "./ChannelHandler";

export default abstract class ApiProxy implements IChannel {
  protected abstract channelHandler: ChannelHandler;

  public on(eventName: string, listener: ListenerFn): Channel {
    return this.channelHandler.defaultChannel.on(eventName, listener);
  }
  public once(eventName: string, listener: ListenerFn): Channel {
    return this.channelHandler.defaultChannel.once(eventName, listener);
  }
  public removeListener(eventName: string, listener: ListenerFn): Channel {
    return this.channelHandler.defaultChannel.removeListener(eventName, listener);
  }
  public removeAllListeners(eventName?: string): Channel {
    return this.channelHandler.defaultChannel.removeAllListeners(eventName);
  }
  public eventNames(): Array<string | symbol> {
    return this.channelHandler.defaultChannel.eventNames();
  }
  public listeners(eventName: string): ListenerFn[] {
    return this.channelHandler.defaultChannel.listeners(eventName);
  }
  public emit(eventName: string, ...args: any[]): void {
    return this.channelHandler.defaultChannel.emit(eventName, ...args);
  }
  public timeout(tempTimeout: number): Channel {
    return this.channelHandler.defaultChannel.timeout(tempTimeout);
  }
  public request(eventName: string, ...args: any[]) {
    return this.channelHandler.defaultChannel.request(eventName, ...args);
  }
  public get(key: string) {
    return this.channelHandler.defaultChannel.get(key);
  }
  public set(key: string, value: any) {
    return this.channelHandler.defaultChannel.set(key, value);
  }
}
