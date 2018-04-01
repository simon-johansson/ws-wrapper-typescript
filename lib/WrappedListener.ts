import { QueryEvent } from "./EventFactory";
import { ListenerFn, WrappedListenerFn } from "./EventListenerWrapper";

export type SendRespondFn = (eventID: number, data: any) => void;

export default class WrappedListener {
  private event!: QueryEvent;
  private listenerReturnValue: any;

  constructor(private listener: ListenerFn, private sendResolve: SendRespondFn, private sendReject: SendRespondFn) {}

  public create(): WrappedListenerFn {
    return (event: QueryEvent): void => {
      this.event = event;
      this.tryToGetListenerReturnValue();
      this.handleListenerReturnValue();
    };
  }

  private tryToGetListenerReturnValue() {
    try {
      this.listenerReturnValue = this.listener(...this.event.data);
    } catch (error) {
      this.handleListenerThrowsError(error);
    }
  }

  private handleListenerThrowsError(error: any) {
    if (this.event.expectsResponse()) {
      this.sendReject(this.event.id, error);
    }
    throw error;
  }

  private handleListenerReturnValue() {
    if (this.event.expectsResponse()) {
      const { id } = this.event;
      if (this.listenerReturnValue instanceof Promise) {
        // If event listener returns a Promise, respond once
        // the Promise resolves
        this.listenerReturnValue
          .then((data: any) => {
            this.sendResolve(id, data);
          })
          .catch((err: any) => {
            this.sendReject(id, err);
          });
      } else {
        // Otherwise, assume that the `returnVal` is what
        // should be passed back as the response
        this.sendResolve(id, this.listenerReturnValue);
      }
    }
  }
}
