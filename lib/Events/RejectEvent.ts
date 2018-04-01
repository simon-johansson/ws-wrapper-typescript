import ResponseEvent, { IResponseSendFormat } from "./ResponseEvent";

export interface IRejectSendFormat extends IResponseSendFormat {
  err: any;
  _?: 1;
}

export default class RejectEvent extends ResponseEvent {
  public readonly type = "reject";

  constructor(id: number, public readonly data: any = {}) {
    super(id);
  }

  protected getSendFormat(): IRejectSendFormat {
    return Object.assign(super.getSendFormat(), {
      _: this.rejectMessageIsError() ? (1 as 1) : undefined,
      err: this.translateRejectMessage()
    });
  }

  private rejectMessageIsError(): boolean {
    return !!(this.data instanceof Error);
  }

  private translateRejectMessage() {
    if (this.rejectMessageIsError()) {
      return this.getFormatedError();
    } else {
      return this.data;
    }
  }

  private getFormatedError() {
    if (typeof window === "undefined") {
      return { message: this.data.message };
    } else {
      const errorObj: any = {};
      Object.getOwnPropertyNames(this.data).forEach(prop => {
        errorObj[prop] = this.data[prop];
      });
      return errorObj;
    }
  }
}
