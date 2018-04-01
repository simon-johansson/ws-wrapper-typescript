/* tslint:disable:no-empty */
/* tslint:disable:curly */

const { WebSocket } = require("mock-socket");

export interface ICreatePayloadOptions {
  data?: any[];
  channel?: string;
  event?: string;
  responseData?: any;
  id?: number;
  rejectMessage?: any;
  isErrorInstance?: boolean;
}

export interface IPayload {
  c?: string;
  i?: number;
  d?: any;
  e?: string;
  err?: any;
  _?: 1;
}

export const createPayload = (options: ICreatePayloadOptions, sendJSON: boolean = true) => {
  const payload: IPayload = {};
  if (options.channel) payload.c = options.channel;
  if (options.data) payload.d = options.data;
  if (options.event) payload.e = options.event;
  if (options.id) payload.i = options.id;
  if (options.responseData) payload.d = options.responseData;
  if (options.isErrorInstance) payload._ = 1;
  if (options.rejectMessage) payload.err = options.rejectMessage;
  if (sendJSON) {
    return JSON.stringify(payload);
  }
  return payload;
};

export const getWebSocket = (wsAddress: string = "ws://test"): WebSocket => {
  const mock = new WebSocket(wsAddress);
  mock.CONNECTING = 0;
  mock.OPEN = 1;
  mock.CLOSING = 2;
  mock.CLOSED = 3;
  mock.send = jest.fn();
  mock.close = jest.fn();
  return mock;
};

export const getSendToSocketFn = (mockSocket: WebSocket) => {
  return (...messages: ICreatePayloadOptions[]): void => {
    messages.forEach(msg => {
      const payload = createPayload(msg);
      (mockSocket.onmessage as any)[0]({ data: payload });
    });
  };
};

export const delay = (clb: () => void, done?: () => void) => {
  setTimeout(() => {
    clb();
    if (done) done();
  }, 0);
};

export const connectSocket = (wrapper: any) => {
  wrapper.socketConnection.webSocket.readyState = 1;
  wrapper.socketConnection.webSocket.onopen[0]();
  return wrapper;
};
