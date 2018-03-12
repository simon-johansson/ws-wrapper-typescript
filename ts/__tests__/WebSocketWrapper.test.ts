/* tslint:disable:no-empty */

const { Server, WebSocket } = require("mock-socket");
// import * as WebSocket from 'universal-websocket-client';
// import { Server as WebSocketServer } from "ws";
import WebSocketWrapper from "../WebSocketWrapper";

let wsw;
let mockServer;
let mockClient;
function getWebSocket(wsAddress: string = "ws://test"): WebSocket {
  mockClient = new WebSocket(wsAddress);
  mockClient.CONNECTING = 0;
  mockClient.OPEN = 1;
  mockClient.CLOSING = 2;
  mockClient.CLOSED = 3;
  mockClient.send = jest.fn();
  mockClient.close = jest.fn();
  return mockClient;
}

function connectToServer() {
  return new Promise((res, rej) => {
    mockServer.on("connection", server => res(server));
  });
}

interface ICreatePayloadOptions {
  args?: any[];
  channel?: string;
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
  c?: string;
  i?: number;
  d?: any;
  e?: any;
  _?: 1;
}

function createPayload(
  options: ICreatePayloadOptions,
  sendJSON: boolean = true
) {
  const payload: IPayload = {};
  if (options.event) {
    payload.a = { 0: options.event };
  }
  if (options.channel) {
    payload.c = options.channel;
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
  if (sendJSON) {
    return JSON.stringify(payload);
  } else {
    return payload;
  }
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

  it("initialise without options", () => {
    expect(
      () => new WebSocketWrapper(new WebSocket("ws://localhost:8080"))
    ).not.toThrow();
  });

  it("initialise with debug option set to true", async done => {
    console.log = jest.fn();
    const wswDebug = new WebSocketWrapper(new WebSocket("ws://test"), {
      debug: true
    });
    const server: any = await connectToServer();
    setTimeout(() => {
      expect(console.log["mock"].calls[0]).toEqual(["socket: onopen"]);
      done();
    }, 100);
  });

  it("initialise with debug option set to function", async done => {
    const debug = jest.fn();
    const wswDebug = new WebSocketWrapper(new WebSocket("ws://test"), {
      debug
    });
    const server: any = await connectToServer();
    setTimeout(() => {
      expect(debug.mock.calls[0]).toEqual(["socket: onopen"]);
      done();
    }, 100);
  });

  it.skip("initialise with errorToJSON option", async done => {
    const errorToJSON = jest.fn(() => {});
    const wswError = new WebSocketWrapper(getWebSocket("ws://test"), {
      errorToJSON
    });
    const event = "event";
    const message = "error message";
    const server: any = await connectToServer();

    wswError.on(
      event,
      () => new Promise((res, rej) => rej(new Error(message)))
    );
    server.send(createPayload({ event, requestIndex: 1 }));

    setTimeout(() => {
      console.log(errorToJSON.mock.calls[0][0]);
      done();
    }, 100);
  });

  it.skip("requestTimeout", () => {});

  describe("reserved events", () => {
    it.skip("open", () => {});
    it.skip("message", () => {});
    it.skip("error", () => {});
    it.skip("close", () => {});
    it.skip("disconnect", () => {});
  });

  describe("public properties", () => {
    it(".isConnecting", async () => {
      expect(wsw.isConnecting).toBeTruthy();
      const server: any = await connectToServer();
      expect(wsw.isConnecting).toBeFalsy();
    });

    it(".isConnected", async () => {
      expect(wsw.isConnected).toBeFalsy();
      const server: any = await connectToServer();
      expect(wsw.isConnected).toBeTruthy();
    });

    it(".socket", () => {
      expect(wsw.socket).toHaveProperty("onopen");
      expect(wsw.socket).toHaveProperty("onmessage");
      expect(wsw.socket).toHaveProperty("onclose");
      expect(wsw.socket).toHaveProperty("onerror");
      expect(wsw.socket).toHaveProperty("send");
    });

    it(".wrapper", () => {
      expect(wsw).toBe(wsw.wrapper);
    });

    it.skip(".channels", () => {});

    it.skip(".NO_WRAP_EVENTS", () => {});
  });

  describe("#on()", () => {
    // beforeEach(() => {
    // jest.useFakeTimers();
    // });

    it("subscribe", async () => {
      const event = "hello";
      let message = "something";
      const server: any = await connectToServer();
      wsw.on(event, msg => (message = msg));
      server.send(createPayload({ event }));
      expect(message).toBeUndefined();
    });

    it("subscribe and receive data", async () => {
      const event = "hello";
      const data = "Hello!";
      let message;
      const server: any = await connectToServer();
      wsw.on(event, msg => (message = msg));
      server.send(createPayload({ event, args: [data] }));
      expect(message).toEqual(data);
    });

    it("subscribe and receive multiple data arguments", async () => {
      const event = "hello";
      const args = ["arg1", "arg2", "arg3"];
      let messages;
      const server: any = await connectToServer();
      wsw.on(event, (...a) => (messages = a));
      server.send(createPayload({ args, event }));
      expect(messages).toEqual(args);
    });

    it("subscribe to multiple listeners and receive data", async () => {
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

    it("throw error is no listener function is supplied", async () => {
      expect(() => {
        wsw.on("event");
      }).toThrow('"listener" argument must be a function');
    });

    it("subscribe to reserved event name 'message'", async () => {
      const event = "message";
      const data = "Hello!";
      let message;
      const server: any = await connectToServer();
      wsw.on(event, msg => (message = msg));
      server.send(data);
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

  describe("#request()", () => {
    it("subscribe and receive resolve message", async done => {
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

    it("subscribe and receive resolve message with data", async done => {
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

    it("make multiple requests and receive resolve messages", async done => {
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

    it("subscribe and receive reject message", async done => {
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

    it("subscribe and receive reject message with Error", async done => {
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

    it("answer request", async () => {
      const event = "event";
      const server: any = await connectToServer();
      const expectedPayload = createPayload({
        requestIndex: 1
      });
      wsw.on(event, () => {});
      server.send(
        createPayload({
          event,
          requestIndex: 1
        })
      );
      expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
    });

    it("answer request with data", async () => {
      const event = "event";
      const data = "data";
      const server: any = await connectToServer();
      const expectedPayload = createPayload(
        { requestData: data, requestIndex: 11 },
        false
      );

      wsw.on(event, () => {
        return data;
      });
      server.send(createPayload({ event, requestIndex: 11 }));
      const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
      expect(sendCall).toEqual(expectedPayload);
    });

    it("answer request with error object", async () => {
      const event = "event";
      const message = "Something went wrong";
      const server: any = await connectToServer();
      const expectedPayload = createPayload(
        {
          errorObject: { message },
          isErrorInstance: true,
          requestIndex: 3476
        },
        false
      );

      wsw.on(event, () => {
        throw new Error(message);
      });
      server.send(createPayload({ event, requestIndex: 3476 }));
      const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
      expect(sendCall).toEqual(expectedPayload);
    });

    it("resolve request using promise", async done => {
      const event = "event";
      const data = "data";
      const server: any = await connectToServer();
      const expectedPayload = createPayload(
        {
          requestData: data,
          requestIndex: 1
        },
        false
      );

      wsw.on(event, () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => resolve(data), 100);
        });
      });
      server.send(createPayload({ event, requestIndex: 1 }));

      setTimeout(() => {
        const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
        expect(sendCall).toEqual(expectedPayload);
        done();
      }, 150);
    });

    it("reject request using promise", async done => {
      const event = "event";
      const message = "error message";
      const server: any = await connectToServer();
      const expectedPayload = createPayload(
        {
          errorObject: message,
          requestIndex: 1
        },
        false
      );

      wsw.on(event, () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(message), 100);
        });
      });
      server.send(createPayload({ event, requestIndex: 1 }));

      setTimeout(() => {
        const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
        expect(sendCall).toEqual(expectedPayload);
        done();
      }, 150);
    });

    it("reject request with error object using promise", async done => {
      const event = "event";
      const message = "error message";
      const server: any = await connectToServer();
      const expectedPayload = createPayload(
        {
          errorObject: { message },
          isErrorInstance: true,
          requestIndex: 1
        },
        false
      );

      wsw.on(event, () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error(message)), 100);
        });
      });
      server.send(createPayload({ event, requestIndex: 1 }));

      setTimeout(() => {
        const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
        expect(sendCall).toEqual(expectedPayload);
        done();
      }, 150);
    });

    it("reject request if event listener does not exist", async () => {
      const event = "event";
      const server: any = await connectToServer();
      const expectedPayload = createPayload({
          errorObject: { message: `No event listener for '${event}'`},
          isErrorInstance: true,
          requestIndex: 1
        },
        false
      );
      server.send(createPayload({ event, requestIndex: 1 }));
      const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
      expect(sendCall).toEqual(expectedPayload);
    });

    it.skip("request timed out", () => {});
  });

  describe("#of()", () => {
    it("subscribe to channel and receive message", async () => {
      const event = "event";
      const channel = "channel";
      let message = "something";
      const server: any = await connectToServer();
      wsw.of(channel).on(event, msg => (message = msg));
      server.send(createPayload({ channel, event }));
      expect(message).toBeUndefined();
    });

    it("receive event only from subscribed channel", async () => {
      const event = "event";
      let message = "something";
      const server: any = await connectToServer();
      wsw.of("channel").on(event, () => (message = "something wrong"));
      server.send(createPayload({ channel: "channel1", event }));
      server.send(createPayload({ event }));
      expect(message).toBe("something");
    });

    it("subscribe to multiple channels and receive messages", async () => {
      const events = ["event1", "event2", "event3"];
      const channels = ["channel1", "channel2", "channel3"];
      const messages = [];
      const server: any = await connectToServer();
      wsw.of(channels[0]).on(events[0], () => messages.push("msg1"));
      wsw.of(channels[1]).on(events[1], () => messages.push("msg2"));
      wsw.of(channels[2]).on(events[2], () => messages.push("msg3"));
      server.send(createPayload({ event: events[0], channel: channels[0] }));
      server.send(createPayload({ event: events[1], channel: channels[1] }));
      server.send(createPayload({ event: events[2], channel: channels[2] }));
      expect(messages).toEqual(["msg1", "msg2", "msg3"]);
    });

    it("subscribe to channel within a channel", async () => {
      expect(() => {
        wsw
          .of('channel1')
          .of('channel2')
          .on('event', () => {});
      }).toThrow();
    });

    it("make request to channel and receive message", async done => {
      const event = "event";
      const channel = "channel";
      const data = "data";
      const expectedPayload = createPayload({
        channel,
        event,
        requestIndex: 1
      });
      const server: any = await connectToServer();
      wsw
        .of("channel")
        .request("event")
        .then(msg => {
          expect(msg).toEqual(data);
          expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
          done();
        });
      server.send(
        createPayload({
          requestData: data,
          requestIndex: 1
        })
      );
    });

    it("ignore channel if null is supplied instead of channel name", async () => {
      const event = "event";
      const channel = null;
      let message = "something";
      const server: any = await connectToServer();
      wsw.of(channel).on(event, msg => (message = msg));
      server.send(createPayload({ event }));
      expect(message).toBeUndefined();
    });

    it("emit event to channel", async () => {
      const event = "event";
      const channel = "channel";
      const expectedPayload = createPayload({ event, channel });
      await connectToServer();
      wsw.of(channel).emit(event);
      expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
    });

    it("asnwer request to channel", async () => {
      const event = "event";
      const channel = "channel";
      const data = "data";
      const server: any = await connectToServer();
      const expectedPayload = createPayload(
        { requestData: data, requestIndex: 47 },
        false
      );

      wsw.of(channel).on(event, () => {
        return data;
      });
      server.send(createPayload({ channel, event, requestIndex: 47 }));
      const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
      expect(sendCall).toEqual(expectedPayload);
    });

    it("reject request if channel does not exist", async () => {
      const event = "event";
      const channel = "channel";
      const server: any = await connectToServer();
      const expectedPayload = createPayload({
          errorObject: { message: `Channel '${channel}' does not exist`},
          isErrorInstance: true,
          requestIndex: 47
        },
        false
      );
      server.send(createPayload({ channel, event, requestIndex: 47 }));
      const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
      expect(sendCall).toEqual(expectedPayload);
    });

    it("reject request if event listener on channel does not exist", async () => {
      const event = "event";
      const channel = "channel";
      const server: any = await connectToServer();
      const expectedPayload = createPayload({
          errorObject: { message: `No event listener for '${event}' on channel '${channel}'`},
          isErrorInstance: true,
          requestIndex: 1
        },
        false
      );
      wsw.of(channel).on('event1', () => {});
      server.send(createPayload({ channel, event, requestIndex: 1 }));
      const sendCall = JSON.parse(wsw.socket.send.mock.calls[0]);
      expect(sendCall).toEqual(expectedPayload);
    });
  });

  describe("#emit()", () => {
    it("emit event", async () => {
      const event = "event";
      const expectedPayload = createPayload({ event });
      await connectToServer();
      wsw.emit(event);
      expect(wsw.socket.send.mock.calls[0]).toEqual([expectedPayload]);
    });

    it("emit event with data", async () => {
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

    it("emit event with multiple data arguments", async () => {
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

    it("send pending events when connected", async () => {
      const event = "event";
      const payloads = [];
      for (let index = 0; index < 5; index++) {
        const data = "some data " + index;
        wsw.emit(event, data);
        payloads.push([
          createPayload({
            args: [data],
            event
          })
        ]);
      }
      expect(wsw.socket.send.mock.calls).toHaveLength(0);
      await connectToServer();
      expect(wsw.socket.send.mock.calls).toEqual(payloads);
    });

    it.skip("emit using reserved event name 'message'", async () => {
      const event = "message";
      const data = "data";
      const server: any = await connectToServer();
      wsw.emit(event, data);
      // console.log(wsw.socket.send.mock.calls);
      expect(wsw.socket.send.mock.calls[0]).toEqual([data]);
    });

    it.skip("should not fire own listener when emit using event name 'message'", async () => {
      const event = "message";
      const data = "data";
      let message;
      wsw.on(event, msg => (message = msg));
      wsw.emit(event, data);
      expect(message).toEqual(undefined);
    });
  });

  describe("#send()", () => {
    it("send arbitrary message", async () => {
      const data = "some data";
      await connectToServer();
      wsw.send(data);
      expect(wsw.socket.send.mock.calls[0]).toEqual([data]);
    });

    it("throw error if max queue size is reached", () => {
      const maxSize = WebSocketWrapper.MAX_SEND_QUEUE_SIZE;
      expect(() => {
        for (let index = 0; index <= maxSize; index++) {
          wsw.send();
        }
      }).toThrow(/WebSocket is not connected and send queue is full/);
    });

    it("ignore if max queue size is reached", () => {
      const maxSize = WebSocketWrapper.MAX_SEND_QUEUE_SIZE;
      expect(() => {
        for (let index = 0; index <= maxSize + 10; index++) {
          wsw.send("", true);
        }
      }).not.toThrow();
    });
  });

  describe("#abort()", () => {
    it("abort pending emits", async () => {
      wsw.emit("event");
      wsw.abort();
      await connectToServer();
      expect(wsw.socket.send.mock.calls).toEqual([]);
    });

    it("abort pending requests", async () => {
      wsw.request("event").catch(err => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Request was aborted/);
      });
      wsw.abort();
      await connectToServer();
      expect(wsw.socket.send.mock.calls).toEqual([]);
    });
  });

  describe("#disconnect()", () => {
    it("close open socket connection", async () => {
      const args = [123, "test"];
      await connectToServer();
      wsw.disconnect(...args);
      expect(wsw.socket.close.mock.calls).toEqual([args]);
    });
  });

  describe("#set()", () => {
    it("set property", () => {
      wsw.set("some key", "some data");
      expect(wsw.data).toEqual({ "some key": "some data" });
    });

    it.skip("throw error if key is not string", () => {
      // wsw.set();
    });

    it.skip("throw error if value is not supplied", () => {
      // wsw.set();
    });
  });

  describe("#get()", () => {
    it("get property", () => {
      wsw.set("some key", "some data");
      const data = wsw.get("some key");
      expect(data).toEqual("some data");
    });

    it.skip("get all properties", () => {});
  });

  describe("#once()", () => {
    it("make a one time listener", async () => {
      const event = "event";
      const messages = [];
      const server: any = await connectToServer();
      wsw.once(event, () => messages.push("hello!"));
      server.send(createPayload({ event }));
      server.send(createPayload({ event }));
      server.send(createPayload({ event }));
      expect(messages).toEqual(["hello!"]);
    });

    it.skip("make a one time listener on a reserved event name", () => {});
  });

  describe("#timeout()", () => {
    // it.skip("", () => {});
  });

  describe("#eventNames()", () => {
    it("get event name fron #on() listener", () => {
      wsw.on("event", () => {});
      expect(wsw.eventNames()).toEqual(["event"]);
    });

    it("get event name fron #once() listener", async () => {
      const event = "event";
      const server: any = await connectToServer();
      wsw.once(event, () => {});
      expect(wsw.eventNames()).toEqual([event]);
      server.send(createPayload({ event }));
      expect(wsw.eventNames()).toEqual([]);
    });

    it("get event name fron #of() listener", async () => {
      wsw.of("channel").on("event", () => {});
      expect(wsw.channels["channel"].eventNames()).toEqual(["event"]);
    });

    it("get multiple event names", async () => {
      wsw.on("event1", () => {});
      wsw.on("event2", () => {});
      wsw.on("event3", () => {});
      expect(wsw.eventNames()).toEqual(["event1", "event2", "event3"]);
    });

    it("don´t get duplicate event names", async () => {
      wsw.on("event1", () => {});
      wsw.on("event1", () => {});
      wsw.on("event2", () => {});
      expect(wsw.eventNames()).toEqual(["event1", "event2"]);
    });
  });

  describe("#listeners()", () => {
    it("get listeners", () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      wsw.on("event1", fn1);
      wsw.on("event2", fn2);
      expect(wsw.listeners("event1")[0]).toBe(fn1);
      expect(wsw.listeners("event2")[0]).toBe(fn2);
    });

    it("get multiple listeners of same event", () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      wsw.on("event", fn1);
      wsw.on("event", fn2);
      expect(wsw.listeners("event")[0]).toBe(fn1);
      expect(wsw.listeners("event")[1]).toBe(fn2);
    });

    it("get listeners on channel", () => {
      const fn1 = jest.fn();
      wsw.of("channel").on("event", fn1);
      expect(wsw.channels["channel"].listeners("event")[0]).toBe(fn1);
    });

    it.skip("get listeners of reserved event name", () => {
    });
  });

  describe("#removeListener()", () => {
    it("remove listener", () => {
      const fn = jest.fn();
      wsw.on("event", fn);
      expect(wsw.listeners("event")[0]).toBe(fn);
      wsw.removeListener("event");
      expect(wsw.listeners("event")).toEqual([]);
    });

    it("remove one listener on event", () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      wsw.on("event", fn1);
      wsw.on("event", fn2);
      expect(wsw.listeners("event")).toHaveLength(2);
      wsw.removeListener("event", fn1);
      expect(wsw.listeners("event")).toHaveLength(1);
      expect(wsw.listeners("event")[0]).toBe(fn2);
    });

    it("remove listener on channel", () => {
      const fn = jest.fn();
      wsw.of("channel").on("event", fn);
      expect(wsw.channels["channel"].listeners("event")[0]).toBe(fn);
      wsw.channels["channel"].removeListener("event");
      expect(wsw.channels["channel"].listeners("event")).toEqual([]);
    });

    it.skip("remove listener on reserved event name", () => {});
  });

  describe("#removeAllListeners()", () => {
    it("remove all listeners for all events", () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      wsw.on("event1", fn1);
      wsw.on("event2", fn2);
      expect(wsw.listeners("event1")[0]).toBe(fn1);
      expect(wsw.listeners("event2")[0]).toBe(fn2);
      wsw.removeAllListeners();
      expect(wsw.listeners("event1")).toEqual([]);
      expect(wsw.listeners("event2")).toEqual([]);
    });

    it("remove all listeners for specific event", () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      wsw.on("event1", fn1);
      wsw.on("event1", fn2);
      wsw.on("event2", fn2);
      expect(wsw.listeners("event1")).toHaveLength(2);
      expect(wsw.listeners("event2")).toHaveLength(1);
      wsw.removeAllListeners("event1");
      expect(wsw.listeners("event1")).toEqual([]);
      expect(wsw.listeners("event2")[0]).toBe(fn2);
    });
  });
});
