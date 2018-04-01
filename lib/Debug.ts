import debug = require("debug");

const WS_WRAPPER_NAMESPACE = "ws-wrapper";

export default class Debug {
  public static log: debug.IDebugger = debug(`${WS_WRAPPER_NAMESPACE}:log`);
  public static error: debug.IDebugger = debug(`${WS_WRAPPER_NAMESPACE}:error`);
}
