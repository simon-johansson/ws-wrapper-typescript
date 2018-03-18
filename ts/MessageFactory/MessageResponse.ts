import Message, { IResponseSendFormat } from "./Message";

export default class MessageResponse extends Message {
  protected sendFormat: IResponseSendFormat;

  constructor(private requestID: number, private data: any) {
    super();
    this.translateToSendFormat();
  }

  public get id() {
    return this.requestID;
  }

  protected translateToSendFormat(): void {
    this.sendFormat = { i: this.id };
    if (typeof this.data !== "undefined") {
      this.sendFormat.d = this.data;
    }
  }
}
