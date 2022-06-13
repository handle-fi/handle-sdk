import axios from "axios";
import websocket from "websocket";
import { HlpConfig } from "../..";
import { WebsocketPrice } from "../../types/trade";
import { pairFromString } from "../../utils/general-utils";

class PricesWebsocket {
  public client: websocket.w3cwebsocket;

  protected callback?: (data: WebsocketPrice) => void;

  constructor(initialPairs: string[], overrides?: { websocketUrl?: string }) {
    const socket = new websocket.w3cwebsocket(
      overrides?.websocketUrl ?? HlpConfig.HANDLE_WEBSOCKET_URL
    );
    this.client = socket;
    socket.onopen = () => {
      this.subscribe(initialPairs);
    };

    // Set default error handler
    socket.onerror = console.error;
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
    const pairs = typeof pair === "string" ? [pair] : pair;
    // Assert that pairs are valid
    pairs.forEach(pairFromString);

    this.client.send(
      JSON.stringify({
        action: "subscribe",
        params: {
          pairs: pairs.join(",")
        }
      })
    );
    pairs.forEach(async (_pair) => {
      const response = await axios.get(`${HlpConfig.HANDLE_ORACLE_URL}/${_pair}`);
      if (this.callback) {
        this.callback({
          pair: pairFromString(_pair),
          value: response.data.data.result,
          timestamp: Math.floor(Date.now() / 1000)
        });
      }
    });
  }

  public unsubscribe(pair: string | string[]) {
    if (!this.isConnected()) {
      throw new Error("Websocket not connected");
    }
    const pairs = typeof pair === "string" ? [pair] : pair;

    // Assert that pairs are valid
    pairs.forEach(pairFromString);

    this.client.send(
      JSON.stringify({
        action: "unsubscribe",
        params: {
          pairs: pairs.join(",")
        }
      })
    );
  }

  public isConnected() {
    return this.client.readyState === websocket.w3cwebsocket.OPEN;
  }
}

export default PricesWebsocket;
