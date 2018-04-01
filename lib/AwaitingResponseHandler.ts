import Debug from "./Debug";

export interface IEventAwaitingResponse {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  timer?: NodeJS.Timer;
}

interface IEventsAwaitingResponseMap {
  [key: number]: IEventAwaitingResponse;
}

export interface IResponseEvent {
  type: "reject" | "resolve";
  data: any;
  id: number;
}

export default class AwaitingResponseHandler {
  private events: IEventsAwaitingResponseMap = {};
  private defaultTimeout: number = 0;

  public register(eventID: number, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.events[eventID] = { resolve, reject };
      this.setResponseTimeLimit(eventID, timeout);
    });
  }

  public set setDefaultTimeout(timeout: number) {
    this.defaultTimeout = timeout;
  }

  public abort(): void {
    for (const id in this.events) {
      if (this.events.hasOwnProperty(id)) {
        this.events[id].reject(new Error("Request was aborted"));
        Debug.log(`Request (id: %d) was aborted`, id);
      }
    }
    this.events = {};
  }

  public respondToEvent(event: IResponseEvent): void {
    if (event.type === "resolve") {
      this.resolveEvent(event.id, event.data);
    } else if (event.type === "reject") {
      this.rejectEvent(event.id, event.data);
    }
  }

  public resolveEvent(id: number, value: any): void {
    if (this.events[id]) {
      Debug.log(`Resolving request (id: %d) with data: %o`, id, value);
      this.events[id].resolve(value);
      this.deleteRequest(id);
    } else {
      this.noRegisteredEvent(id);
    }
  }

  public rejectEvent(id: number, reason: any): void {
    if (this.events[id]) {
      Debug.log(`Rejecting request (id: %d) with reason: %s`, id, reason);
      this.events[id].reject(reason);
      this.deleteRequest(id);
    } else {
      this.noRegisteredEvent(id);
    }
  }

  private setResponseTimeLimit(eventID: number, timeout: number) {
    if (timeout > 0 || this.defaultTimeout > 0) {
      this.events[eventID].timer = setTimeout(() => {
        Debug.log(
          `Rejecting request (id %d) due to timeout (set to: %d)`,
          eventID,
          timeout || this.defaultTimeout
        );
        this.events[eventID].reject(new Error("Request timed out"));
        delete this.events[eventID];
      }, timeout || this.defaultTimeout);
    }
  }

  private deleteRequest(id: number): void {
    const request = this.events[id];
    if (request.timer !== undefined) {
      clearTimeout(request.timer);
    }
    delete this.events[id];
  }

  private noRegisteredEvent(id: number) {
    Debug.log(`No registered request with id %d`, id);
  }
}
