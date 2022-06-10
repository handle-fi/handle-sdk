import websocket from "websocket";
import { WebsocketPrice } from "../../types/trade";

class PricesWebsocket {
  public client: websocket.w3cwebsocket;

  public onMessage: (data: WebsocketPrice) => void;

  constructor(initialPairs: string[]) {
    const socket = new websocket.w3cwebsocket("wss://oracle.handle.fi/quotes");
    this.client = socket;
    socket.onopen = () => {
      this.client.onmessage = (message) => {
        if (typeof message.data === "string") {
          const data = JSON.parse(message.data);
          this.onMessage(data);
        }
      };
      this.subscribe(initialPairs);
    };

    this.onMessage = () => void 0;
  }

  public subscribe(pair: string | string[]) {
    if (!this.isConnected()) {
      throw new Error("Websocket not connected");
    }
    this.client.send(
      JSON.stringify({
        action: "subscribe",
        params: {
          pairs: typeof pair === "string" ? pair : pair.join(",")
        }
      })
    );
  }

  public unsubscribe(pair: string | string[]) {
    if (!this.isConnected()) {
      throw new Error("Websocket not connected");
    }
    this.client.send(
      JSON.stringify({
        action: "unsubscribe",
        params: {
          pairs: typeof pair === "string" ? pair : pair.join(",")
        }
      })
    );
  }

  public isConnected() {
    return this.client.readyState === websocket.w3cwebsocket.OPEN;
  }
}

export default PricesWebsocket;
