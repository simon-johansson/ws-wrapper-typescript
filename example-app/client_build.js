/* This header is placed at the beginning of the output file and defines the
	special `__require`, `__getFilename`, and `__getDirname` functions.
*/
(function() {
	/* __modules is an Array of functions; each function is a module added
		to the project */
var __modules = {},
	/* __modulesCache is an Array of cached modules, much like
		`require.cache`.  Once a module is executed, it is cached. */
	__modulesCache = {},
	/* __moduleIsCached - an Array of booleans, `true` if module is cached. */
	__moduleIsCached = {};
/* If the module with the specified `uid` is cached, return it;
	otherwise, execute and cache it first. */
function __require(uid, parentUid) {
	if(!__moduleIsCached[uid]) {
		// Populate the cache initially with an empty `exports` Object
		__modulesCache[uid] = {"exports": {}, "loaded": false};
		__moduleIsCached[uid] = true;
		if(uid === 0 && typeof require === "object") {
			require.main = __modulesCache[0];
		} else {
			__modulesCache[uid].parent = __modulesCache[parentUid];
		}
		/* Note: if this module requires itself, or if its depenedencies
			require it, they will only see an empty Object for now */
		// Now load the module
		__modules[uid](__modulesCache[uid], __modulesCache[uid].exports);
		__modulesCache[uid].loaded = true;
	}
	return __modulesCache[uid].exports;
}
/* This function is the replacement for all `__filename` references within a
	project file.  The idea is to return the correct `__filename` as if the
	file was not concatenated at all.  Therefore, we should return the
	filename relative to the output file's path.

	`path` is the path relative to the output file's path at the time the
	project file was concatenated and added to the output file.
*/
function __getFilename(path) {
	return require("path").resolve(__dirname + "/" + path);
}
/* Same deal as __getFilename.
	`path` is the path relative to the output file's path at the time the
	project file was concatenated and added to the output file.
*/
function __getDirname(path) {
	return require("path").resolve(__dirname + "/" + path + "/../");
}
/********** End of header **********/
/********** Start module 0: /Users/sijo/Projects/personal/ws-wrapper-typescript/example-app/client.js **********/
__modules[0] = function(module, exports) {
"use strict";
const WebSocketWrapper = __require(1,0).default;
window.socket = new WebSocketWrapper(
  new WebSocket("ws://" + location.host),
  { debug: true }
);

socket.on("disconnect", function(wasOpen) {
	if(wasOpen)
		logout();
	console.log("Reconnecting in 5 secs...");
	setTimeout(() => {
		socket.bind(new WebSocket("ws://" + location.host) );
	}, 5000);
});
socket.on("error", () => {
	socket.disconnect();
});

socket.of("chat").on("message", addMessage);

function addMessage(fromStr, msg) {
	let p = $('<p class="message">');
	let from = $('<span class="from">');
	if(fromStr === "system")
		from.addClass("system");
	else if(fromStr === $("#username").val() )
		from.addClass("me");
	from.append(fromStr + ":");
	p.append(from);
	p.append(" " + msg);
	let list = $("#messageList").append(p)[0];
	if(list.scrollHeight - list.scrollTop - list.clientHeight <= 30)
		list.scrollTop = list.scrollHeight;
}

function login() {
	$("#loginButton").hide();
	$("#username").attr("disabled", "disabled");

	socket.of("chat").request("login", $("#username").val() )
		.then(() => {
			$("#logoutButton, #newMessage").show();
			addMessage("system", "You have been logged in");
			$("#message").val("").focus();
		})
		.catch((err) => {
			alert(err);
			logout();
		});
}

function logout() {
	$("#logoutButton, #newMessage").hide();
	$("#loginButton").show();
	$("#username").removeAttr("disabled");
	socket.of("chat").request("logout")
		.then(() => {
			addMessage("system", "You have been logged out");
		})
		.catch((err) => {
			console.error(err);
		});
}

$(() => {
	$("#loginButton").on("click", login);
	$("#logoutButton").on("click", logout);
	$("#newMessage").on("submit", function sendMessage(e) {
		socket.of("chat").emit("message", $("#message").val() );
		$("#message").val("").focus();
		e.preventDefault();
	});

	addMessage("system", "Welcome! Please pick a username and login.");
});

return module.exports;
}
/********** End of module 0: /Users/sijo/Projects/personal/ws-wrapper-typescript/example-app/client.js **********/
/********** Start module 1: /Users/sijo/Projects/personal/ws-wrapper-typescript/dist/WebSocketWrapper.js **********/
__modules[1] = function(module, exports) {
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var WebSocketChannel_1 = __require(2,1);
var WebSocketWrapper = /** @class */ (function (_super) {
    __extends(WebSocketWrapper, _super);
    function WebSocketWrapper(socket, options) {
        if (options === void 0) { options = {}; }
        var _this = 
        _super.call(this) || this;
        /* Object of WebSocketChannels (except `this` associated with this
        WebSocket); keys are the channel name. */
        _this.channels = {};
        _this.data = {};
        _this.opened = false;
        _this.pendingSend = [];
        _this.lastRequestId = 0;
        /* Object of pending requests; keys are the request ID, values are
        Objects containing `resolve` and `reject` functions used to
        resolve the request's Promise. */
        _this.pendingRequests = {};
        _this.wrapper = _this;
        options = options || {};
        if (typeof options.debug === "function") {
            _this.debug = options.debug;
        }
        else if (options.debug === true) {
            _this.debug = console.log.bind(console);
        }
        else {
            _this.debug = function () {
                return;
            }; // no-op
        }
        if (typeof options.errorToJSON !== "function") {
            _this.errorToJSON = function (err) {
                if (typeof window === "undefined") {
                    return JSON.stringify({
                        message: err.message
                    });
                }
                else {
                    return JSON.stringify(err, Object.getOwnPropertyNames(err));
                }
            };
        }
        else {
            _this.errorToJSON = options.errorToJSON;
        }
        if (typeof options.requestTimeout === "number" &&
            options.requestTimeout > 0) {
            _this.requestTimeout = options.requestTimeout || 0;
        }
        if (socket && socket.constructor) {
            _this.bind(socket);
        }
        return _this;
    }
    WebSocketWrapper.prototype.abort = function () {
        for (var id in this.pendingRequests) {
            if (this.pendingRequests.hasOwnProperty(id)) {
                this.pendingRequests[id].reject(new Error("Request was aborted"));
            }
        }
        this.pendingRequests = {};
        this.pendingSend = [];
    };
    WebSocketWrapper.prototype.disconnect = function () {
        if (this.socket) {
            this.socket.close.apply(this.socket, arguments);
        }
    };
    WebSocketWrapper.prototype.get = function (key) {
        return this.data[key];
    };
    WebSocketWrapper.prototype.set = function (key, value) {
        this.data[key] = value;
    };
    WebSocketWrapper.prototype.onMessage = function (msg) {
        try {
            msg = JSON.parse(msg);
            if (msg["ws-wrapper"] === false) {
                return;
            }
            if (msg.a) {
                var argsArray = [];
                for (var i in msg.a) {
                    if (msg.a.hasOwnProperty(i)) {
                        argsArray[i] = msg.a[i];
                    }
                }
                msg.a = argsArray;
            }
            /* If `msg` does not have an `a` Array with at least 1 element,
                      ignore the message because it is not a valid event/request */
            if (msg.a instanceof Array &&
                msg.a.length >= 1 &&
                (msg.c || WebSocketChannel_1.default.NO_WRAP_EVENTS.indexOf(msg.a[0]) < 0)) {
                var event_1 = { name: msg.a.shift(), args: msg.a, requestId: msg.i };
                var channel = msg.c == null ? this : this.channels[msg.c];
                if (!channel) {
                    if (msg.i >= 0) {
                        this.sendReject(msg.i, new Error("Channel '" + msg.c + "' does not exist"));
                    }
                    this.debug("wrapper: Event '" + event_1.name + "' ignored " +
                        ("because channel '" + msg.c + "' does not exist."));
                }
                else if (channel.emitter.emit(event_1.name, event_1)) {
                    this.debug("wrapper: Event '" + event_1.name + "' sent to " + "event listener");
                }
                else {
                    if (msg.i >= 0) {
                        this.sendReject(msg.i, new Error("No event listener for '" +
                            event_1.name +
                            "'" +
                            (msg.c ? " on channel '" + msg.c + "'" : "")));
                    }
                    this.debug("wrapper: Event '" + event_1.name + "' had no " + "event listener");
                }
            }
            else if (this.pendingRequests[msg.i]) {
                this.debug("wrapper: Processing response for request", msg.i);
                if (msg.e !== undefined) {
                    var err = msg.e;
                    if (msg._ && err) {
                        err = new Error(err.message);
                        for (var key in msg.e) {
                            if (msg.e.hasOwnProperty(key)) {
                                err[key] = msg.e[key];
                            }
                        }
                    }
                    this.pendingRequests[msg.i].reject(err);
                }
                else {
                    this.pendingRequests[msg.i].resolve(msg.d);
                }
                clearTimeout(this.pendingRequests[msg.i].timer);
                delete this.pendingRequests[msg.i];
            }
        }
        catch (e) {
            /* Note: It's also possible for uncaught exceptions from event
                      handlers to end up here. */
        }
    };
    WebSocketWrapper.prototype.of = function (namespace) {
        if (namespace == null) {
            return this;
        }
        if (!this.channels[namespace]) {
            this.channels[namespace] = new WebSocketChannel_1.default(namespace, this);
        }
        return this.channels[namespace];
    };
    WebSocketWrapper.prototype.send = function (data, ignoreMaxQueueSize) {
        if (this.isConnected) {
            this.debug("wrapper: Sending message:", data);
            this.socket.send(data);
        }
        else if (ignoreMaxQueueSize ||
            this.pendingSend.length < WebSocketWrapper.MAX_SEND_QUEUE_SIZE) {
            this.debug("wrapper: Queuing message:", data);
            this.pendingSend.push(data);
        }
        else {
            throw new Error("WebSocket is not connected and send queue is full");
        }
    };
    WebSocketWrapper.prototype.bind = function (socket) {
        var _this = this;
        this.socket = socket;
        socket.onopen = function (event) {
            var i;
            _this.opened = true;
            _this.debug("socket: onopen");
            for (i = 0; i < _this.pendingSend.length; i++) {
                if (_this.isConnected) {
                    _this.debug("wrapper: Sending pending message:", _this.pendingSend[i]);
                    _this.socket.send(_this.pendingSend[i]);
                }
                else {
                    break;
                }
            }
            _this.pendingSend = _this.pendingSend.slice(i);
            _this.emit("open", event);
        };
        socket.onmessage = function (event) {
            console.log(event.data);
            _this.debug("socket: onmessage", event.data);
            _this.emit("message", event, event.data);
            _this.onMessage(event.data);
        };
        socket.onerror = function (event) {
            _this.debug("socket: onerror", event);
            _this.emit("error", event);
        };
        socket.onclose = function (event) {
            var opened = _this.opened;
            _this.opened = false;
            _this.debug("socket: onclose", event);
            _this.emit("close", event, opened);
            _this.emit("disconnect", event, opened);
        };
        if (this.isConnected) {
        }
    };
    Object.defineProperty(WebSocketWrapper.prototype, "isConnecting", {
        get: function () {
            return this.socket && this.socket.readyState === this.socket.CONNECTING; // this.socket.readyState? === this.socket.constructor.CONNECTING
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocketWrapper.prototype, "isConnected", {
        get: function () {
            return (
            this.socket && this.socket.readyState === this.socket.OPEN);
        },
        enumerable: true,
        configurable: true
    });
    /* The following methods are called by a WebSocketChannel to send data
          to the Socket. */
    WebSocketWrapper.prototype.sendEvent = function (channel, eventName, args, isRequest) {
        var _this = this;
        var data = { a: args };
        if (channel != null) {
            data.c = channel;
        }
        var request;
        if (isRequest) {
            /* Unless we send petabytes of data using the same socket,
                      we won't worry about `_lastRequestId` getting too big. */
            data.i = ++this.lastRequestId;
            request = new Promise(function (resolve, reject) {
                var pendReq = (_this.pendingRequests[data.i] = {
                    reject: reject,
                    resolve: resolve
                });
                if (_this.requestTimeout > 0) {
                    pendReq.timer = setTimeout(function () {
                        reject(new Error("Request timed out"));
                        delete _this.pendingRequests[data.i];
                    }, _this.requestTimeout);
                }
            });
        }
        this.send(JSON.stringify(data));
        return request;
    };
    WebSocketWrapper.prototype.sendResolve = function (id, data) {
        this.send(JSON.stringify({
            d: data,
            i: id
        }), true /* ignore max queue length */);
    };
    WebSocketWrapper.prototype.sendReject = function (id, err) {
        var isError = err instanceof Error;
        if (isError) {
            err = JSON.parse(this.errorToJSON(err));
        }
        this.send(JSON.stringify({
            _: isError ? 1 : undefined,
            e: err,
            i: id
        }), true /* ignore max queue length */);
    };
    /* Maximum number of items in the send queue.  If a user tries to send more
      messages than this number while a WebSocket is not connected, errors will
      be thrown. */
    WebSocketWrapper.MAX_SEND_QUEUE_SIZE = 10;
    return WebSocketWrapper;
}(WebSocketChannel_1.default));
exports.default = WebSocketWrapper;
return module.exports;
}
/********** End of module 1: /Users/sijo/Projects/personal/ws-wrapper-typescript/dist/WebSocketWrapper.js **********/
/********** Start module 2: /Users/sijo/Projects/personal/ws-wrapper-typescript/dist/WebSocketChannel.js **********/
__modules[2] = function(module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var eventemitter3_1 = __require(3,2);
/* A WebSocketChannel exposes an EventEmitter-like API for sending and handling
    events or requests over the channel through the attached WebSocketWrapper.

    `var channel = new WebSocketChannel(name, socketWrapper);`
        - `name` - the namespace for the channel
        - `socketWrapper` - the WebSocketWrapper instance to which data should
            be sent
*/
var WebSocketChannel = /** @class */ (function () {
    function WebSocketChannel(name, socketWrapper) {
        this.name = name;
        this.wrapper = socketWrapper;
        this.emitter = new eventemitter3_1.EventEmitter();
        this.wrappedListeners = new WeakMap();
    }
    /* Expose EventEmitter-like API
          When `eventName` is one of the `NO_WRAP_EVENTS`, the event handlers
          are left untouched, and the emitted events are just sent to the
          EventEmitter; otherwise, event listeners are wrapped to process the
          incoming request and the emitted events are sent to the WebSocketWrapper
          to be serialized and sent over the WebSocket. */
    WebSocketChannel.prototype.on = function (eventName, listener) {
        if (this.name == null &&
            WebSocketChannel.NO_WRAP_EVENTS.indexOf(eventName) >= 0) {
            /* Note: The following is equivalent to:
                          `this._emitter.on(eventName, listener.bind(this));`
                      But thanks to eventemitter3, the following is a touch faster. */
            this.emitter.on(eventName, listener, this);
        }
        else {
            this.emitter.on(eventName, this.wrapListener(listener));
        }
        return this;
    };
    WebSocketChannel.prototype.once = function (eventName, listener) {
        if (this.name == null &&
            WebSocketChannel.NO_WRAP_EVENTS.indexOf(eventName) >= 0) {
            this.emitter.once(eventName, listener, this);
        }
        else {
            this.emitter.once(eventName, this.wrapListener(listener));
        }
        return this;
    };
    WebSocketChannel.prototype.removeListener = function (eventName, listener) {
        if (this.name == null &&
            WebSocketChannel.NO_WRAP_EVENTS.indexOf(eventName) >= 0) {
            this.emitter.removeListener(eventName, listener);
        }
        else {
            this.emitter.removeListener(eventName, this.wrappedListeners.get(listener));
        }
        return this;
    };
    WebSocketChannel.prototype.removeAllListeners = function (eventName) {
        this.emitter.removeAllListeners(eventName);
        return this;
    };
    WebSocketChannel.prototype.eventNames = function () {
        return this.emitter.eventNames();
    };
    WebSocketChannel.prototype.listeners = function (eventName) {
        if (this.name == null &&
            WebSocketChannel.NO_WRAP_EVENTS.indexOf(eventName) >= 0) {
            return this.emitter.listeners(eventName);
        }
        else {
            return this.emitter.listeners(eventName).map(function (wrapper) {
                return wrapper.original;
            });
        }
    };
    /* The following `emit` and `request` methods will serialize and send the
          event over the WebSocket using the WebSocketWrapper. */
    WebSocketChannel.prototype.emit = function (eventName) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (typeof this.name === 'undefined' &&
            WebSocketChannel.NO_WRAP_EVENTS.indexOf(eventName) >= 0) {
            return this.emitter.emit.apply(this.emitter, arguments);
        }
        else {
            return this.wrapper.sendEvent(this.name, eventName, arguments);
        }
    };
    /* Temporarily set the request timeout for the next request. */
    WebSocketChannel.prototype.timeout = function (tempTimeout) {
        this.tempTimeout = tempTimeout;
        return this;
    };
    WebSocketChannel.prototype.request = function (eventName) {
        var oldTimeout = this.wrapper.requestTimeout;
        if (this.tempTimeout !== undefined) {
            this.wrapper.requestTimeout = this.tempTimeout;
            delete this.tempTimeout;
        }
        var ret = this.wrapper.sendEvent(this.name, eventName, arguments, true);
        this.wrapper.requestTimeout = oldTimeout;
        return ret;
    };
    WebSocketChannel.prototype.wrapListener = function (listener) {
        if (typeof listener !== "function") {
            throw new TypeError('"listener" argument must be a function');
        }
        var wrapped = this.wrappedListeners.get(listener);
        if (!wrapped) {
            var returnVal_1;
            wrapped = function channelListenerWrapper(event) {
                var _this = this;
                /* This function is called when an event is emitted on this
                            WebSocketChannel's `_emitter` when the WebSocketWrapper
                            receives an incoming message for this channel.  If this
                            event is a request, special processing is needed to
                            send the response back over the socket.  Below we use
                            the return value from the original `listener` to
                            determine what response should be sent back.
        
                            `this` refers to the WebSocketChannel instance
                            `event` has the following properties:
                            - `name`
                            - `args`
                            - `requestId`
                        */
                try {
                    returnVal_1 = listener.apply(this, event.args);
                }
                catch (err) {
                    if (event.requestId >= 0) {
                        /* If event listener throws, pass that Error back
                                        as a response to the request */
                        this.wrapper.sendReject(event.requestId, err);
                    }
                    throw err;
                }
                if (returnVal_1 instanceof Promise) {
                    /* If event listener returns a Promise, respond once
                                  the Promise resolves */
                    returnVal_1
                        .then(function (data) {
                        if (event.requestId >= 0) {
                            _this.wrapper.sendResolve(event.requestId, data);
                        }
                    })
                        .catch(function (err) {
                        if (event.requestId >= 0) {
                            _this.wrapper.sendReject(event.requestId, err);
                        }
                    });
                }
                else if (event.requestId >= 0) {
                    /* Otherwise, assume that the `returnVal` is what
                                  should be passed back as the response */
                    this.wrapper.sendResolve(event.requestId, returnVal_1);
                }
            }.bind(this); // Bind the channel to the `channelListenerWrapper`
            wrapped.original = listener;
            this.wrappedListeners.set(listener, wrapped);
        }
        return wrapped;
    };
    WebSocketChannel.NO_WRAP_EVENTS = [
        "open",
        "message",
        "error",
        "close",
        "disconnect"
    ];
    return WebSocketChannel;
}());
exports.default = WebSocketChannel;
return module.exports;
}
/********** End of module 2: /Users/sijo/Projects/personal/ws-wrapper-typescript/dist/WebSocketChannel.js **********/
/********** Start module 3: /Users/sijo/Projects/personal/ws-wrapper-typescript/node_modules/eventemitter3/index.js **********/
__modules[3] = function(module, exports) {
'use strict';

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @api private
 */
function Events() {}
if (Object.create) {
  Events.prototype = Object.create(null);
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {Mixed} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Boolean} exists Only check if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Remove the listeners of a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {Mixed} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
         listeners.fn === fn
      && (!once || listeners.once)
      && (!context || listeners.context === context)
    ) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
           listeners[i].fn !== fn
        || (once && !listeners[i].once)
        || (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {String|Symbol} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};
EventEmitter.prefixed = prefix;
EventEmitter.EventEmitter = EventEmitter;
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

return module.exports;
}
/********** End of module 3: /Users/sijo/Projects/personal/ws-wrapper-typescript/node_modules/eventemitter3/index.js **********/
/********** Footer **********/
if(typeof module === "object")
	module.exports = __require(0);
else
	return __require(0);
})();
/********** End of footer **********/
