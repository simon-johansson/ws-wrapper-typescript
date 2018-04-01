export default abstract class Event {
  public readonly type: string;

  public get toJSON() {
    const sendFormat = this.getSendFormat();
    return JSON.stringify(sendFormat);
  }

  protected abstract getSendFormat(): object;
}
