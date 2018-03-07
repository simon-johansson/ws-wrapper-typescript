/* This chat server uses "ws" for Node.js WebSockets and the "koa" web
	framework. "node-module-concat" is used to bundle the client-side code at
	run-time.
*/
import * as fs from "fs";
import * as http from "http";
import * as Koa from "koa";
import * as Router from "koa-router";
import * as moduleConcat from "node-module-concat";
import { Server as WebSocketServer } from "ws";
import WebSocketWrapper from "../dist/WebSocketWrapper";

// Create new HTTP server using koa and a new WebSocketServer
const app: Koa = new Koa();
const router: Router = new Router();
const server: http.Server = http.createServer(app.callback());
const socketServer: WebSocketServer = new WebSocketServer({ server });

// Save all connected `sockets`
const sockets: WebSocketWrapper[] = [];
// Save all logged in `users`; keys are usernames, values are the sockets
interface IUsers {
  [key: string]: WebSocketWrapper;
}
const users: IUsers = {};
// Listen for a socket to connect
socketServer.on("connection", websocket => {
  // Upon connection, wrap the socket and save it in the `sockets` array
  const socket = new WebSocketWrapper(websocket);
  sockets.push(socket);

  // socket.emit("message", "system", "username" + " has logged in");
  socket.on("login", (username: string) => {
    console.log('login');
  });

  socket.emit("message", 'test');


  // Setup event handlers on the socket
  socket.of("chat").on("login", (username: string) => {
    if (
      username === "system" ||
      (users[username] && users[username] !== socket)
    ) {
      // Error is sent back to the client
      throw new Error(`Username '${username}' is taken!`);
    } else {
      // Notify all other users
      for (const i in users) {
        if (users.hasOwnProperty(i)) {
          users[i]
            .of("chat")
            .emit("message", "system", username + " has logged in");
        }
      }
      // Save the username
      socket.set("username", username);
      users[username] = socket;
    }
    return 'Test';
  });
  socket.of("chat").on("message", msg => {
    console.log(msg);
    const username = socket.get("username");
    if (username) {
      // We're logged in, so relay the message to all clients
      for (const i in users) {
        if (users.hasOwnProperty(i)) {
          users[i].of("chat").emit("message", username, msg);
        }
      }
    } else {
      throw new Error("Please log in first!");
    }
  });
  socket.of("chat").on("logout", () => {
    const username = socket.get("username");
    if (users[username]) {
      delete users[username];
      // Notify all other users
      for (const i in users) {
        if (users.hasOwnProperty(i)) {
          users[i]
            .of("chat")
            .emit("message", "system", username + " has logged out");
        }
      }
    }
  });
  // Upon disconnect, free resources
  socket.on("disconnect", () => {
    const idx = sockets.indexOf(socket);
    if (idx >= 0) {
      sockets.splice(idx, 1);
    }
    const username = socket.get("username");
    if (users[username]) {
      delete users[username];
      // Notify all other users
      for (const i in users) {
        if (users.hasOwnProperty(i)) {
          users[i]
            .of("chat")
            .emit("message", "system", username + " has logged out");
        }
      }
    }
  });
});

// Setup koa router
app.use(router.routes());
// Serve index.html and client.js
router.get("/", async (ctx, next) => {
  ctx.type = "text/html";
  ctx.body = fs.createReadStream(__dirname + "/index.html");
});
router.get("/client_build.js", async ctx => {
  await buildClient();
  ctx.type = "text/javascript";
  ctx.body = fs.createReadStream(__dirname + "/client_build.js");
});

// Start the server after building client_build.js
const PORT = process.env.PORT || 3000;
server.listen(PORT, (): void => {
  console.log("Listening on port " + PORT);
});

// Build client.js using "node-module-concat"
const buildClient = () => {
  return new Promise((resolve, reject) => {
    moduleConcat(
      __dirname + "/client.js",
      __dirname + "/client_build.js",
      {
        includeNodeModules: true
      },
      (err, files) => {
        if (err) {
          reject(err);
        }
        // console.log(`${files.length} files combined into build:\n`, files);
        resolve();
      }
    );
  });
};
