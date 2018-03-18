/* tslint:disable:no-empty */

import MessageFactory from "../index";
import MessageEmit from "../MessageEmit";
import MessageError from "../MessageError";
import MessageRequest from "../MessageRequest";
import MessageResponse from "../MessageResponse";

describe("MessageFactory", () => {
  let messageFactory: MessageFactory;

  beforeEach(() => {
    messageFactory = new MessageFactory();
  });

  afterEach(() => {
    messageFactory = null;
  });

  test("increment request id", () => {
    const request1: MessageRequest = messageFactory.createRequest({
      channelName: "channel",
      eventName: "event"
    });
    const request2: MessageRequest = messageFactory.createRequest({
      channelName: "channel",
      eventName: "event"
    });
    expect(request1.id).toEqual(1);
    expect(request2.id).toEqual(2);
  });

  describe("MessageEmit", () => {
    test("create emit message", () => {
      const emit: MessageEmit = messageFactory.createEmit({ eventName: "event" });
      expect(emit).toBeInstanceOf(MessageEmit);
    });

    describe(".JSON", () => {
      test("get message formated for sending over socket", () => {
        const payload = [{ data: "some data" }];
        const emit: MessageEmit = messageFactory.createEmit({
          channelName: "channel",
          data: payload,
          eventName: "event"
        });
        const expected = JSON.stringify({ a: ["event", ...payload], c: "channel" });
        expect(emit.JSON).toEqual(expected);
      });
    });
  });

  describe("MessageRequest", () => {
    test("create request message", () => {
      const request: MessageRequest = messageFactory.createRequest({ eventName: "event" });
      expect(request).toBeInstanceOf(MessageRequest);
    });

    describe(".JSON", () => {
      test("get message formated for sending over socket", () => {
        const payload = [{ data: "some data" }];
        const request: MessageRequest = messageFactory.createRequest({
          channelName: "channel",
          data: payload,
          eventName: "event"
        });
        const expected = JSON.stringify({ a: ["event", ...payload], i: 1, c: "channel" });
        expect(request.JSON).toEqual(expected);
      });
    });
  });

  describe("MessageResponse", () => {
    test("create response message", () => {
      const response: MessageResponse = messageFactory.createResponse({ id: 1 });
      expect(response).toBeInstanceOf(MessageResponse);
    });

    describe(".JSON", () => {
      test("get message formated for sending over socket", () => {
        const payload = { data: "some data" };
        const response: MessageResponse = messageFactory.createResponse({ id: 2, data: payload });
        const expected = JSON.stringify({ i: 2, d: payload });
        expect(response.JSON).toEqual(expected);
      });
    });
  });

  describe("MessageError", () => {
    test("create error message", () => {
      const response: MessageError = messageFactory.createError({ id: 1 });
      expect(response).toBeInstanceOf(MessageError);
    });

    describe(".JSON", () => {
      test("get message formated for sending over socket", () => {
        const message = { message: "some error" };
        const error: MessageError = messageFactory.createError({ id: 2, errorObject: message });
        const expected = JSON.stringify({ i: 2, e: message });
        expect(error.JSON).toEqual(expected);
      });

      test("message containing Error object is formated correctly when env is node", () => {
        const message = new Error("some error");
        const error: MessageError = messageFactory.createError({ id: 2, errorObject: message });
        const expected = JSON.stringify({ i: 2, e: { message: "some error" }, _: 1 });
        expect(error.JSON).toEqual(expected);
      });

      test("message containing Error object is formated correctly when env is browser", () => {
        (global as any).window = 'window';
        const message = new Error("some error");
        const error: MessageError = messageFactory.createError({ id: 2, errorObject: message });
        const parsedJSON = JSON.parse(error.JSON);
        expect(parsedJSON.e).toHaveProperty('stack');
        expect(parsedJSON.e).toHaveProperty('message');
      });
    });
  });
});
