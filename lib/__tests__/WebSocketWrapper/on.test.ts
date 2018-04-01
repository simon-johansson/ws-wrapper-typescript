/* tslint:disable:no-empty */

import WebSocketWrapper from "../../index";
import { connectSocket, createPayload, delay, getSendToSocketFn, getWebSocket } from "../utils";

describe("#on()", () => {
  const event = "event";
  const id = 1;
  let wsw;
  let mockSocket;
  let sendMessageToSocket;

  beforeEach(() => {
    mockSocket = getWebSocket();
    const wrapper = WebSocketWrapper(mockSocket);
    wsw = connectSocket(wrapper);
    sendMessageToSocket = getSendToSocketFn(mockSocket);
  });

  it("receive event", done => {
    wsw.on(event, data => {
      done();
    });
    sendMessageToSocket({ event });
  });

  it("receive event with data", done => {
    const data = ["some data"];

    wsw.on(event, msg => {
      expect(msg).toEqual(data[0]);
      done();
    });
    sendMessageToSocket({ event, data });
  });

  it("receive event with multiple data arguments", done => {
    const data = ["arg1", "arg2", "arg3"];

    wsw.on(event, (...args) => {
      expect(args).toEqual(data);
      done();
    });
    sendMessageToSocket({ event, data });
  });

  it("receive event to multiple listeners", () => {
    const events = ["event1", "event2", "event3"];
    const eventData = ["msg1", "msg2", "msg3"];
    const messages = [];

    wsw.on(events[0], data => messages.push(data));
    wsw.on(events[1], data => messages.push(data));
    wsw.on(events[2], data => messages.push(data));

    sendMessageToSocket(
      { event: events[0], data: [eventData[0]] },
      { event: events[1], data: [eventData[1]] },
      { event: events[2], data: [eventData[2]] }
    );

    expect(messages).toEqual(eventData);
  });

  it("throw error if listener is not supplied", () => {
    expect(() => {
      wsw.on("event");
    }).toThrow('"listener" argument must be a function');
  });

  it.skip("subscribe to reserved event name 'message'", async () => {
    // const event = "message";
    const data = "Hello!";
    let message;
    // const server: any = await connectToServer();
    wsw.on(event, msg => (message = msg));
    // server.send(data);
    expect(message.type).toEqual("message");
    expect(message.data).toEqual(data);
  });

  it.skip("invalid JSON", () => {
    expect(3).toBe(3);
  });
  it.skip("if disconnect", () => {
    expect(3).toBe(3);
  });
});
