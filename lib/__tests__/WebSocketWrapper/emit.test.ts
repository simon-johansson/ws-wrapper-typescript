/* tslint:disable:no-empty */

import WebSocketWrapper from "../../index";
import { connectSocket, createPayload, delay, getSendToSocketFn, getWebSocket } from "../utils";

describe("#emit()", () => {
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

  it("emit event", () => {
    const expectedSocketTransmit = createPayload({ event });
    wsw.emit(event);
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("emit event with data", () => {
    const data = ["some data"];
    const expectedSocketTransmit = createPayload({ data, event });
    wsw.emit(event, ...data);
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("emit event with multiple data arguments", () => {
    const data = ["data1", "data2", "data3"];
    const expectedSocketTransmit = createPayload({ data, event });
    wsw.emit(event, ...data);
    expect(mockSocket.send).lastCalledWith(expectedSocketTransmit);
  });

  it("send pending events when connected", () => {
    const expectedSocketTransmit = [];
    const socket: any = getWebSocket();
    const wrapper = WebSocketWrapper(socket);

    for (let index = 0; index < 5; index++) {
      const data = "some data " + index;
      wrapper.emit(event, data);
      expectedSocketTransmit.push([createPayload({ data: [data], event })]);
    }

    expect(socket.send).toHaveBeenCalledTimes(0);

    connectSocket(wrapper);

    expect(socket.send).toHaveBeenCalledTimes(5);
    expect(socket.send.mock.calls).toEqual(expectedSocketTransmit);
  });

  it.skip("emit using reserved event name 'message'", async () => {
    // const event = "message";
    const data = "data";
    // const server: any = await connectToServer();
    wsw.emit(event, data);
    // console.log(mockSocket.send.mock.calls);
    expect(mockSocket.send.mock.calls[0]).toEqual([data]);
  });

  it.skip("should not fire own listener when emit using event name 'message'", async () => {
    // const event = "message";
    const data = "data";
    let message;
    wsw.on(event, msg => (message = msg));
    wsw.emit(event, data);
    expect(message).toEqual(undefined);
  });
});
