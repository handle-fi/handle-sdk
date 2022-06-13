import axios from "axios";
import websocket from "websocket";
import { WebsocketPrice } from "../../types/trade";
import { pairFromString } from "../../utils/general-utils";

class PricesWebsocket {
  public client: websocket.w3cwebsocket;

  protected callback: (data: WebsocketPrice) => void = () => void 0;

  constructor(initialPairs: string[]) {
    const socket = new websocket.w3cwebsocket("wss://oracle.handle.fi/quotes");
    this.client = socket;
    socket.onopen = () => {
      this.subscribe(initialPairs);
    };
  }

  public onMessage(callback: (data: WebsocketPrice) => void) {
    this.callback = callback;
    this.client.onmessage = (message) => {
      if (typeof message.data === "string") {
        const data = JSON.parse(message.data);
        callback(data);
      }
    };
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
    if (typeof pair === "string") {
      axios.get(`https://oracle.handle.fi/${pair}`).then((response) => {
        this.callback({
          pair: pairFromString(pair),
          value: response.data.data.result,
          timestamp: Math.floor(Date.now() / 1000)
        });
      });
    } else {
      pair.forEach((_pair) => {
        axios.get(`https://oracle.handle.fi/${_pair}`).then((response) => {
          this.callback({
            pair: pairFromString(_pair),
            value: response.data.data.result,
            timestamp: Math.floor(Date.now() / 1000)
          });
        });
      });
    }
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
