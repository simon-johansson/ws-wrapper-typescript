import Message, { IEmitSendFormat } from "./Message";

export default class MessageEmit extends Message {
  protected sendFormat: IEmitSendFormat;

  constructor(private eventName: string, private channel: string | undefined, private data: any[] = []) {
    super();
    this.translateToSendFormat();
  }

  protected translateToSendFormat(): void {
    this.sendFormat = { a: [this.eventName, ...this.data] };
    if (typeof this.channel === 'string') {
      this.sendFormat.c = this.channel;
    }
  }
}
