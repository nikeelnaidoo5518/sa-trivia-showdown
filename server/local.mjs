// Local development relay. Host is authoritative; private inputs go only to the host.
import { WebSocketServer, WebSocket } from "ws";
const port = Number(process.env.PORT || 3001),
  rooms = new Map();
const wss = new WebSocketServer({ port, maxPayload: 256 * 1024 });
const send = (ws, data) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
};
const broadcast = (room, data) => {
  for (const c of room.clients) send(c, data);
};
wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      const m = JSON.parse(raw);
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(m.code || ""))
        throw Error("Use the six-character room code.");
      let room = rooms.get(m.code);
      if (m.type === "create") {
        if (room && (room.host !== m.identity || room.hostToken !== m.token))
          throw Error("Room code already exists. Try again.");
        if (!room) {
          room = {
            host: m.identity,
            hostToken: m.token,
            state: m.state,
            clients: new Set(),
            members: new Map(),
            tokens: new Map(),
            created: Date.now(),
          };
          rooms.set(m.code, room);
        }
        ws.role = "host";
        ws.identity = m.identity;
        ws.code = m.code;
        room.clients.add(ws);
        room.hostSocket = ws;
        send(ws, { type: "state", state: room.state });
        for (const [identity, profile] of room.members)
          send(ws, { type: "join", identity, profile });
        send(ws, { type: "connected" });
        return;
      }
      if (!room)
        throw Error(
          "Room not found. Check the code and ask the host to keep the TV open.",
        );
      if (m.type === "join") {
        if (m.identity === room.host)
          throw Error(
            "The host identity cannot join as a player. Open a separate browser profile.",
          );
        if (
          room.tokens.has(m.identity) &&
          room.tokens.get(m.identity) !== m.token
        )
          throw Error(
            "Session could not be restored. Use the original browser.",
          );
        room.tokens.set(m.identity, m.token);
        ws.role = "player";
        ws.identity = m.identity;
        ws.code = m.code;
        room.clients.add(ws);
        room.members.set(m.identity, m.profile);
        send(ws, { type: "state", state: room.state });
        send(room.hostSocket, {
          type: "join",
          identity: m.identity,
          profile: m.profile,
        });
        send(ws, { type: "connected" });
        return;
      }
      if (ws.code !== m.code || ws.identity !== m.identity)
        throw Error("Reconnect to the room first.");
      if (m.type === "state") {
        if (ws.role !== "host" || m.identity !== room.host)
          throw Error("Only the host may update the game.");
        room.state = m.state;
        broadcast(room, { type: "state", state: m.state });
      }
      if (m.type === "input")
        send(room.hostSocket, {
          type: "input",
          identity: ws.identity,
          action: m.action,
        });
      if (m.type === "feedback") {
        if (ws.role !== "host") throw Error("Host only.");
        for (const c of room.clients)
          if (c.identity === m.target)
            send(c, { type: "feedback", message: m.message, error: m.error });
      }
    } catch (e) {
      send(ws, { type: "feedback", error: true, message: e.message });
    }
  });
  ws.on("close", () => {
    const room = rooms.get(ws.code);
    room?.clients.delete(ws);
  });
});
setInterval(() => {
  for (const [code, room] of rooms)
    if (
      Date.now() - room.created > 12 * 60 * 60 * 1000 &&
      room.clients.size === 0
    )
      rooms.delete(code);
}, 60000).unref();
console.log(`Local multiplayer relay ready on port ${port}`);
