import { uuid } from "./ids.js";
const randomCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32],
  ).join("");
const savedIdentity = (key = "sa.identity") => {
  let value = localStorage.getItem(key);
  if (!value) {
    value = uuid();
    localStorage.setItem(key, value);
  }
  return value;
};
export const firebaseConfigured =
  !!import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "true");
export class Transport {
  constructor(callbacks) {
    this.cb = callbacks;
    this.identity = savedIdentity();
    this.secret = savedIdentity("sa.relay-token");
    this.status = "offline";
    this.cleanups = [];
    this.pending = [];
    this.seen = new Set();
  }
  statusChanged(status) {
    this.status = status;
    this.cb.status?.(status);
  }
  async init(mode) {
    this.mode =
      mode ||
      (firebaseConfigured
        ? "firebase"
        : import.meta.env.DEV
          ? "local"
          : "demo");
    if (this.mode === "firebase") {
      const [
        { initializeApp, getApps },
        { getAuth, signInAnonymously, connectAuthEmulator },
        {
          getDatabase,
          ref,
          set,
          get,
          onValue,
          onChildAdded,
          onChildChanged,
          connectDatabaseEmulator,
        },
      ] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/database"),
      ]);
      const emulate =
        import.meta.env.DEV &&
        import.meta.env.VITE_FIREBASE_EMULATORS === "true";
      const existing = getApps()[0];
      const app =
        existing ||
        initializeApp(
          emulate
            ? {
                apiKey: "demo-key",
                projectId: "demo-sa-trivia-showdown",
                databaseURL:
                  "https://demo-sa-trivia-showdown-default-rtdb.firebaseio.com",
                appId: "demo-app",
              }
            : {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
              },
        );
      const auth = getAuth(app);
      this.db = getDatabase(app);
      if (emulate && !existing) {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", {
          disableWarnings: true,
        });
        connectDatabaseEmulator(this.db, "127.0.0.1", 9000);
      }
      await auth.authStateReady();
      if (!auth.currentUser) await signInAnonymously(auth);
      this.identity = auth.currentUser.uid;
      this.f = { ref, set, get, onValue, onChildAdded, onChildChanged };
    }
    return this;
  }
  async host(state, code) {
    this.role = "host";
    this.code = code || randomCode();
    this.initialState = state;
    await this.connect();
    return this.code;
  }
  async join(code, profile) {
    this.role = "player";
    this.code = code.toUpperCase().trim();
    this.profile = profile;
    await this.connect();
    return this.code;
  }
  async connect() {
    this.statusChanged("connecting");
    if (this.mode === "firebase") return this.connectFirebase();
    if (this.mode === "demo") {
      this.channel?.close();
      this.channel = new BroadcastChannel("sa.room." + this.code);
      this.channel.onmessage = (e) => this.receive(e.data);
      if (this.role === "host") {
        localStorage.setItem(
          "sa.room." + this.code,
          JSON.stringify(this.initialState),
        );
        this.cb.state(this.initialState);
      } else {
        const state = localStorage.getItem("sa.room." + this.code);
        if (!state)
          throw Error(
            "Demo room not found. Demo controllers must use the same browser.",
          );
        this.cb.state(JSON.parse(state));
        this.send({ type: "join", profile: this.profile });
      }
      this.statusChanged("connected");
      return;
    }
    this.socket?.close();
    const url =
      import.meta.env.VITE_LOCAL_RELAY_URL ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:3001`;
    await new Promise((resolve, reject) => {
      const ws = (this.socket = new WebSocket(url));
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(
            Error(
              "Cannot reach the local relay. Run npm run dev, or try Demo.",
            ),
          );
        }
      }, 6000);
      ws.onopen = () => {
        this.send(
          this.role === "host"
            ? { type: "create", state: this.initialState }
            : { type: "join", profile: this.profile },
        );
      };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        this.receive(data);
        if (data.type === "connected" && !settled) {
          settled = true;
          clearTimeout(timeout);
          resolve();
        }
        if (data.type === "feedback" && data.error && !settled) {
          settled = true;
          clearTimeout(timeout);
          reject(Error(data.message));
        }
      };
      ws.onclose = () => {
        this.statusChanged("offline");
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(Error("The multiplayer connection closed."));
        }
      };
      ws.onerror = () => this.statusChanged("offline");
    });
  }
  async connectFirebase() {
    const { ref, set, get, onValue, onChildAdded, onChildChanged } = this.f;
    const path = `rooms/${this.code}`;
    this.cleanups.forEach((f) => f());
    this.cleanups = [];
    if (this.role === "host") {
      const owner = await get(ref(this.db, path + "/host"));
      if (owner.exists() && owner.val() !== this.identity)
        throw Error("Room code unavailable. Start a new room.");
      if (!owner.exists())
        await set(ref(this.db, path), {
          host: this.identity,
          createdAt: Date.now(),
          expiresAt: Date.now() + 43200000,
          state: JSON.parse(JSON.stringify(this.initialState)),
        });
      const handleJoin = (snap) => this.cb.join?.(snap.key, snap.val());
      this.cleanups.push(
        onChildAdded(ref(this.db, path + "/members"), handleJoin),
        onChildChanged(ref(this.db, path + "/members"), handleJoin),
      );
      const handleInput = (snap) => {
        const item = snap.val();
        if (item && !this.seen.has(item.id)) {
          this.seen.add(item.id);
          this.cb.input?.(snap.key, item);
        }
      };
      this.cleanups.push(
        onChildAdded(ref(this.db, path + "/inputs"), handleInput),
        onChildChanged(ref(this.db, path + "/inputs"), handleInput),
      );
    } else {
      const owner = await get(ref(this.db, path + "/host"));
      if (!owner.exists()) throw Error("Room not found. Check the code.");
      const existing = await get(ref(this.db, path + "/state"));
      if (!existing.exists()) throw Error("Room not found. Check the code.");
      await set(ref(this.db, path + "/members/" + this.identity), this.profile);
      this.cleanups.push(
        onValue(ref(this.db, path + "/feedback/" + this.identity), (snap) => {
          if (snap.val() && Date.now() - snap.val().at < 10000)
            this.cb.feedback?.(snap.val());
        }),
      );
    }
    this.cleanups.push(
      onValue(
        ref(this.db, path + "/state"),
        (snap) => {
          if (snap.val()) this.cb.state(snap.val());
        },
        (e) => this.cb.feedback?.({ error: true, message: e.message }),
      ),
      onValue(ref(this.db, ".info/connected"), (snap) =>
        this.statusChanged(snap.val() ? "connected" : "offline"),
      ),
    );
  }
  receive(m) {
    if (m.target && m.target !== this.identity) return;
    if (m.type === "state") this.cb.state(m.state);
    if (m.type === "join" && this.role === "host")
      this.cb.join?.(m.identity, m.profile);
    if (m.type === "input" && this.role === "host")
      this.cb.input?.(m.identity, m.action);
    if (m.type === "feedback") this.cb.feedback?.(m);
    if (m.type === "connected") this.statusChanged("connected");
  }
  send(m) {
    const envelope = {
      ...m,
      code: this.code,
      identity: this.identity,
      token: this.secret,
    };
    if (this.mode === "demo") this.channel.postMessage(envelope);
    else if (this.socket?.readyState === 1)
      this.socket.send(JSON.stringify(envelope));
    else throw Error("Connection lost. Tap Reconnect.");
  }
  async publish(state) {
    this.initialState = state;
    if (this.mode === "firebase") {
      await this.f.set(
        this.f.ref(this.db, `rooms/${this.code}/state`),
        JSON.parse(JSON.stringify(state)),
      );
    } else {
      if (this.mode === "demo")
        localStorage.setItem("sa.room." + this.code, JSON.stringify(state));
      this.send({ type: "state", state });
    }
  }
  async input(action) {
    const envelope = { ...action, id: uuid() };
    if (this.mode === "firebase")
      await this.f.set(
        this.f.ref(this.db, `rooms/${this.code}/inputs/${this.identity}`),
        envelope,
      );
    else this.send({ type: "input", action: envelope });
  }
  async feedback(target, message, error = false) {
    if (this.mode === "firebase")
      await this.f.set(
        this.f.ref(this.db, `rooms/${this.code}/feedback/${target}`),
        { message, error, at: Date.now() },
      );
    else this.send({ type: "feedback", target, message, error });
  }
  close() {
    this.cleanups.forEach((f) => f());
    this.channel?.close();
    this.socket?.close();
    this.statusChanged("offline");
  }
}
