import WebSocketWrapper from '../lib/WebSocketWrapper';
import { IMessage } from './interfaces';

// Enable logging in console
window.localStorage.debug = 'ws-wrapper:log'

class View {
  private wrapper: WebSocketWrapper;
  private username: string;
  private loadingOverlayEl = this.find("#loadingOverlay");
  private loginButtonEl = this.find("#loginButton");
  private logoutButtonEl = this.find("#logoutButton");
  private sendMessageButtonEl = this.find("#newMessage");
  private messagesListEl = this.find("#messageList");
  private usernameInputEl = (this.find("#username") as HTMLInputElement);

  constructor() {
    const socket = new WebSocket("ws://" + location.host);
    this.wrapper = new WebSocketWrapper(socket);
    this.bindEvents();
  }

  private bindEvents() {
    this.wrapper.on("open", this.onConnection.bind(this));
    this.wrapper.on("disconnect", this.onDisconnect.bind(this));
    this.wrapper.on("error", () => this.wrapper.disconnect());
    this.wrapper.of("chat").on("message", this.onNewMessage.bind(this));

    this.loginButtonEl.addEventListener("click", this.login.bind(this));
    this.logoutButtonEl.addEventListener("click", this.logout.bind(this));
    this.sendMessageButtonEl.addEventListener("submit", this.onSubmit.bind(this));
  }

  private onConnection() {
    this.hide([this.loadingOverlayEl]);
  }

  private onDisconnect(wasOpen) {
    // Check `wasOpen` flag, so we don't try to logout on each disconnection
    if (wasOpen) this.logout();

    // Auto-reconnect
    // console.log("Reconnecting in 5 secs...");
    // setTimeout(() => {
    // socket.bind(new WebSocket("ws://" + location.host));
    // }, 5000);
  }

  private onNewMessage(message: IMessage) {
    const { from, text } = message;
    let senderClass = "";
    if (from === 'system') senderClass = 'system';
    if (from === this.username) senderClass = 'me';

    this.messagesListEl.insertAdjacentHTML('beforeend', `
      <p class="message">
        <span class="from ${senderClass}">${from}:</span> ${text}
      </div>
    `);
  }

  private login() {
    this.username = this.usernameInputEl.value;
    this.hide([this.loginButtonEl, this.usernameInputEl]);

    this.wrapper.of("chat").request("login", this.username).then((message: IMessage) => {
      // Login succeeded
      this.show([this.sendMessageButtonEl, this.logoutButtonEl]);
      this.onNewMessage(message);
    }).catch(err => {
      alert(err);
      this.logout();
    });
  }

  private logout() {
    this.hide([this.sendMessageButtonEl, this.logoutButtonEl]);
    this.show([this.usernameInputEl, this.loginButtonEl]);
    // Send request to logout
    this.wrapper.of("chat").request("logout").then((message: IMessage) => {
      this.onNewMessage(message);
    }).catch(err => {
      console.error(err);
    });
  }

  private onSubmit(event: MouseEvent) {
    const input = event.srcElement[0];
    this.wrapper.of("chat").emit("message", input.value);
    input.value = "";
    event.preventDefault();
  }

  private find(selector: string): HTMLElement {
    return document.querySelector(selector) as HTMLElement;
  }

  private hide(elements: HTMLElement[]): void {
    elements.forEach(el => el.style.display = 'none');
  }

  private show(elements: HTMLElement[]): void {
    elements.forEach(el => el.style.display = 'inline-block');
  }
}

new View();
