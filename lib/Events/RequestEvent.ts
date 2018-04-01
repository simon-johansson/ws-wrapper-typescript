import QueryEvent, { IQuerySendFormat } from "./QueryEvent";

export interface IRequestSendFormat extends IQuerySendFormat {
  i: number;
}

export default class RequestEvent extends QueryEvent {
  public readonly type = "request";

  constructor(eventName: string, channelName: string | undefined, data: any[] = [], public readonly id: number) {
    super(eventName, channelName, data);
  }

  public expectsResponse(): this is { id: number } {
    return true;
  }

  protected getSendFormat(): IRequestSendFormat {
    return Object.assign(super.getSendFormat(), { i: this.id });
  }
}
