/* tslint:disable:no-empty */

import WebSocketWrapper from "../../index";
import { connectSocket, createPayload, delay, getSendToSocketFn, getWebSocket } from "../utils";

describe("#once()", () => {
  const event = "event";
  const channel = "channel";
  let wsw;
  let mockSocket;
  let sendMessageToSocket;

  beforeEach(() => {
    mockSocket = getWebSocket();
    const wrapper = WebSocketWrapper(mockSocket);
    wsw = connectSocket(wrapper);
    sendMessageToSocket = getSendToSocketFn(mockSocket);
  });

  it("make a one time listener", () => {
    const messages = [];

    wsw.once(event, () => messages.push("hello!"));
    sendMessageToSocket({ event });
    sendMessageToSocket({ event });
    sendMessageToSocket({ event });
    expect(messages).toEqual(["hello!"]);
  });

  it("make a one time listener on channel", () => {
    const messages = [];

    wsw.of(channel).once(event, () => messages.push("hello!"));
    sendMessageToSocket({ event, channel });
    sendMessageToSocket({ event, channel });
    sendMessageToSocket({ event, channel });
    expect(messages).toEqual(["hello!"]);
  });

  it.skip("make a one time listener on a reserved event name", () => {});
});
