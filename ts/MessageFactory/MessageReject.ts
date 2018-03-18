import Message, { IRejectSendFormat } from "./Message";

export default class MessageReject extends Message {
  protected sendFormat: IRejectSendFormat;
  // Predefined error messages...

  constructor(private requestID: number, private rejectMessage: any) {
    super();
    this.translateToSendFormat();
  }

  public get id() {
    return this.requestID;
  }

  protected translateToSendFormat(): void {
    this.sendFormat = { i: this.id };
    if (typeof this.rejectMessage !== "undefined") {
      if (this.rejectMessage instanceof Error) {
        const formatedError = this.getFormatedError();
        this.sendFormat.e = formatedError;
        this.sendFormat._ = 1;
      } else {
        this.sendFormat.e = this.rejectMessage;
      }
    }
  }

  private getFormatedError() {
    if (typeof window === "undefined") {
      return { message: this.rejectMessage.message };
    } else {
      const errorObj: any = {};
      Object.getOwnPropertyNames(this.rejectMessage).forEach(prop => {
        errorObj[prop] = this.rejectMessage[prop];
      });
      return errorObj;
    }
  }
}
