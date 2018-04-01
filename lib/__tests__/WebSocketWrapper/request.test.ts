/* tslint:disable:no-empty */

import WebSocketWrapper from "../../index";
import { connectSocket, createPayload, delay, getSendToSocketFn, getWebSocket } from "../utils";

describe("#request()", () => {
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

  it("receive resolve response", done => {
    const expectedSocketTransmit = createPayload({ event, id });

    wsw.request(event).then(msg => {
      expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
      done();
    });

    sendMessageToSocket({ id });
  });

  it.only("receive resolve response with data", done => {
    const data = ["some data"];
    const expectedSocketTransmit = createPayload({ event, id });

    wsw.request(event).then(msg => {
      expect(msg).toEqual(data);
      expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
      done();
    });
    sendMessageToSocket({ id, data });
  });

  it("receive resolve responses for multiple event names", done => {
    const events = ["event1", "event2", "event3"];
    const eventData = ["one", "two", "three"];
    const messages = [];
    const clb = msg => messages.push(msg);

    wsw.request(events[0]).then(clb);
    expect(mockSocket.send).lastCalledWith(createPayload({ event: events[0], id: 1 }));

    wsw.request(events[1]).then(clb);
    expect(mockSocket.send).lastCalledWith(createPayload({ event: events[1], id: 2 }));

    wsw
      .request(events[2])
      .then(clb)
      .then(() => {
        expect(messages).toEqual(eventData);
        done();
      });
    expect(mockSocket.send).lastCalledWith(createPayload({ event: events[2], id: 3 }));

    sendMessageToSocket(
      { id: 1, responseData: eventData[0] },
      { id: 2, responseData: eventData[1] },
      { id: 3, responseData: eventData[2] }
    );
  });

  it("receive reject response", done => {
    wsw
      .request(event)
      .then(() => {
        // "then" callback should not be called
        expect(false).toBe(true);
      })
      .catch(err => {
        expect(err).toEqual("error");
        done();
      });
    sendMessageToSocket({ rejectMessage: "error", id });
  });

  it("receive reject message as Error instance", done => {
    const message = "error message";

    wsw.request(event).catch(err => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual(message);
      done();
    });
    sendMessageToSocket({
      id,
      isErrorInstance: true,
      rejectMessage: { message }
    });
  });

  it("resolve request", () => {
    const expectedSocketTransmit = createPayload({ id });

    wsw.on(event, () => {});
    sendMessageToSocket({ event, id });

    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("resolve request with data", () => {
    const responseData = "some data";
    const expectedSocketTransmit = createPayload({ responseData, id });

    wsw.on(event, () => responseData);
    sendMessageToSocket({ event, id });

    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("reject request with error object", () => {
    const message = "something went wrong";
    const expectedSocketTransmit = createPayload({ rejectMessage: { message }, id, isErrorInstance: true });

    wsw.on(event, () => {
      throw new Error(message);
    });
    sendMessageToSocket({ event, id });

    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("resolve request using promise", done => {
    const responseData = "some data";
    const expectedSocketTransmit = createPayload({ id, responseData });

    wsw.on(event, () => {
      return new Promise((resolve, reject) => resolve(responseData));
    });
    sendMessageToSocket({ event, id });

    delay(() => {
      expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
    }, done);
  });

  it("reject request using promise", done => {
    const expectedSocketTransmit = createPayload({ id, rejectMessage: {} });

    wsw.on(event, () => {
      return new Promise((resolve, reject) => reject());
    });
    sendMessageToSocket({ event, id });

    delay(() => {
      expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
    }, done);
  });

  it("reject request using promise with message", done => {
    const rejectMessage = "something is wrong";
    const expectedSocketTransmit = createPayload({ id, rejectMessage });

    wsw.on(event, () => {
      return new Promise((resolve, reject) => reject(rejectMessage));
    });
    sendMessageToSocket({ event, id });

    delay(() => {
      expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
    }, done);
  });

  it("reject request using promise with error object", done => {
    const message = "something is wrong";
    const expectedSocketTransmit = createPayload({ id, rejectMessage: { message }, isErrorInstance: true });

    wsw.on(event, () => {
      return new Promise((resolve, reject) => reject(new Error(message)));
    });
    sendMessageToSocket({ event, id });

    delay(() => {
      expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
    }, done);
  });

  it("reject request if event listener does not exist", () => {
    const expectedSocketTransmit = createPayload({
      id,
      isErrorInstance: true,
      rejectMessage: { message: `No event listener for '${event}'` }
    });
    sendMessageToSocket({ event, id });

    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("request timed out", done => {
    jest.useFakeTimers();

    const wrapper = WebSocketWrapper(mockSocket, {
      requestTimeout: 10000
    });

    wrapper.request("event").catch(err => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual("Request timed out");
      done();
    });

    jest.runOnlyPendingTimers();
  });
});
