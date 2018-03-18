import Message, { IRequestSendFormat } from "./Message";

export default class MessageRequest extends Message {
  public readonly isRequest: boolean = true;
  protected sendFormat: IRequestSendFormat;

  constructor(
    private eventName: string,
    private channel: string | undefined,
    private data: any[] = [],
    private requestID: number,
    private timeout: number = 0,
  ) {
    super();
    this.translateToSendFormat();
  }

  public get id() {
    return this.requestID;
  }

  protected translateToSendFormat(): void {
    this.sendFormat = { a: [this.eventName, ...this.data], i: this.id };
    if (typeof this.channel === "string") {
      this.sendFormat.c = this.channel;
    }
  }
}
