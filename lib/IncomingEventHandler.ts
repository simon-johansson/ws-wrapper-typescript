import Channel from "./Channel";
import Debug from "./Debug";
import { QueryEvent } from "./EventFactory";

export default class IncomingEventHandler {
  constructor(
    private event: QueryEvent,
    private channel: Channel | undefined,
    private sendReject: (id: number, rejectMessage: any) => void
  ) {
    if (channel) {
      this.onEventSentToRegisteredChannel();
    } else {
      this.onEventSentToUnkownChannel();
    }
  }

  private onEventSentToRegisteredChannel(): void {
    if (this.channelCanReceiveEvent()) {
      (this.channel as Channel).dispatch(this.event);
      Debug.log(
        `Event '${this.event.eventName}' dispatched to event listeners ${
          this.event.channelName ? `on channel ${this.event.channelName}` : ""
        }`
      );
    } else {
      if (this.event.expectsResponse()) {
        this.sendReject(this.event.id, new Error(this.getNoListenerErrorMsg()));
      }
      Debug.error(this.getNoListenerErrorMsg());
    }
  }

  private onEventSentToUnkownChannel(): void {
    if (this.event.expectsResponse()) {
      this.sendReject(this.event.id, new Error(this.getUnknownChannelErrorMsg()));
    }
    Debug.error(`${this.getUnknownChannelErrorMsg()}, can not process event %O`, this.event);
  }

  private channelCanReceiveEvent(): boolean {
    return !!(this.channel as Channel).listeners(this.event.eventName).length;
  }

  private getUnknownChannelErrorMsg(): string {
    return `Unknown channel '${this.event.channelName}'`;
  }

  private getNoListenerErrorMsg(): string {
    const channelInfo = this.event.channelName ? ` on channel '${this.event.channelName}'` : "";
    return `No event listener for '${this.event.eventName}'${channelInfo}`;
  }
}
