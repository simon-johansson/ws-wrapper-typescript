import QueryEvent, { IQuerySendFormat } from "./QueryEvent";

export type IEmitSendFormat = IQuerySendFormat

export default class EmitEvent extends QueryEvent {
  public readonly type = "emit";

  constructor(
    eventName: string,
    channelName: string | undefined,
    data: any[] | undefined
  ) {
    super(eventName, channelName, data);
  }

  public expectsResponse(): this is { id: number } {
    return false;
  }
}
