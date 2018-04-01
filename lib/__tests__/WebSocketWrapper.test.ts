/* tslint:disable:no-empty */
/* tslint:disable:curly */

const { Server, WebSocket } = require("mock-socket");
import WebSocketWrapper from "../WebSocketWrapper";
import { connectSocket, createPayload, delay, getSendToSocketFn, getWebSocket } from "./utils";

// let mockServer;
// function connectToServer(): Promise<any> {
//   return new Promise((res, rej) => {
//     mockServer.on("connection", server => res(server));
//   });
// }

describe("WebSocketWrapper", () => {
  let wsw;
  let mockSocket;
  let sendMessageToSocket;

  beforeEach(() => {
    // mockServer = new Server("ws://test");
    mockSocket = getWebSocket();
    const wrapper = new WebSocketWrapper(mockSocket);
    wsw = connectSocket(wrapper);
    sendMessageToSocket = getSendToSocketFn(mockSocket);
  });

  afterEach(() => {
    jest.useRealTimers();
    // mockServer.stop();
    // mockServer = null;
  });

  it("initialise without options", () => {
    expect(() => new WebSocketWrapper(new WebSocket("ws://localhost:8080"))).not.toThrow();
  });

  it.skip("initialise with debug option set to true", async done => {
    // console.log = jest.fn();
    // const wswDebug = new WebSocketWrapper(new WebSocket("ws://test"), {
    //   debug: true
    // });
    // setTimeout(() => {
    //   expect(console.log["mock"].calls[0]).toEqual(["socket: onopen"]);
    //   done();
    // }, 100);
  });

  it.skip("initialise with debug option set to function", async done => {
    // const debug = jest.fn();
    // const wswDebug = new WebSocketWrapper(new WebSocket("ws://test"), {
    //   debug
    // });
    // setTimeout(() => {
    //   expect(debug.mock.calls[0]).toEqual(["socket: onopen"]);
    //   done();
    // }, 100);
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
    let wrapper;

    beforeEach(() => {
      wrapper = new WebSocketWrapper(getWebSocket());
    });

    it(".isConnecting", async () => {
      expect(wrapper.isConnecting).toBeTruthy();
      connectSocket(wrapper);
      expect(wrapper.isConnecting).toBeFalsy();
    });

    it(".isConnected", async () => {
      expect(wrapper.isConnected).toBeFalsy();
      connectSocket(wrapper);
      expect(wrapper.isConnected).toBeTruthy();
    });
  });

  describe("#send()", () => {
    let socket;
    let wrapper;

    beforeEach(() => {
      socket = getWebSocket();
      wrapper = new WebSocketWrapper(socket);
    });

    it("send arbitrary message", () => {
      const data = "some data";
      wsw.send(data);
      expect(mockSocket.send).lastCalledWith(data);
    });

    it("throw error if max queue size is reached", () => {
      const maxSize = 10;
      expect(() => {
        for (let index = 0; index <= maxSize; index++) {
          wrapper.send();
        }
      }).toThrow(/WebSocket is not connected and send queue is full/);
    });

    it("ignore if max queue size is reached", () => {
      const maxSize = 10;
      expect(() => {
        for (let index = 0; index <= maxSize + 10; index++) {
          wsw.send("", true);
        }
      }).not.toThrow();
    });
  });

  describe("#abort()", () => {
    let socket;
    let wrapper;

    beforeEach(() => {
      socket = getWebSocket();
      wrapper = new WebSocketWrapper(socket);
    });

    it("abort pending emits", () => {
      wrapper.emit("event");
      wrapper.abort();
      connectSocket(wrapper);
      expect(socket.send).toHaveBeenCalledTimes(0);
    });

    it("abort pending requests", () => {
      wrapper.request("event").catch(err => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Request was aborted/);
      });
      wrapper.abort();
      connectSocket(wrapper);
      expect(socket.send).toHaveBeenCalledTimes(0);
    });
  });

  describe("#disconnect()", () => {
    it("close open socket connection", () => {
      const args = [123, "test"];
      wsw.disconnect(...args);
      expect(mockSocket.close).lastCalledWith(...args);
    });
  });

  describe("#set()", () => {
    it("set property", () => {
      expect(() => {
        wsw.set("some key", "some data");
      }).not.toThrow();
    });

    it("set property on channel", () => {
      expect(() => {
        wsw.of('channel').set("some key", "some data");
      }).not.toThrow();
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

    it("get property from channel", () => {
      wsw.of("channel").set("some key", "some data");
      const data = wsw.of("channel").get("some key");
      expect(data).toEqual("some data");
    });

    it.skip("get all properties", () => {});
  });

  describe("#eventNames()", () => {
    it("get event name fron #on() listener", () => {
      wsw.on("event", () => {});
      expect(wsw.eventNames()).toEqual(["event"]);
    });

    it("get event name fron #once() listener", async () => {
      const event = "event";
      wsw.once(event, () => {});
      expect(wsw.eventNames()).toEqual([event]);
      sendMessageToSocket({ event });
      expect(wsw.eventNames()).toEqual([]);
    });

    it("get event name fron #of() listener", async () => {
      wsw.of("channel").on("event", () => {});
      expect(wsw.of("channel").eventNames()).toEqual(["event"]);
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
      expect(wsw.of("channel").listeners("event")[0]).toBe(fn1);
    });

    it.skip("get listeners of reserved event name", () => {});
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
      expect(wsw.of("channel").listeners("event")[0]).toBe(fn);
      wsw.of("channel").removeListener("event");
      expect(wsw.of("channel").listeners("event")).toEqual([]);
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
  describe.skip("#bind()", () => {});
});
