import * as fs from "fs";
import * as http from "http";
import * as Koa from "koa";
import * as Router from "koa-router";
import WebSocket, { Server as WebSocketServer } from "ws";
import WebSocketWrapper from "../lib/WebSocketWrapper";
import { IMessage } from './interfaces';

const browserify = require("browserify");
const tsify = require("tsify");

// Create new HTTP server using koa and a new WebSocketServer
const app = new Koa();
const router = new Router();
const server = http.createServer(app.callback());
const socketServer = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

// Save all connected `sockets`
const sockets: WebSocketWrapper[] = [];

interface IUsers {
  [key: string]: WebSocketWrapper;
}

const users: IUsers = {};

socketServer.on("connection", (websocket: WebSocket) => {
  // Upon connection, wrap the socket and save it in the `sockets` array
  const socket = new WebSocketWrapper(websocket);
  sockets.push(socket);

  socket.of("chat").emit("message", <IMessage>{
    from: "system",
    text: 'Welcome! Please pick a username and login.'
  });
  // socket.on('open', () => {})

  // Setup event handlers on the socket
  socket.of("chat").on("login", (username: string): IMessage => {
    if (
      username === "system" ||
      (users[username] && users[username] !== socket)
    ) {
      // Error is sent back to the client
      throw new Error(`Username '${username}' is taken!`);
    } else {
      // Notify all other users
      broadcastMessage("system", `${username} has logged in`);
      // Save the username
      socket.set("username", username);
      users[username] = socket;
      // Answer the request
      return { from: "system", text: "You have been logged in" }
    }
  });

  socket.of("chat").on("message", text => {
    const username = socket.get("username");
    if (username) {
      broadcastMessage(username, text);
    } else {
      throw new Error("Please log in first!");
    }
  });

  socket.of("chat").on("logout", (): IMessage => {
    const username = socket.get("username");
    if (users[username]) {
      delete users[username];
      // Notify all other users
      broadcastMessage("system", `${username} has logged out`);
    }
    return { from: "system", text: "You have been logged out" }
  });

  // Upon disconnect, free resources
  socket.on("disconnect", () => {
    const idx = sockets.indexOf(socket);
    if (idx >= 0) sockets.splice(idx, 1);
    const username = socket.get("username");
    if (users[username]) {
      delete users[username];
      // Notify all other users
      broadcastMessage("system", `${username} has logged out`);
    }
  });
});

const broadcastMessage = (from: string, text: string) => {
  for (const i in users) {
    if (users.hasOwnProperty(i)) {
      users[i]
        .of("chat")
        .emit("message", <IMessage>{ from, text });
    }
  }
}

// Setup koa router
app.use(router.routes());
// Serve index.html and client.js
router.get("/", async (ctx, next) => {
  ctx.type = "text/html";
  ctx.body = fs.createReadStream(__dirname + "/index.html");
});

router.get("/client.js", async ctx => {
  ctx.type = "text/javascript";
  ctx.body = browserify()
    .add(__dirname + "/client.ts")
    .plugin("tsify", { project: __dirname + "/tsconfig.json" })
    .bundle()
});

// Start the server
server.listen(PORT, (): void => {
  console.log("Listening on port " + PORT);
});
