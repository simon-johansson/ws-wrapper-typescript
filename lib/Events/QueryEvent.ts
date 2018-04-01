import Event from "./Event";

export interface IQuerySendFormat {
  d?: any[];
  e: string;
  c?: string;
}

export default abstract class QueryEvent extends Event {
  public abstract readonly type: "emit" | "request";

  constructor(
    public readonly eventName: string,
    public readonly channelName: string | undefined,
    public readonly data: any[] = []
  ) {
    super();
  }

  public abstract expectsResponse(): this is { id: number };

  protected getSendFormat(): IQuerySendFormat {
    return {
      c: this.channelName,
      d: this.data.length ? this.data : undefined,
      e: this.eventName
    };
  }
}
