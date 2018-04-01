import ResponseEvent, { IResponseSendFormat } from "./ResponseEvent";

export interface IResolveSendFormat extends IResponseSendFormat {
  d?: any;
}

export default class ResolveEvent extends ResponseEvent {
  public readonly type = "resolve";

  constructor(id: number, public readonly data: any) {
    super(id);
  }

  protected getSendFormat(): IResolveSendFormat {
    return Object.assign(super.getSendFormat(), { d: this.data });
  }
}
