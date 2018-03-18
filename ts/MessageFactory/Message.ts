export interface IEmitSendFormat {
  a: any[];
  c?: string;
}

export interface IRequestSendFormat {
  a: any[];
  c?: string;
  i: number;
}

export interface IResponseSendFormat {
  d?: any;
  i: number;
}

export interface IRejectSendFormat {
  i: number;
  e?: any;
  _?: 1;
}

export type IMessageSendFormat = IEmitSendFormat | IRequestSendFormat | IResponseSendFormat | IRejectSendFormat;

export default abstract class Message {
  public isRequest: boolean = false;
  protected abstract sendFormat: IMessageSendFormat;

  public get JSON() {
    return JSON.stringify(this.sendFormat);
  }

  protected abstract translateToSendFormat(): void;
}
