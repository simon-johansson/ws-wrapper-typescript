// TODO: Use native "events" module if in Node.js environment?
import { EventEmitter } from "eventemitter3";
import EventHandler from "./EventHandler";
import WebSocketWrapper from "./WebSocketWrapper";

export interface IChannel {
  channelName: string;
  wrapper: WebSocketWrapper;
}

export default class Channel extends EventHandler implements IChannel {

  public isChannel: boolean = true;

  constructor(
    public channelName: string,
    public wrapper: WebSocketWrapper
  ) {
    super();
  }
}
