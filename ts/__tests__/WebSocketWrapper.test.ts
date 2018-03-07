const { Server, WebSocket } = require("mock-socket");
// import * as WebSocket from 'universal-websocket-client';
// import { Server as WebSocketServer } from "ws";
import WebSocketWrapper from "../WebSocketWrapper";

let wsw;
let mockServer;
let mockClient;
function getWebSocket(): WebSocket {
  mockClient = new WebSocket("ws://test");
  mockClient.CONNECTING = 0;
  mockClient.OPEN = 1;
  mockClient.CLOSING = 2;
  mockClient.CLOSED = 3;
  mockClient.send = jest.fn();
  return mockClient;
}

function connectToServer() {
  return new Promise((res, rej) => {
    mockServer.on("connection", server => res(server));
  });
}

interface ICreatePayloadOptions {
  args?: any[];
  event?: string;
  requestData?: any;
  requestIndex?: number;
  errorObject?: any;
  isErrorInstance?: boolean;
}

interface IPayload {
  a?: {
    [propName: number]: any;
  };
  i?: number;
  d?: any;
  e?: any;
  _?: 1;
}

function createPayload(options: ICreatePayloadOptions) {
  const payload: IPayload = {};
  if (options.event) {
    payload.a = { 0: options.event };
  }
  if (options.args) {
    const argsArray: any = [];
    for (const i in options.args) {
      if (options.args[i]) {
        payload.a[parseInt(i, 10) + 1] = options.args[i];
      }
    }
  }
  if (options.requestIndex) {
    payload.i = options.requestIndex;
  }
  if (options.requestData) {
    payload.d = options.requestData;
  }
  if (options.errorObject) {
    payload.e = options.errorObject;
    if (options.isErrorInstance) {
      payload._ = 1;
    }
  }
  return JSON.stringify(payload);
}

describe("WebSocketWrapper", () => {
  beforeEach(() => {
    mockServer = new Server("ws://test");
    wsw = new WebSocketWrapper(getWebSocket(), {
      debug: false
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    mockClient.send.mockClear();
    wsw.removeAllListeners();
    wsw = null;
    mockServer.stop();
    mockServer = null;
  });

  it("should be able to initialise WebSocketWrapper", () => {
    expect(
      () => new WebSocketWrapper(new WebSocket("ws://localhost:8080"))
    ).not.toThrow();
  });

  describe("#on()", () => {
    // beforeEach(() => {
    // jest.useFakeTimers();
    // });

    it("should be able to subscribe", async () => {
      const event = "hello";
      let message = "something";
      const server: any = await connectToServer();
      wsw.on(event, msg => (message = msg));
      server.send(createPayload({ event }));
      expect(message).toBeUndefined();
    });

    it("should be able to subscribe and receive data", async () => {
      const event = "hello";
      const data = "Hello!";
      let message;
      const server: any = await connectToServer();
      wsw.on(event, msg => (message = msg));
      server.send(createPayload({ event, args: [data] }));
      expect(message).toEqual(data);
    });

    it("should be able to subscribe and receive multiple data arguments", async () => {
      const event = "hello";
      const args = ["arg1", "arg2", "arg3"];
      let messages;
      const server: any = await connectToServer();
      wsw.on(event, (...a) => (messages = a));
      server.send(createPayload({ args, event }));
      expect(messages).toEqual(args);
    });

    it("should be able to subscribe to multiple listeners and receive data", async () => {
      const events = ["event1", "event2", "event3"];
      const messages = [];
      const server: any = await connectToServer();
      wsw.on(events[0], () => messages.push("msg1"));
      wsw.on(events[1], () => messages.push("msg2"));
      wsw.on(events[2], () => messages.push("msg3"));
      server.send(createPayload({ event: events[0] }));
      server.send(createPayload({ event: events[1] }));
      server.send(createPayload({ event: events[2] }));
      expect(messages).toEqual(["msg1", "msg2", "msg3"]);
    });

    it.skip("default WS events", () => {
      expect(3).toBe(3);
    });
    it.skip("invalid JSON", () => {
      expect(3).toBe(3);
    });
    it.skip("pending events", () => {
      expect(3).toBe(3);
    });
    it.skip("if disconnect", () => {
      expect(3).toBe(3);
    });
  });

  describe("#request()", () => {
    it("should be able to subscribe and receive resolve message", async done => {
      const event = "event";
      const expectedPayload = createPayload({ event, requestIndex: 1 });
      const server: any = await connectToServer();
      wsw.request(event).then(msg => {
        expect(msg).toBeUndefined();
        expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
        done();
      });
      server.send(createPayload({ requestIndex: 1 }));
    });

    it("should be able to subscribe and receive resolve message with data", async done => {
      const event = "event";
      const data = "some data";
      const expectedPayload = createPayload({ event, requestIndex: 1 });
      const server: any = await connectToServer();
      wsw.request(event).then(msg => {
        expect(msg).toEqual(data);
        expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
        done();
      });
      server.send(createPayload({ requestData: data, requestIndex: 1 }));
    });

    it("should be able to make multiple requests and receive resolve messages", async done => {
      const data = ["one", "two", "three"];
      const events = ["event1", "event2", "event3"];
      const expectedPayloads = [
        createPayload({ event: events[0], requestIndex: 1 }),
        createPayload({ event: events[1], requestIndex: 2 }),
        createPayload({ event: events[2], requestIndex: 3 })
      ];
      const messages = [];
      const server: any = await connectToServer();
      wsw.request(events[0]).then(msg => {
        messages.push(data[0]);
      });
      wsw.request(events[1]).then(msg => {
        messages.push(data[1]);
      });
      wsw.request(events[2]).then(msg => {
        messages.push(data[2]);
        expect(messages).toEqual(data);
        expect(wsw.socket.send.mock.calls).toEqual([
          [expectedPayloads[0]],
          [expectedPayloads[1]],
          [expectedPayloads[2]]
        ]);
        done();
      });
      server.send(createPayload({ requestIndex: 1 }));
      server.send(createPayload({ requestIndex: 2 }));
      server.send(createPayload({ requestIndex: 3 }));
    });

    it("should be able to subscribe and receive reject message", async done => {
      const event = "event";
      const server: any = await connectToServer();
      const expectedPayload = createPayload({
        event,
        requestIndex: 1
      });
      wsw.request(event).catch(err => {
        expect(err).toEqual({});
        expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
        done();
      });
      server.send(
        createPayload({
          errorObject: {},
          requestIndex: 1
        })
      );
    });

    it("should be able to subscribe and receive reject message with Error", async done => {
      const event = "event";
      const message = "error message";
      const server: any = await connectToServer();
      const expectedPayload = createPayload({
        event,
        requestIndex: 1
      });
      wsw.request(event).catch(err => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual(message);
        expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
        done();
      });
      server.send(
        createPayload({
          errorObject: { message },
          isErrorInstance: true,
          requestIndex: 1
        })
      );
    });
    it.skip("Request timed out", () => {
      expect(3).toBe(3);
    });
    it.skip("sendResolve", () => {
      expect(3).toBe(3);
    });
    it.skip("sendReject", () => {
      expect(3).toBe(3);
    });
  });

  describe("#of()", () => {
    // it.skip("", () => {});
  });

  describe("#emit()", () => {
    it("should be able to emit event", async () => {
      const event = "event";
      const expectedPayload = createPayload({ event });
      await connectToServer();
      wsw.emit(event);
      expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
    });

    it("should be able to emit event with data", async () => {
      const event = "event";
      const data = "some data";
      const expectedPayload = createPayload({
        args: [data],
        event
      });
      await connectToServer();
      wsw.emit(event, data);
      expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
    });

    it("should be able to emit event with multiple data arguments", async () => {
      const event = "event";
      const data = ["data1", "data2", "data3"];
      const expectedPayload = createPayload({
        args: [...data],
        event
      });
      await connectToServer();
      wsw.emit(event, ...data);
      expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
    });

    it.skip("default WS events", () => {
      expect(3).toBe(3);
    });
  });

  describe("send", () => {
    // it.skip("if maxQueueSize", () => {});
    // it.skip("ignoreMaxQueueSize", () => {});
  });

  describe("public properties", () => {
    // it.skip("", () => {});
  });

  describe("#abort()", () => {
    // it.skip("", () => {});
  });

  describe("#disconnect()", () => {
    // it.skip("", () => {});
  });

  describe("#get()", () => {
    // it.skip("", () => {});
  });

  describe("#set()", () => {
    // it.skip("", () => {});
  });

  describe("instantiation options", () => {
    // it.skip("debug", () => {});
    // it.skip("errorToJSON", () => {});
    // it.skip("requestTimeout", () => {});
  });
});
