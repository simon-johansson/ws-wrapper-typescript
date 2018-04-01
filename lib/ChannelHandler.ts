import Channel from "./Channel";
import Debug from "./Debug";
import EventFactory, { Event, QueryEvent } from "./EventFactory";
import EventListenerWrapper from "./EventListenerWrapper";
import IncomingEventHandler from "./IncomingEventHandler";

export default class ChannelHandler {
  public channels: { [channelName: string]: Channel } = {};
  public defaultChannel: Channel;
  private eventFactory = new EventFactory();

  constructor(
    private registerEventAwaitingResponse: (eventID: number, eventTimeout: number) => Promise<any>,
    private sendEvent: (event: Event) => void
  ) {
    this.defaultChannel = this.createChannel();
  }

  public handleSpecialEvent(eventName: string, ...data: any[]) {
    const event = this.eventFactory.create({ eventName, data, type: 'emit' });
    this.defaultChannel.dispatch(event);
  }

  public handleIncomingEvent(event: QueryEvent) {
    const channel = event.channelName ? this.getChannel(event.channelName) : this.defaultChannel;
    return new IncomingEventHandler(event, channel, this.sendResponse.bind(this, "reject"));
  }

  public getOrCreateChannel(name: string): Channel {
    const channel = this.getChannel(name);
    return channel ? channel : this.registerNewChannel(name);
  }

  private getChannel(name: string): Channel | undefined {
    return this.channels[name];
  }

  private registerNewChannel(name: string): Channel {
    this.channels[name] = this.createChannel(name);
    return this.channels[name];
  }

  private createChannel(name?: string): Channel {
    const sendEmit = this.sendQuery.bind(this, "emit");
    const sendRequest = this.sendQuery.bind(this, "request");
    const sendResolve = this.sendResponse.bind(this, "resolve");
    const sendReject = this.sendResponse.bind(this, "reject");

    const listenerWrapper = new EventListenerWrapper(sendResolve, sendReject);
    return new Channel(sendEmit, sendRequest, listenerWrapper, name);
  }

  private sendResponse(type: "resolve" | "reject", id: number, data: any) {
    const event = this.eventFactory.create({ id, data, type });
    this.sendEvent(event);
  }

  private sendQuery(
    type: "emit" | "request",
    eventName: string,
    channelName: string | undefined,
    data: any[],
    timeout: number = 0
  ): void | Promise<any> {
    const event = this.eventFactory.create({ eventName, channelName, data, type });
    this.sendEvent(event);
    if (event.expectsResponse()) {
      return this.registerEventAwaitingResponse(event.id, timeout);
    }
  }
}
