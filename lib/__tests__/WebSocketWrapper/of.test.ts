/* tslint:disable:no-empty */

import WebSocketWrapper from "../../index";
import { connectSocket, createPayload, delay, getSendToSocketFn, getWebSocket } from "../utils";

describe("#of()", () => {
  const event = "event";
  const channel = "channel";
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

  it("receive event from channel", done => {
    const data = ["some data"];

    wsw.of(channel).on(event, msg => {
      expect(msg).toEqual(data[0]);
      done();
    });
    sendMessageToSocket({ event, channel, data });
  });

  it("receive event only from subscribed channel", () => {
    const clb = jest.fn();

    wsw.of("channel").on(event, clb);

    sendMessageToSocket({ event });
    sendMessageToSocket({ channel: "channel1", event });
    sendMessageToSocket({ channel: "channel", event });

    expect(clb).toHaveBeenCalledTimes(1);
  });

  it("receive event to multiple channels", async () => {
    const events = ["event1", "event2", "event3"];
    const channels = ["channel1", "channel2", "channel3"];
    const messages = [];

    wsw.of(channels[0]).on(events[0], () => messages.push("msg1"));
    wsw.of(channels[1]).on(events[1], () => messages.push("msg2"));
    wsw.of(channels[2]).on(events[2], () => messages.push("msg3"));
    sendMessageToSocket(
      { event: events[0], channel: channels[0] },
      { event: events[1], channel: channels[1] },
      { event: events[2], channel: channels[2] }
    );

    expect(messages).toEqual(["msg1", "msg2", "msg3"]);
  });

  it("receive same event to multiple listeners", async () => {
    const messages = [];

    wsw.of(channel).on(event, () => messages.push("msg1"));
    wsw.of(channel).on(event, () => messages.push("msg2"));
    sendMessageToSocket({ event, channel });

    expect(messages).toEqual(["msg1", "msg2"]);
  });

  it("subscribe to channel within a channel throws error", () => {
    expect(() => {
      wsw
        .of("channel1")
        .of("channel2")
        .on("event", () => {});
    }).toThrow();
  });

  it("receive response for request from channel", done => {
    const responseData = "some data";
    const expectedSocketTransmit = createPayload({ event, channel, id });

    wsw
      .of(channel)
      .request(event)
      .then(msg => {
        expect(msg).toEqual(responseData);
        expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
        done();
      });

    sendMessageToSocket({ responseData, id });
  });

  it("ignore channel if null is supplied instead of channel name", done => {
    wsw.of(null).on(event, msg => {
      done();
    });
    sendMessageToSocket({ event });
  });

  it("send emit event to channel", () => {
    const expectedSocketTransmit = createPayload({ event, channel });

    wsw.of(channel).emit(event);
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("send request event to channel", () => {
    const expectedSocketTransmit = createPayload({ event, channel, id });

    wsw.of(channel).request(event);
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("resolve request to channel", () => {
    const responseData = "data";
    const expectedSocketTransmit = createPayload({ responseData, id });

    wsw.of(channel).on(event, () => {
      return responseData;
    });
    sendMessageToSocket({ channel, event, id });
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("reject request if channel does not exist", () => {
    const expectedSocketTransmit = createPayload({
      id,
      isErrorInstance: true,
      rejectMessage: { message: `Unknown channel '${channel}'` }
    });
    sendMessageToSocket({ channel, event, id });
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("reject request if event listener on channel does not exist", () => {
    const expectedSocketTransmit = createPayload({
      id,
      isErrorInstance: true,
      rejectMessage: { message: `No event listener for '${event}' on channel '${channel}'` }
    });
    wsw.of(channel).on("some other event", () => {});
    sendMessageToSocket({ channel, event, id });
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });
});
