import Event from "./Event";

export interface IResponseSendFormat {
  i: number;
}

export default abstract class ResponseEvent extends Event {
  public abstract readonly type: "resolve" | "reject";

  constructor(public readonly id: number) {
    super();
  }

  protected getSendFormat(): IResponseSendFormat {
    return {
      i: this.id
    };
  }
}
