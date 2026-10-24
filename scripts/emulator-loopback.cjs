// Firebase's Node tooling currently ignores NO_PROXY for some HTTP/WebSocket
// requests. Keep the configured proxy for all remote hosts; use a direct socket
// only for the emulator's loopback addresses. Loaded only by test:firebase.
const { createRequire } = require("node:module");
const isLoopback = (value) => {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(String(value)).hostname,
    );
  } catch {
    return false;
  }
};
const firebaseRequire = createRequire(
  require.resolve("firebase-tools/package.json"),
);
const undici = firebaseRequire("undici");
const OriginalProxyAgent = undici.ProxyAgent;
const localAgent = new undici.Agent();
undici.ProxyAgent = class LoopbackAwareProxyAgent extends OriginalProxyAgent {
  dispatch(options, handler) {
    return isLoopback(options.origin)
      ? localAgent.dispatch(options, handler)
      : super.dispatch(options, handler);
  }
};
const faye = require("faye-websocket");
const OriginalClient = faye.Client;
faye.Client = class LoopbackAwareClient extends OriginalClient {
  constructor(url, protocols, options) {
    if (isLoopback(url) && options?.proxy) {
      options = { ...options };
      delete options.proxy;
    }
    super(url, protocols, options);
  }
};
