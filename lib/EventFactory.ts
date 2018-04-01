import EmitEvent, { IEmitSendFormat } from "./Events/EmitEvent";
import RejectEvent, { IRejectSendFormat } from "./Events/RejectEvent";
import RequestEvent, { IRequestSendFormat } from "./Events/RequestEvent";
import ResolveEvent, { IResolveSendFormat } from "./Events/ResolveEvent";

export type QueryEvent = EmitEvent | RequestEvent;
export type ResponseEvent = ResolveEvent | RejectEvent;

export type Event = EmitEvent | RejectEvent | RequestEvent | ResolveEvent;

export interface IQueryEventOptions {
  type: "emit" | "request";
  eventName: string;
  channelName?: string | undefined;
  data?: any[] | undefined;
}

export interface IResponseEventOptions {
  type: "resolve" | "reject";
  id: number;
  data: any;
}

export const IsQueryEvent = (event: Event): event is QueryEvent => {
  return event instanceof EmitEvent || event instanceof RequestEvent;
};
export const IsResponseEvent = (event: Event): event is ResponseEvent => {
  return event instanceof RejectEvent || event instanceof ResolveEvent;
};

const isEmit = (ev: any): ev is IEmitSendFormat => {
  return typeof ev.e === "string" && typeof ev.i === "undefined";
};
const isRequest = (ev: any): ev is IRequestSendFormat => {
  return typeof ev.e === "string" && typeof ev.i === "number";
};
const isReject = (ev: any): ev is IRejectSendFormat => {
  return typeof ev.err !== "undefined" && typeof ev.i === "number";
};
const isResolve = (ev: any): ev is IResolveSendFormat => {
  return typeof ev.e === "undefined" && typeof ev.i === "number";
};

export default class EventFactory {
  public static parse(json: any): Event {
    try {
      const ev = JSON.parse(json);

      if (isEmit(ev)) {
        return EventFactory.createEmit(ev.e, ev.c, ev.d);
      } else if (isRequest(ev)) {
        return EventFactory.createRequest(ev.e, ev.c, ev.d, ev.i);
      } else if (isReject(ev)) {
        return EventFactory.createReject(ev.i, ev.err, !!ev._);
      } else if (isResolve(ev)) {
        return EventFactory.createResolve(ev.i, ev.d);
      } else {
        throw new Error();
      }
    } catch (error) {
      throw new Error(`Parsing failed for event: \n ${json}`);
    }
  }

  private static createEmit(eventName: string, channelName: string | undefined, data: any[] | undefined): EmitEvent {
    return new EmitEvent(eventName, channelName, data);
  }

  private static createRequest(
    eventName: string,
    channelName: string | undefined,
    data: any[] | undefined,
    id: number
  ): RequestEvent {
    return new RequestEvent(eventName, channelName, data, id);
  }

  private static createResolve(id: number, data: any): ResolveEvent {
    return new ResolveEvent(id, data);
  }

  private static createReject(id: number, rejectMessage: any, shouldConvertToError?: boolean): RejectEvent {
    if (shouldConvertToError) {
      const err = new Error(rejectMessage.message);
      for (const key in rejectMessage) {
        if (rejectMessage.hasOwnProperty(key)) {
          (err as any)[key] = rejectMessage[key];
        }
      }
      rejectMessage = err;
    }
    return new RejectEvent(id, rejectMessage);
  }

  private eventIDCounter: number = 0;

  public create(opt: IQueryEventOptions): QueryEvent;
  public create(opt: IResponseEventOptions): ResponseEvent;
  public create(opt: any): Event {
    switch (opt.type) {
      case "emit":
        return EventFactory.createEmit(opt.eventName, opt.channelName, opt.data);

      case "request":
        const requestID = ++this.eventIDCounter;
        return EventFactory.createRequest(opt.eventName, opt.channelName, opt.data, requestID);

      case "resolve":
        return EventFactory.createResolve(opt.id, opt.data);

      case "reject":
        return EventFactory.createReject(opt.id, opt.data);

      default:
        throw new Error("Invalid event type supplied");
    }
  }
}
