import MessageEmit from "./MessageEmit";
import MessageReject from "./MessageReject";
import MessageRequest from "./MessageRequest";
import MessageResponse from "./MessageResponse";

export type Message = MessageEmit | MessageReject | MessageRequest | MessageResponse;

export default class MessageFactory {
  private requestIDCounter: number = 0;

  public createEmit(options: { eventName: string; channelName?: string; data?: any[] }): MessageEmit {
    return new MessageEmit(options.eventName, options.channelName, options.data);
  }
  public createRequest(options: {
    eventName: string;
    channelName?: string;
    data?: any[];
    timeout?: number;
  }): MessageRequest {
    const requestID = ++this.requestIDCounter;
    return new MessageRequest(options.eventName, options.channelName, options.data, requestID, options.timeout);
  }
  public createResponse(options: { id: number; data?: any }): MessageResponse {
    return new MessageResponse(options.id, options.data);
  }
  public createError(options: { id: number; rejectMessage?: any }): MessageReject {
    return new MessageReject(options.id, options.rejectMessage);
  }
}
