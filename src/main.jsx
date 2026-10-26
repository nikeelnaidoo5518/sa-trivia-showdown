import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import bank from "./data/index.js";
import { GameEngine, standings } from "./engine.js";
import { Transport, firebaseConfigured } from "./transport.js";
import {
  AVATARS,
  CARDS,
  CATEGORIES,
  COLOURS,
  DEFAULT_SETTINGS,
  PROVINCES,
  cash,
} from "./catalog.js";
import { Avatar, ClueArt, Icon, Landscape } from "./components/Art.jsx";
import {
  EventGame,
  GameMap,
  Ordering,
  PracticeGame,
  SequenceGame,
} from "./components/MiniGames.jsx";
import "./style.css";
import { cue, unlockSound } from "./sound.js";

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const normalState = (s) => ({
  ...s,
  players: (s.players || []).map((p) => ({ ...p, cards: p.cards || [] })),
  results: s.results || [],
  history: s.history || [],
  receipts: s.receipts || {},
  hints: s.hints || {},
  repairReceipts: s.repairReceipts || {},
  predictions: s.predictions || {},
  wagerReceipts: s.wagerReceipts || {},
});
function App() {
  const query = new URLSearchParams(location.search);
  const [screen, setScreen] = useState(query.has("room") ? "join" : "menu"),
    [tvMode, setTvMode] = useState(query.get("tv") === "1"),
    [settings, setSettings] = useState(() => ({
      ...DEFAULT_SETTINGS,
      ...read("sa.settings", {}),
    })),
    [state, setState] = useState(null),
    [role, setRole] = useState(""),
    [code, setCode] = useState(query.get("room") || ""),
    [connection, setConnection] = useState("offline"),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(null),
    [qr, setQr] = useState(""),
    [demo, setDemo] = useState(false),
    [controller, setController] = useState(false),
    [practice, setPractice] = useState(null),
    [confirmation, setConfirmation] = useState(null),
    [setup, setSetup] = useState(null);
  const engine = useRef(null),
    transport = useRef(null),
    botActions = useRef(new Set()),
    stateRef = useRef(null),
    toastTimer = useRef();
  const notify = useCallback((message, error = false) => {
    setToast({ message, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5500);
  }, []);
  const updateState = useCallback((s) => {
    if (!s) return;
    const next = normalState(s);
    stateRef.current = next;
    setState(next);
  }, []);
  const publish = useCallback(() => {
    if (!engine.current) return;
    const s = engine.current.snapshot();
    updateState(s);
    save("sa.recent", engine.current.recent);
    if (transport.current?.role === "host") {
      save("sa.host", {
        code: transport.current.code,
        mode: transport.current.mode,
        engine: engine.current.serialise(),
      });
      transport.current.publish(s).catch((e) => notify(e.message, true));
    }
  }, [notify, updateState]);
  const processInput = useCallback(
    (identity, action) => {
      if (!engine.current) return;
      try {
        engine.current.processed ??= [];
        if (action.id && engine.current.processed.includes(action.id)) return;
        engine.current.input(identity, action);
        if (action.id) engine.current.processed.push(action.id);
        if (action.type !== "heartbeat") publish();
      } catch (e) {
        transport.current.feedback(identity, e.message, true).catch(() => {});
      }
    },
    [publish],
  );
  const makeTransport = () =>
    new Transport({
      state: updateState,
      status: setConnection,
      feedback: (m) => notify(m.message, m.error),
      join: (identity, profile) => {
        try {
          engine.current.addPlayer(identity, profile);
          publish();
        } catch (e) {
          transport.current.feedback(identity, e.message, true).catch(() => {});
        }
      },
      input: processInput,
    });
  useEffect(() => {
    save("sa.settings", settings);
    document.documentElement.classList.toggle(
      "reduced-motion",
      settings.reducedMotion,
    );
    document.documentElement.classList.toggle("large-text", settings.largeText);
  }, [settings]);
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      const worker = new URL("sw.js", document.baseURI);
      navigator.serviceWorker.register(worker).catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (role === "player") return;
    const onRemoteKey = (event) => {
      if (
        !tvMode ||
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.key,
        )
      )
        return;
      const active = document.activeElement;
      if (
        active?.matches?.("input, select, textarea, [role='slider']") ||
        active?.closest?.("[role='application']")
      )
        return;
      const focusable = [
        ...document.querySelectorAll(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      event.preventDefault();
      const current = focusable.indexOf(active);
      if (current < 0) {
        focusable[0].focus();
        return;
      }
      const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1;
      focusable[
        (current + direction + focusable.length) % focusable.length
      ].focus();
    };
    document.addEventListener("keydown", onRemoteKey);
    return () => document.removeEventListener("keydown", onRemoteKey);
  }, [tvMode, role]);
  useEffect(() => {
    if (!settings.sound && "speechSynthesis" in window)
      speechSynthesis.cancel();
  }, [settings.sound]);
  useEffect(() => {
    if (!confirmation && !practice && !setup) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        setConfirmation(null);
        setPractice(null);
        setSetup(null);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = [
        ...document.querySelectorAll(
          '.modal button:not(:disabled),.modal input:not(:disabled),.modal [tabindex="0"]',
        ),
      ];
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.querySelector(".modal button")?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [confirmation, practice, setup]);
  useEffect(() => {
    if (!code || !role) return;
    const url = new URL(location.href);
    url.hash = "";
    url.search = "";
    url.searchParams.set("room", code);
    if (transport.current?.mode === "demo")
      url.searchParams.set("mode", "demo");
    QRCode.toDataURL(url.href, {
      width: 260,
      margin: 2,
      color: { dark: "#101b32", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQr);
  }, [code, role]);
  useEffect(() => {
    const timer = setInterval(() => {
      const e = engine.current;
      if (role === "host" && e) {
        if (e.tick()) publish();
        if (
          demo &&
          !e.state.paused &&
          ["playing", "event", "select", "wager"].includes(e.state.phase)
        ) {
          for (const p of e.state.players.filter((p) => p.bot)) {
            const key = e.state.activityId + e.state.phase + p.id;
            if (botActions.current.has(key)) continue;
            if (
              e.state.deadline - Date.now() >
              (e.state.phase === "select" || e.state.phase === "wager"
                ? 11000
                : 17000)
            )
              continue;
            botActions.current.add(key);
            const s = e.state;
            let type =
                s.phase === "select"
                  ? "vote"
                  : s.phase === "wager"
                    ? "wager"
                    : "answer",
              value;
            if (type === "vote")
              value = PROVINCES[Math.floor(Math.random() * 9)];
            else if (type === "wager") value = 100;
            else if (s.phase === "event") {
              const ev = s.event;
              value =
                ev.kind === "repair"
                  ? ev.sequence
                  : ev.kind === "memory"
                    ? ev.missing
                    : ev.kind === "route"
                      ? "safe"
                      : ev.kind === "catch"
                        ? { caught: true, answer: ev.a + ev.b }
                        : ev.a + ev.b;
            } else if (s.mini?.kind === "map")
              value = {
                x: 40 + Math.random() * 40,
                y: 25 + Math.random() * 40,
              };
            else if (["braai", "drum"].includes(s.mini?.kind))
              value = s.mini.sequence.map((v) =>
                Math.random() > 0.25 ? v : 0,
              );
            else
              value =
                Math.random() > 0.3
                  ? e.question.answer
                  : e.question.options?.find((x) => x !== e.question.answer) ||
                    "Pass";
            try {
              e.input(p.id, { type, value, activityId: s.activityId });
              publish();
            } catch {}
          }
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, [role, demo, publish]);
  useEffect(() => {
    if (role !== "player" || !transport.current) return;
    const t = setInterval(() => {
      transport.current
        .input({ type: "heartbeat", activityId: stateRef.current?.activityId })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [role]);
  useEffect(() => {
    if (screen === "join" && query.has("room")) {
      const profile = read("sa.profile." + query.get("room"), null);
      if (profile) joinRoom(query.get("room"), profile, query.get("mode"));
    }
    return () => {};
  }, []);
  useEffect(() => {
    const enable = () => {
      if (settings.sound) unlockSound();
    };
    document.addEventListener("pointerdown", enable);
    document.addEventListener("keydown", enable);
    return () => {
      document.removeEventListener("pointerdown", enable);
      document.removeEventListener("keydown", enable);
    };
  }, [settings.sound]);
  useEffect(() => {
    if (!settings.sound || role !== "host" || !state) return;
    if (["results", "event-results"].includes(state.phase)) {
      const round = state.rounds[state.roundIndex];
      const competitors = state.results.filter((result) =>
        state.players.some(
          (player) => player.id === result.id && !player.audience,
        ),
      );
      const best = Math.max(0, ...competitors.map((result) => result.delta));
      const hasWinner = competitors.some(
        (result) => result.delta === best && (result.correct || best > 0),
      );
      cue(
        round && ["map", "braai", "drum"].includes(round.kind)
          ? hasWinner
            ? "win"
            : "miss"
          : hasWinner
            ? "win"
            : competitors.some((result) => result.correct)
              ? "correct"
              : "miss",
      );
      return;
    }
    const round = state.rounds[state.roundIndex];
    cue(
      state.phase === "playing" && round?.kind !== "question"
        ? round?.kind
        : state.phase,
    );
  }, [state?.phase, state?.activityId, role, settings.sound]);
  useEffect(() => {
    if (
      !settings.sound ||
      role !== "host" ||
      !state ||
      state.paused ||
      !["playing", "event"].includes(state.phase)
    )
      return;
    let last;
    const id = setInterval(() => {
      const n = Math.ceil((state.deadline - Date.now()) / 1000);
      if (n > 0 && n <= 5 && n !== last) {
        cue("tick");
        last = n;
      }
    }, 200);
    return () => clearInterval(id);
  }, [state?.deadline, state?.phase, state?.paused, role, settings.sound]);
  useEffect(() => {
    if (
      settings.sound &&
      role === "host" &&
      state?.notice?.includes("Confetti")
    )
      cue("trick");
  }, [state?.notice, settings.sound, role]);
  async function startGame(isDemo = false, resume = false) {
    setBusy(true);
    try {
      transport.current?.close();
      const saved = resume ? read("sa.host", null) : null;
      engine.current = saved
        ? GameEngine.restore(bank, saved.engine)
        : new GameEngine(bank, settings, read("sa.recent", []));
      const t = makeTransport();
      transport.current = t;
      await t.init(saved?.mode || (isDemo ? "demo" : undefined));
      const room = await t.host(engine.current.snapshot(), saved?.code);
      setCode(room);
      setRole("host");
      setScreen("game");
      setDemo(isDemo || saved?.mode === "demo");
      setController(isDemo);
      if (isDemo && !saved) {
        engine.current.addPlayer("demo-you", {
          name: "You",
          avatar: "Sun",
          colour: COLOURS[0],
          team: "Ubuntu",
        });
        engine.current.state.players[0].ready = true;
        ["Thandi", "Sipho", "Alex"].forEach((name, i) => {
          const p = engine.current.addPlayer("bot-" + i, {
            name,
            avatar: AVATARS[i + 1],
            colour: COLOURS[i + 1],
            team: i % 2 ? "Ubuntu" : "Eish!",
          });
          p.bot = true;
          p.ready = true;
        });
      }
      publish();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  async function joinRoom(room, profile, mode) {
    setBusy(true);
    try {
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(room.toUpperCase()))
        throw Error("Enter the six-character code shown on the TV.");
      transport.current?.close();
      const t = makeTransport();
      transport.current = t;
      await t.init(mode || query.get("mode") || undefined);
      await t.join(room, profile);
      setCode(room.toUpperCase());
      save("sa.profile." + room.toUpperCase(), profile);
      setRole("player");
      setScreen("game");
      const url = new URL(location.href);
      url.searchParams.set("room", room.toUpperCase());
      if (t.mode === "demo") url.searchParams.set("mode", "demo");
      history.replaceState(null, "", url);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  function hostAction(action) {
    try {
      engine.current[action]();
      publish();
    } catch (e) {
      notify(e.message, true);
    }
  }
  function sendAction(action, demoPlayer = false) {
    const s = stateRef.current;
    const envelope = { ...action, activityId: s?.activityId };
    const feedback = () => {
      if (!settings.sound) return;
      cue(action.type === "trick" ? "trick" : "lock");
    };
    if (demoPlayer) {
      try {
        engine.current.input("demo-you", envelope);
        publish();
        feedback();
      } catch (e) {
        notify(e.message, true);
      }
    } else
      transport.current
        .input(envelope)
        .then(feedback)
        .catch((e) => notify(e.message, true));
    if (settings.vibration && navigator.vibrate) navigator.vibrate(25);
  }
  function leave() {
    transport.current?.close();
    transport.current = null;
    engine.current = null;
    setState(null);
    setRole("");
    setScreen("menu");
    setCode("");
    setController(false);
    history.replaceState(null, "", location.pathname);
  }
  function replay() {
    if (role === "player") {
      notify("The host can start another match.");
      return;
    }
    const previous = engine.current.state.players;
    engine.current = new GameEngine(bank, settings, read("sa.recent", []));
    previous.forEach((p) => {
      const player = engine.current.addPlayer(p.id, p);
      player.bot = !!p.bot;
      player.ready = !!p.bot;
    });
    publish();
  }
  const player = state?.players.find(
    (p) => p.id === transport.current?.identity,
  );
  return (
    <div
      className={`app ${role === "player" ? "phone-app" : ""} ${tvMode && role !== "player" ? "tv-mode" : ""}`}
    >
      <header className="site-header">
        <button
          className="brand"
          onClick={() => {
            if (!role) setScreen("menu");
            else
              notify(
                "Your game is in progress. Use the room controls to leave.",
              );
          }}
          aria-label="SA Trivia Showdown home"
        >
          <span className="brand-icon">
            <Icon name="Zap" size={23} />
          </span>
          <span>
            SA TRIVIA<span className="brand-small">SHOWDOWN</span>
          </span>
        </button>
        <div className="header-right">
          {role ? (
            <>
              <span className={`connection ${connection}`}>
                <i />
                {connection === "connected"
                  ? "Connected"
                  : connection === "connecting"
                    ? "Connecting"
                    : "Disconnected"}
              </span>
              <span className="room-pill">
                ROOM <b>{code}</b>
              </span>
              {demo && role === "host" && (
                <button
                  className="icon-button"
                  title="Toggle demo controller"
                  aria-label="Toggle demo controller"
                  onClick={() => setController(!controller)}
                >
                  <Icon name="Smartphone" />
                </button>
              )}
            </>
          ) : (
            <>
              <span className="header-tag">
                <span className="live-dot" /> MADE FOR A GOOD TIME
              </span>
              {tvMode ? (
                <button
                  className="tv-mode-toggle"
                  onClick={() => {
                    setTvMode(false);
                    history.replaceState(null, "", location.pathname);
                  }}
                >
                  Exit TV view
                </button>
              ) : (
                <button
                  className="tv-mode-toggle"
                  onClick={() => {
                    setTvMode(true);
                    history.replaceState(null, "", `${location.pathname}?tv=1`);
                  }}
                >
                  TV view
                </button>
              )}
            </>
          )}
          <button
            className="icon-button"
            aria-label={settings.sound ? "Mute sound" : "Enable sound"}
            onClick={() => {
              if (!settings.sound) unlockSound();
              setSettings({ ...settings, sound: !settings.sound });
            }}
          >
            <Icon name={settings.sound ? "Volume2" : "VolumeX"} />
          </button>
        </div>
      </header>
      {screen === "menu" && (
        <main className="menu">
          <div className="menu-copy">
            <div className="pill">
              <span className="live-dot" /> THE LOCAL LEGEND STARTS HERE
            </div>
            <h1>
              SA TRIVIA
              <br />
              <span>
                SHOWDOWN<span className="title-spark">✦</span>
              </span>
            </h1>
            <p className="hero-subtitle">
              Big questions. Bigger bragging rights.
            </p>
            <p className="hero-description">
              Bring your people. Grab your phones.
              <br />
              Turn a little local knowledge into a whole lot of game cash.
            </p>
            <div className="menu-actions">
              <button
                className="btn primary start-button"
                onClick={() => setSetup({ isDemo: false })}
                disabled={busy}
              >
                <Icon name="Play" size={24} />
                Start Game
                <Icon name="ArrowUpRight" />
              </button>
              <button
                className="btn outlined"
                onClick={() => setScreen("join")}
              >
                <Icon name="Smartphone" />
                Join Game
                <Icon name="ArrowRight" />
              </button>
              <div className="menu-small-actions">
                <button onClick={() => setScreen("how")}>
                  <Icon name="BookOpen" />
                  How to Play
                </button>
                <button onClick={() => setScreen("settings")}>
                  <Icon name="SlidersHorizontal" />
                  Settings
                </button>
                <button onClick={() => setScreen("credits")}>
                  <Icon name="Heart" />
                  Credits
                </button>
              </div>
            </div>
            <p className="creator">
              Created by <strong>Nikeel Naidoo</strong>
            </p>
          </div>
          <div className="hero-art">
            <div className="art-label">
              <Icon name="MapPin" size={16} /> A WHOLE COUNTRY OF GOOD QUESTIONS
            </div>
            <div className="hero-scene">
              <Landscape />
            </div>
            <div className="floating-chip chip-cash">
              <Icon name="Coins" size={25} />
              <span>
                KNOW IT. WIN IT.<strong>+ R300</strong>
              </span>
            </div>
            <div className="floating-chip chip-party">
              <span className="tiny-avatars">
                <Avatar
                  player={{ avatar: "Sun", colour: COLOURS[0] }}
                  size={34}
                />
                <Avatar
                  player={{ avatar: "Flame", colour: COLOURS[2] }}
                  size={34}
                />
                <Avatar
                  player={{ avatar: "Zap", colour: COLOURS[3] }}
                  size={34}
                />
              </span>
              <span>Better with your people.</span>
            </div>
            <div className="art-sticker">
              HOWZIT,
              <br />
              CHAMPION!
            </div>
          </div>
          <div className="menu-bottom">
            <div>
              <Icon name="Users" />
              <span>
                <b>1–12 players + audience</b>
                <small>Solo legends or team spirit</small>
              </span>
            </div>
            <div>
              <Icon name="Smartphone" />
              <span>
                <b>Your phone is your controller</b>
                <small>No downloads. No accounts.</small>
              </span>
            </div>
            <div>
              <Icon name="Zap" />
              <span>
                <b>Up to 20 rounds of Mzansi</b>
                <small>Quick, standard or long-play lineups</small>
              </span>
            </div>
            <button
              className="demo-link"
              onClick={() => setSetup({ isDemo: true })}
              disabled={busy}
            >
              Try a playable demo <Icon name="ArrowRight" size={18} />
            </button>
          </div>
          {read("sa.host", null) && (
            <button
              className="resume-link"
              onClick={() => startGame(false, true)}
            >
              Resume your last hosted room <Icon name="RotateCcw" size={15} />
            </button>
          )}
        </main>
      )}
      {screen === "settings" && (
        <Page
          title="Make it your kind of party"
          eyebrow="SETTINGS"
          back={() => setScreen("menu")}
        >
          <Settings settings={settings} setSettings={setSettings} />
        </Page>
      )}
      {screen === "how" && (
        <Page
          title="One room. All the energy."
          eyebrow="HOW TO PLAY"
          back={() => setScreen("menu")}
        >
          <div className="how-grid">
            {[
              [
                "Tv",
                "1. Put us on the big screen",
                "Start a room on your TV or laptop. A host guides the game and can pause at any time.",
              ],
              [
                "QrCode",
                "2. Bring your phone",
                "Scan the lobby QR code or enter its six-character code. Choose a nickname and get ready.",
              ],
              [
                "Coins",
                "3. Know it. Win it.",
                "Correct answers earn R300. All cash is fictional. Knowledge comes first; quick correct answers earn up to R30 extra.",
              ],
              [
                "Crown",
                "4. Make your move",
                "Play a card, predict duel winners, or back yourself with a wager. The highest cash total wins.",
              ],
            ].map(([icon, title, text]) => (
              <article className="panel" key={title}>
                <Icon name={icon} size={32} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="panel">
            <h3>Team spirit & fair play</h3>
            <p>
              Teams compete on their average player cash, so larger teams have
              no automatic advantage. In Team Huddle, players discuss and vote
              for one shared answer. Ties use the earliest submitted vote.
              Audience players can answer and predict for their own
              participation cash.
            </p>
            <p>
              Cards are used once per match. Steals and event losses are capped
              at R100. Risk It wagers are capped at R300; the final at R500. The
              TV keeps submissions private until results.
            </p>
          </div>
          <h3>Warm up in the bonus arcade</h3>
          <div className="arcade-grid">
            {[
              ["repair", "Bot", "Robot Repair"],

              ["drum", "Drum", "Drum Beat"],
              ["picture", "Puzzle", "Picture Puzzle"],
              ["goal", "Goal", "Goal Rush"],
            ].map(([kind, icon, name]) => (
              <button
                className="arcade-button"
                key={kind}
                onClick={() => setPractice(kind)}
              >
                <Icon name={icon} />
                {name}
                <Icon name="ArrowUpRight" size={17} />
              </button>
            ))}
          </div>
        </Page>
      )}
      {(screen === "credits" ||
        (state?.phase === "credits" && screen === "game")) && (
        <Credits
          end={state?.phase === "credits"}
          onPlay={
            role === "host"
              ? replay
              : role === "player"
                ? () =>
                    notify(
                      "The host starts the next match. Keep this controller open.",
                    )
                : () => startGame(true)
          }
          onMenu={leave}
        />
      )}
      {screen === "join" && (
        <Page
          title="Your people are waiting."
          eyebrow="JOIN THE SHOWDOWN"
          back={() => setScreen("menu")}
          narrow
        >
          <JoinForm initialCode={code} busy={busy} onJoin={joinRoom} />
          <p className="caption center">
            No account. No download. Just a little local knowledge.
          </p>
        </Page>
      )}
      {screen === "game" &&
        state &&
        state.phase !== "credits" &&
        (role === "player" ? (
          <Controller
            state={state}
            player={player}
            settings={settings}
            send={sendAction}
            connection={connection}
            reconnect={() =>
              transport.current.connect().catch((e) => notify(e.message, true))
            }
            leave={leave}
            setConfirmation={setConfirmation}
          />
        ) : (
          <main className="host-main">
            <div className="host-topline">
              <span className="eyebrow">
                {demo
                  ? "PLAYABLE DEMO"
                  : state.phase === "lobby"
                    ? "THE LOBBY"
                    : "LIVE FROM YOUR LIVING ROOM"}
              </span>
              <div className="host-controls">
                {(["playing", "event", "wager", "select"].includes(
                  state.phase,
                ) ||
                  (state.settings.autoAdvance &&
                    ["tutorial", "results", "event-results"].includes(
                      state.phase,
                    ))) && (
                  <button
                    className="btn compact secondary"
                    onClick={() => hostAction("pause")}
                  >
                    <Icon name={state.paused ? "Play" : "Pause"} size={16} />
                    {state.paused ? "Resume" : "Pause"}
                  </button>
                )}
                {["playing", "event", "wager", "select"].includes(
                  state.phase,
                ) && (
                  <button
                    className="btn compact secondary"
                    onClick={() => hostAction("skip")}
                  >
                    Skip
                  </button>
                )}
                <button
                  className="tv-mode-toggle host-tv-toggle"
                  onClick={() => {
                    const next = !tvMode;
                    setTvMode(next);
                    history.replaceState(
                      null,
                      "",
                      next ? `${location.pathname}?tv=1` : location.pathname,
                    );
                  }}
                >
                  {tvMode ? "Exit TV view" : "TV view"}
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    setConfirmation({
                      title: "End this match?",
                      text: "Go to final scores with the cash earned so far.",
                      action: () => hostAction("end"),
                    })
                  }
                >
                  End game
                </button>
                <button
                  className="icon-button"
                  aria-label="Fullscreen"
                  onClick={() =>
                    document.fullscreenElement
                      ? document.exitFullscreen()
                      : document.documentElement.requestFullscreen?.()
                  }
                >
                  <Icon name="Maximize" size={19} />
                </button>
              </div>
            </div>
            {state.phase === "lobby" ? (
              <Lobby
                state={state}
                code={code}
                qr={qr}
                mode={transport.current?.mode}
                onStart={() => hostAction("start")}
                busy={busy}
                onDemo={() => {
                  const p = engine.current.addPlayer("demo-you", {
                    name: "You",
                    avatar: "Sun",
                    colour: COLOURS[0],
                  });
                  p.ready = true;
                  setDemo(true);
                  setController(true);
                  publish();
                }}
              />
            ) : (
              <>
                <RoundBar state={state} />
                {state.phase === "tutorial" ? (
                  <Tutorial state={state} onNext={() => hostAction("next")} />
                ) : state.phase === "select" ? (
                  <div className="stage center">
                    <Timer state={state} />
                    <Icon name="MapPin" size={60} />
                    <h2>Where are we heading?</h2>
                    <p>Vote for a province on your phone.</p>
                    <div className="province-cloud">
                      {PROVINCES.map((p) => (
                        <span key={p}>{p}</span>
                      ))}
                    </div>
                    <p className="caption">
                      {Object.keys(state.receipts).length} votes locked in
                    </p>
                    <button
                      className="btn primary"
                      onClick={() => hostAction("next")}
                    >
                      Close voting <Icon name="ArrowRight" />
                    </button>
                  </div>
                ) : state.phase === "wager" ? (
                  <div className="stage center">
                    <Timer state={state} />
                    <Icon name="Coins" size={65} />
                    <h2>Back yourself.</h2>
                    <p>
                      Secretly lock your wager on your phone.
                      <br />
                      Up to{" "}
                      {cash(
                        state.rounds[state.roundIndex].id === "final"
                          ? 500
                          : 300,
                      )}{" "}
                      in fictional game cash.
                    </p>
                    <p className="caption">
                      {Object.keys(state.wagerReceipts).length} wagers locked ·
                      amounts stay private
                    </p>
                    <button
                      className="btn primary"
                      onClick={() => hostAction("next")}
                    >
                      Reveal the question <Icon name="ArrowRight" />
                    </button>
                  </div>
                ) : ["playing", "event"].includes(state.phase) ? (
                  <HostActivity
                    state={state}
                    settings={settings}
                    onResolve={() => hostAction("next")}
                  />
                ) : ["results", "event-results"].includes(state.phase) ? (
                  <Results state={state} onNext={() => hostAction("next")} />
                ) : state.phase === "final" ? (
                  <Final state={state} onNext={() => hostAction("next")} />
                ) : null}
                {state.phase !== "final" && <Standings state={state} />}
              </>
            )}
            {state.paused && (
              <div className="pause-banner">
                <Icon name="Pause" />
                Party paused · take a breath, grab a snack.
              </div>
            )}
            {controller &&
              demo &&
              state.phase !== "final" &&
              state.players.some((p) => p.id === "demo-you") && (
                <aside className="demo-controller">
                  <div className="demo-controller-heading">
                    <span>
                      <Icon name="Smartphone" size={17} /> YOUR DEMO PHONE
                    </span>
                    <button
                      aria-label="Minimise controller"
                      className="icon-button"
                      onClick={() => setController(false)}
                    >
                      <Icon name="Minus" size={18} />
                    </button>
                  </div>
                  <Controller
                    key={state.activityId + state.phase}
                    state={state}
                    player={state.players.find((p) => p.id === "demo-you")}
                    settings={settings}
                    send={(a) => sendAction(a, true)}
                    connection="connected"
                    reconnect={() => {}}
                    leave={() => setController(false)}
                    setConfirmation={setConfirmation}
                    embedded
                  />
                </aside>
              )}
          </main>
        ))}
      {setup && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
          >
            <p className="eyebrow">YOUR SHOW. YOUR CHALLENGE.</p>
            <h2 id="setup-title">Choose your difficulty</h2>
            <p>Pick the question level before everyone joins.</p>
            <div className="difficulty-grid">
              {[
                ["easy", "Easy", "A relaxed warm-up"],
                ["medium", "Medium", "A proper challenge"],
                ["hard", "Hard", "For local legends"],
                ["mixed", "Mixed", "A bit of everything"],
              ].map(([id, name, description]) => (
                <button
                  key={id}
                  className="answer"
                  aria-pressed={settings.difficulty === id}
                  onClick={() => setSettings({ ...settings, difficulty: id })}
                >
                  <strong>{name}</strong>
                  <small>{description}</small>
                </button>
              ))}
            </div>
            <h3 className="setup-subheading">How long should the party run?</h3>
            <div
              className="length-options"
              role="group"
              aria-label="Match length"
            >
              {[
                [5, "Quick", "5 rounds"],
                [10, "Standard", "10 rounds"],
                [15, "Long", "15 rounds"],
                [20, "All night", "20 rounds"],
              ].map(([length, name, detail]) => (
                <button
                  key={length}
                  type="button"
                  className={`length-option ${Number(settings.length) === length ? "selected" : ""}`}
                  aria-pressed={Number(settings.length) === length}
                  onClick={() => setSettings({ ...settings, length })}
                >
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </button>
              ))}
            </div>
            <p>
              Answer on your phone. When everyone locks in, the TV reveals the
              answer and round winners.
            </p>
            <div className="row">
              <button className="btn secondary" onClick={() => setSetup(null)}>
                Cancel
              </button>
              <button
                className="btn primary"
                autoFocus
                aria-label="Create room"
                onClick={() => {
                  const d = setup.isDemo;
                  setSetup(null);
                  cue("start");
                  startGame(d);
                }}
              >
                Start {settings.length} rounds
              </button>
            </div>
          </section>
        </div>
      )}
      {busy && (
        <div className="loading-overlay" role="status">
          <span className="spinner" />
          Setting up your party…
        </div>
      )}
      {toast && (
        <div role="status" className={`toast ${toast.error ? "error" : ""}`}>
          <Icon name={toast.error ? "CircleAlert" : "CheckCircle2"} />
          {toast.message}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setToast(null)}
          >
            <Icon name="X" size={18} />
          </button>
        </div>
      )}
      {confirmation && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="modal"
          >
            <Icon name="Sparkles" size={32} />
            <h2 id="confirm-title">{confirmation.title}</h2>
            <p>{confirmation.text}</p>
            <div className="row">
              <button
                autoFocus
                className="btn secondary"
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  confirmation.action();
                  setConfirmation(null);
                }}
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      )}
      {practice && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Bonus arcade"
            className="modal arcade-modal"
          >
            <PracticeGame
              key={practice}
              kind={practice}
              onExit={() => setPractice(null)}
            />
          </section>
        </div>
      )}
      <footer className="site-footer">
        <span>100% local flavour. 100% fictional cash.</span>
        <span>
          SA TRIVIA SHOWDOWN <span className="footer-dot">✦</span> LET’S PLAY.
        </span>
      </footer>
    </div>
  );
}
function Page({ title, eyebrow, back, children, narrow }) {
  return (
    <main className={`page ${narrow ? "narrow" : ""}`}>
      <button className="text-button back-button" onClick={back}>
        <Icon name="ArrowLeft" size={18} />
        Back to the party
      </button>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </main>
  );
}
function Settings({ settings: s, setSettings }) {
  const update = (k, v) => setSettings({ ...s, [k]: v });
  return (
    <div className="settings-grid">
      <section className="panel">
        <h3>The match</h3>
        <label>
          Match length
          <select
            value={s.length}
            onChange={(e) => update("length", Number(e.target.value))}
          >
            <option value="5">Quick Match · 5 rounds</option>
            <option value="10">Standard · 10 rounds</option>
            <option value="15">Long Party · 15 rounds</option>
            <option value="20">All Night · 20 rounds</option>
          </select>
        </label>
        <label>
          Play style
          <select
            value={s.mode}
            onChange={(e) => update("mode", e.target.value)}
          >
            <option value="solo">Solo · every legend for themselves</option>
            <option value="teams">Teams · Ubuntu vs Eish!</option>
          </select>
        </label>
        <label>
          Difficulty
          <select
            value={s.difficulty}
            onChange={(e) => update("difficulty", e.target.value)}
          >
            {["mixed", "easy", "medium", "hard"].map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Age suitability
          <select value={s.age} onChange={(e) => update("age", e.target.value)}>
            <option value="all">Family · all ages</option>
            <option value="teen">Teen & adult · full library</option>
          </select>
        </label>
        <label>
          Question time
          <select
            value={s.seconds}
            onChange={(e) => update("seconds", Number(e.target.value))}
          >
            <option value="25">25 seconds</option>
            <option value="40">40 seconds · relaxed</option>
            <option value="60">60 seconds · extra thinking time</option>
          </select>
        </label>
        <label className="toggle-row">
          <span>
            <b>Automatic round flow</b>
            <small>
              Reveal results, then move on after a short countdown. Host can
              pause or continue early.
            </small>
          </span>
          <input
            type="checkbox"
            checked={s.autoAdvance}
            onChange={(e) => update("autoAdvance", e.target.checked)}
          />
        </label>
      </section>
      <section className="panel">
        <h3>Your comfort</h3>
        {[
          [
            "events",
            "Random events",
            "Short, optional challenges between rounds",
          ],
          ["sound", "Sound", "Game-show stings, answer cues and spoken clues"],
          [
            "reducedMotion",
            "Reduced animation",
            "Keep decorative elements still",
          ],
          ["largeText", "Larger text", "Extra readable menus and controls"],
          [
            "vibration",
            "Touch feedback",
            "Brief vibration on supported phones",
          ],
        ].map(([key, label, desc]) => (
          <label className="toggle-row" key={key}>
            <span>
              <b>{label}</b>
              <small>{desc}</small>
            </span>
            <input
              type="checkbox"
              checked={s[key]}
              onChange={(e) => update(key, e.target.checked)}
            />
          </label>
        ))}
        <button
          className="btn secondary full"
          disabled={!s.sound}
          onClick={() => cue("start")}
        >
          <Icon name="Volume2" size={18} />
          Preview game-show sound
        </button>
      </section>
      <section className="panel categories-settings">
        <h3>What’s your thing?</h3>
        <p>
          Choose at least one category. Special rounds prefer their format
          within your selection.
        </p>
        <div className="category-grid">
          {CATEGORIES.map(([key, name, icon]) => (
            <label
              className={`category-option ${s.categories.includes(key) ? "selected" : ""}`}
              key={key}
            >
              <Icon name={icon} />
              <span>{name}</span>
              <input
                type="checkbox"
                checked={s.categories.includes(key)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...s.categories, key]
                    : s.categories.filter((c) => c !== key);
                  if (next.length) update("categories", next);
                }}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
function JoinForm({ initialCode, busy, onJoin }) {
  const [room, setRoom] = useState(initialCode),
    [profile, setProfile] = useState({
      name: "",
      avatar: "Sun",
      colour: COLOURS[0],
      team: "Ubuntu",
      audience: false,
    });
  return (
    <form
      className="panel join-form"
      onSubmit={(e) => {
        e.preventDefault();
        onJoin(room, profile);
      }}
    >
      <label>
        Room code
        <input
          aria-label="Room code"
          className="code-input"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          placeholder="ABC234"
          maxLength={6}
          value={room}
          onChange={(e) => setRoom(e.target.value.toUpperCase())}
          required
        />
      </label>
      <label>
        Nickname
        <input
          aria-label="Nickname"
          placeholder="Your local legend name"
          maxLength={18}
          autoComplete="nickname"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          required
        />
      </label>
      <fieldset>
        <legend>Pick your symbol</legend>
        <div className="avatar-picker">
          {AVATARS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              className={avatar === profile.avatar ? "selected" : ""}
              aria-label={avatar}
              aria-pressed={avatar === profile.avatar}
              onClick={() => setProfile({ ...profile, avatar })}
            >
              <Icon name={avatar} size={25} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>A splash of colour</legend>
        <div className="colour-picker">
          {COLOURS.map((colour, i) => (
            <button
              key={colour}
              type="button"
              style={{ background: colour }}
              aria-label={
                ["Teal", "Gold", "Coral", "Purple", "Blue", "Pink"][i]
              }
              aria-pressed={colour === profile.colour}
              onClick={() => setProfile({ ...profile, colour })}
            >
              {colour === profile.colour && <Icon name="Check" size={20} />}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Your position
        <select
          value={profile.audience ? "audience" : profile.team}
          onChange={(e) =>
            setProfile({
              ...profile,
              audience: e.target.value === "audience",
              team: e.target.value === "audience" ? "Ubuntu" : e.target.value,
            })
          }
        >
          <option value="Ubuntu">
            Player · Team Ubuntu if teams are enabled
          </option>
          <option value="Eish!">
            Player · Team Eish! if teams are enabled
          </option>
          <option value="audience">Audience · watch, answer & predict</option>
        </select>
      </label>
      <button
        className="btn primary full"
        disabled={busy || room.length !== 6 || !profile.name.trim()}
      >
        Let me in <Icon name="ArrowRight" />
      </button>
    </form>
  );
}
function Lobby({ state: s, code, qr, mode, onStart, onDemo }) {
  return (
    <>
      <div className="lobby-heading">
        <div>
          <h2>The more, the Mzansi-er.</h2>
          <p>Get your people in. The bragging rights are waiting.</p>
        </div>
        <span className="pill">
          <Icon name="Users" size={16} />
          {s.players.filter((p) => !p.audience).length}/12 players
        </span>
      </div>
      <div className="lobby-grid">
        <section className="panel join-panel">
          <p className="eyebrow">SCAN. JOIN. SHOW OFF.</p>
          {qr && (
            <img className="qr" src={qr} alt={`QR code to join room ${code}`} />
          )}
          <p>
            Scan with your phone camera
            <br />
            or open this game and enter:
          </p>
          <div className="big-room-code">{code}</div>
          <p className="caption">
            {mode === "demo"
              ? "Demo room · controllers work in this browser only."
              : mode === "local"
                ? "Local play · phones must use the same Wi-Fi and the host’s LAN address."
                : "No account or app download needed."}
          </p>
          <button
            className="text-button"
            onClick={() => {
              navigator.clipboard?.writeText(
                new URL(
                  `?room=${code}${mode === "demo" ? "&mode=demo" : ""}`,
                  location.href,
                ).href,
              );
            }}
          >
            Copy join link <Icon name="Copy" size={15} />
          </button>
        </section>
        <section className="panel players-panel">
          <div className="section-heading">
            <h3>Your party</h3>
            <span className="caption">
              {s.players.filter((p) => p.ready).length} ready
            </span>
          </div>
          <div className="lobby-players">
            {s.players.map((p) => (
              <div className="lobby-player" key={p.id}>
                <Avatar player={p} />
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.audience
                      ? "Audience"
                      : s.settings.mode === "teams"
                        ? `Team ${p.team}`
                        : "Solo player"}
                    {p.bot ? " · demo bot" : ""}
                  </small>
                </div>
                <span className={`ready ${p.ready ? "yes" : ""}`}>
                  <Icon name={p.ready ? "CheckCircle2" : "Clock3"} size={17} />
                  {p.ready ? "Ready" : "Joining"}
                </span>
              </div>
            ))}
            {!s.players.length && (
              <div className="empty-lobby">
                <Icon name="Users" size={55} />
                <h3>The first legend could be you.</h3>
                <p>Join on your phone to take your place.</p>
                <button className="btn secondary" onClick={onDemo}>
                  Play on this screen
                </button>
              </div>
            )}
          </div>
          <div className="lobby-settings">
            <span>
              <Icon name="Users" size={16} />
              {s.settings.mode === "teams" ? "Team play" : "Solo play"}
            </span>
            <span>
              <Icon name="Gauge" size={16} />
              {s.settings.difficulty} difficulty
            </span>
            <span>
              <Icon name="Sparkles" size={16} />
              {s.settings.events ? "Events on" : "Events off"}
            </span>
            <span>
              <Icon name="Clock3" size={16} />
              {s.settings.length} rounds
            </span>
          </div>
          <p className="caption">
            {s.settings.categories
              .map((k) => CATEGORIES.find((c) => c[0] === k)?.[1])
              .join(" · ")}
          </p>
          <button
            className="btn primary full"
            disabled={!s.players.some((p) => !p.audience)}
            onClick={onStart}
          >
            Let the showdown begin <Icon name="ArrowRight" />
          </button>
          <p className="caption center">
            The host can start when everyone is ready.
          </p>
        </section>
      </div>
      <section className="round-preview">
        <div className="section-heading">
          <h3>Tonight’s lineup</h3>
          <span className="caption">A little knowledge. A few surprises.</span>
        </div>
        <div className="round-preview-grid">
          {s.rounds.map((r, i) => (
            <div key={r.id}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <Icon name={r.icon} />
              <b>{r.name}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function RoundBar({ state: s }) {
  const r = s.rounds[s.roundIndex];
  return (
    <div className="round-bar">
      <div>
        <span className="round-number">
          {String(s.roundIndex + 1).padStart(2, "0")}
        </span>
        <div>
          <small>
            ROUND {s.roundIndex + 1} OF {s.rounds.length}
          </small>
          <h3>{r.name}</h3>
        </div>
      </div>
      <div className="round-dots">
        {s.rounds.map((r, i) => (
          <span
            className={
              i < s.roundIndex ? "done" : i === s.roundIndex ? "current" : ""
            }
            key={r.id}
            title={r.name}
          />
        ))}
      </div>
      <span className="pill">
        <Icon name={r.icon} size={18} />
        {r.kind === "question" ? "KNOWLEDGE IS CASH" : "DUEL TIME"}
      </span>
    </div>
  );
}
function Timer({ state: s }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.max(
    0,
    Math.ceil((s.paused ? s.remaining : s.deadline - now) / 1000),
  );
  return (
    <div
      className={`timer ${seconds <= 5 ? "urgent" : ""}`}
      role="timer"
      aria-label={`${seconds} seconds remaining`}
    >
      <Icon name={s.paused ? "Pause" : "Timer"} size={23} />
      <b>{seconds}</b>
      <span>sec</span>
    </div>
  );
}
function Tutorial({ state: s, onNext }) {
  const r = s.rounds[s.roundIndex];
  return (
    <section className="stage tutorial center">
      <div className="round-emblem">
        <Icon name={r.icon} size={58} />
      </div>
      <p className="eyebrow">{r.eyebrow}</p>
      <h2>{r.name}</h2>
      <p className="stage-description">{r.description}</p>
      <p>
        Choose a Confetti Jam target on your phone before the host starts. Two
        tricks per match.
      </p>
      {s.notice && <p className="notice">{s.notice}</p>}
      <div className="tutorial-points">
        <span>
          <Icon name="Smartphone" size={18} />
          Answer on your phone
        </span>
        <span>
          <Icon name="Coins" size={18} />
          {r.id === "final"
            ? "R500 + your wager"
            : "R300 + up to R30 for quick trivia"}
        </span>
        {["map", "braai", "drum"].includes(r.kind) && (
          <span>
            <Icon name="Eye" size={18} />
            Predict another player for +R50
          </span>
        )}
      </div>
      {s.settings.autoAdvance && <Timer state={s} />}
      <button className="btn primary" onClick={onNext}>
        Let’s do this <Icon name="ArrowRight" />
      </button>
    </section>
  );
}
function speak(text, enabled) {
  if (enabled && "speechSynthesis" in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-ZA";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
}
function QuestionMedia({ q, settings }) {
  if (!q) return null;
  return (
    <>
      {q.format === "image" && <ClueArt type={q.imageKey} />}{" "}
      {q.clue && <p className="clue-text">{q.clue}</p>}
      {q.format === "audio" && (
        <div className="audio-clue">
          <button
            className="btn secondary"
            onClick={() =>
              speak(q.audioText || q.clue || q.prompt, settings.sound)
            }
            disabled={!settings.sound}
          >
            <Icon name="Volume2" />
            Play spoken clue
          </button>
          <p>{q.audioText || q.clue}</p>
          <small>Written fallback · original spoken clue</small>
        </div>
      )}
    </>
  );
}
function HostActivity({ state: s, settings, onResolve }) {
  const r = s.rounds[s.roundIndex],
    event = s.phase === "event";
  return (
    <section className={`stage question-stage ${event ? "event-stage" : ""}`}>
      <div className="stage-top">
        <span className="eyebrow">
          {event
            ? `SURPRISE EVENT · ${s.event.name}`
            : s.question
              ? `${CATEGORIES.find((c) => c[0] === s.question.category)?.[1] || "Mzansi knowledge"} · ${s.question.difficulty}`
              : "PHONE-CONTROLLED DUEL"}
        </span>
        <Timer state={s} />
      </div>
      {event ? (
        <div className="center">
          <div className="round-emblem">
            <Icon name={s.event.icon} size={55} />
          </div>
          <h2>{s.event.name}</h2>
          <p className="stage-description">{s.event.instruction}</p>
          <p className="caption">
            Optional challenge · all game cash · no real people or organisations
            depicted
          </p>
        </div>
      ) : s.question ? (
        <>
          <h2 className="question-text">{s.question.prompt}</h2>
          <QuestionMedia q={s.question} settings={settings} />
          {s.question.options && s.question.format !== "ordering" && (
            <div className="tv-answers">
              {s.question.options.map((o, i) => (
                <div key={o}>
                  <span>{String.fromCharCode(65 + i)}</span>
                  {o}
                </div>
              ))}
            </div>
          )}
        </>
      ) : r.kind === "map" ? (
        <div className="host-map">
          <div>
            <p className="eyebrow">PUT A PIN IN IT</p>
            <h2>Find {s.mini.target}.</h2>
            <p>
              Place your pin on your phone.
              <br />
              The closer you are, the more you earn.
            </p>
          </div>
          <GameMap />
        </div>
      ) : r.kind === "drum" ? (
        <div className="center drum-stage-art">
          <Icon name="Drum" size={64} />
          <h2>Catch the beat.</h2>
          <p>Copy the lit-up rhythm on your phone. Every beat counts.</p>
          <div className="drum-decoration" aria-hidden="true">
            {["Drum", "HandCoins", "Target", "Music2"].map((icon) => (
              <span key={icon}>
                <Icon name={icon} size={42} />
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="center">
          <Icon name="Flame" size={64} />
          <h2>Bring your braai game.</h2>
          <p>
            Follow the visible recipe on your phone.
            <br />
            Tap the ingredients in the right order.
          </p>
          <div className="braai-decoration">
            <Icon name="Wheat" size={45} />
            <Icon name="Flame" size={45} />
            <Icon name="Sprout" size={45} />
            <Icon name="Utensils" size={45} />
          </div>
        </div>
      )}
      <div className="stage-bottom">
        <span>
          <Icon name="CheckCircle2" size={19} />
          {Object.keys(s.receipts).length} answers locked{" "}
          <span className="muted">· Keep it to yourself!</span>
        </span>
        <button className="btn compact secondary" onClick={onResolve}>
          Reveal results <Icon name="ArrowRight" size={17} />
        </button>
      </div>
    </section>
  );
}
function Standings({ state: s }) {
  return (
    <section className="standings-strip" aria-label="Standings">
      {standings(s).map((p, i) => (
        <div className={`standing ${i === 0 ? "leader" : ""}`} key={p.id}>
          <span className="position">
            {i === 0 ? <Icon name="Crown" size={19} /> : i + 1}
          </span>
          <Avatar player={p} size={38} />
          <div>
            <b>{p.name}</b>
            <small>
              {s.settings.mode === "teams"
                ? `${p.members} players · average cash`
                : p.connected
                  ? "In the game"
                  : "Reconnecting"}
            </small>
          </div>
          <strong>{cash(p.cash)}</strong>
        </div>
      ))}
    </section>
  );
}
function RoundWinner({ state: s }) {
  const eligible = s.results.filter((r) =>
    s.players.some((p) => p.id === r.id && !p.audience),
  );
  const best = Math.max(0, ...eligible.map((r) => r.delta));
  const winners = eligible.filter((r) => r.delta === best && r.correct);
  return (
    <div className="round-winners" role="status">
      <Icon name="Trophy" size={32} />
      <h3>
        {winners.length
          ? `${winners.map((r) => r.name).join(" & ")} ${winners.length === 1 ? "wins" : "win"} this round!`
          : "Next round, fresh chance!"}
      </h3>
    </div>
  );
}
function Results({ state: s, onNext }) {
  return (
    <section className="stage results-stage">
      <div className="result-answer">
        <span className="success-icon">
          <Icon name="Check" size={31} />
        </span>
        <p className="eyebrow">THE ANSWER IS</p>
        <h2>{s.answer}</h2>
        <p>{s.fact}</p>
        {s.mapAnswer && <GameMap target={s.mapAnswer} />}{" "}
        {s.source?.url && (
          <a
            className="source-link"
            href={s.source.url}
            target="_blank"
            rel="noreferrer"
          >
            Fact reference <Icon name="ExternalLink" size={13} />
          </a>
        )}
      </div>
      <RoundWinner state={s} />
      <div className="result-ledger">
        {s.results.map((r, i) => (
          <div key={r.id + i}>
            <span>
              <b>{r.name}</b>
              <small>{r.reason}</small>
            </span>
            <strong className={r.delta < 0 ? "coral-text" : "teal-text"}>
              {r.delta > 0 ? "+" : ""}
              {cash(r.delta)}
            </strong>
          </div>
        ))}
      </div>
      {s.notice && <p className="notice">{s.notice}</p>}
      <div className="center">
        {s.settings.autoAdvance && (
          <p className="caption">
            {s.paused ? "Auto-advance paused" : "Next up in"}
          </p>
        )}
        {s.settings.autoAdvance && <Timer state={s} />}
        <button className="btn primary" onClick={onNext}>
          {s.roundIndex === s.rounds.length - 1
            ? "The final scores"
            : "Keep the party going"}
          <Icon name="ArrowRight" />
        </button>
      </div>
    </section>
  );
}
function Final({ state: s, onNext }) {
  const ranked = standings(s),
    players = s.players.filter((p) => !p.audience);
  const highlights = [
    [
      "Target",
      "Most Correct",
      [...players].sort((a, b) => b.correct - a.correct)[0],
      (p) => `${p?.correct || 0} correct answers`,
    ],
    [
      "Flame",
      "Best Duel",
      [...players].sort((a, b) => b.duel - a.duel)[0],
      (p) => `${cash(p?.duel)} in duel cash`,
    ],
    [
      "TrendingUp",
      "Biggest Comeback",
      [...players].sort((a, b) => b.comeback - a.comeback)[0],
      (p) => `${p?.comeback || 0} places climbed`,
    ],
  ];
  return (
    <section className="final-stage center">
      <div className="confetti" aria-hidden="true">
        ✦ <span>✧</span> ✦ <span>✧</span> ✦
      </div>
      <div className="winner-crown">
        <Icon name="Crown" size={80} />
      </div>
      <p className="eyebrow">LOCAL KNOWLEDGE. LEGENDARY STATUS.</p>
      <h2>
        {ranked
          .filter((p) => p.cash === ranked[0]?.cash)
          .map((p) => p.name)
          .join(" & ")}
        <br />
        <span className="gold-text">
          {ranked.filter((p) => p.cash === ranked[0]?.cash).length > 1
            ? "share the glory!"
            : "takes the crown!"}
        </span>
      </h2>
      <p className="winner-cash">
        {cash(ranked[0]?.cash)} <span>in game cash</span>
      </p>
      <Standings state={s} />
      <div className="highlights">
        {highlights.map(([icon, title, p, detail]) => (
          <div className="panel" key={title}>
            <Icon name={icon} size={30} />
            <small>{title}</small>
            <b>{p?.name || "The whole party"}</b>
            <span>{detail(p)}</span>
          </div>
        ))}
      </div>
      <button className="btn primary" onClick={onNext}>
        Roll the credits <Icon name="Heart" />
      </button>
    </section>
  );
}
function Credits({ end, onPlay, onMenu }) {
  return (
    <main className="credits center">
      <div className="credits-mark">
        <Icon name="Sun" size={70} />
      </div>
      <p className="eyebrow">
        {end ? "THAT’S A WRAP, MZANSI" : "THE PEOPLE BEHIND THE PARTY"}
      </p>
      <h2>
        Good questions.
        <br />
        Great company.
      </h2>
      <p className="credits-created">Created by Nikeel Naidoo</p>
      <p className="caption">Creator & concept owner</p>
      <div className="credits-rule" />
      <p>
        SA Trivia Showdown is an original party game
        <br />
        celebrating the places, stories and everyday magic of South Africa.
      </p>
      <p className="caption">
        Original interface, illustrations and question wording.
        <br />
        Factual references are included in the question library.
        <br />
        Built with React, Vite, Lucide and Firebase. See THIRD_PARTY.md for
        licences.
      </p>
      <p className="gold-text">And a big shout-out to you, the players.</p>
      <div className="row center">
        <button className="btn primary" onClick={onPlay}>
          {end ? "Play Again" : "Try the Demo"}
          <Icon name="RotateCcw" />
        </button>
        <button className="btn secondary" onClick={onMenu}>
          Return to Main Menu
        </button>
      </div>
    </main>
  );
}
function Controller({
  state: s,
  player: p,
  settings,
  send,
  connection,
  reconnect,
  leave,
  setConfirmation,
  embedded = false,
}) {
  const [controllerNow, setControllerNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setControllerNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const [text, setText] = useState(""),
    [pin, setPin] = useState(null),
    [wager, setWager] = useState(100),
    [pending, setPending] = useState(false);
  useEffect(() => {
    setText("");
    setPin(null);
    setPending(false);
  }, [s.activityId, s.phase]);
  useEffect(() => {
    if (pending) {
      const t = setTimeout(() => setPending(false), 1500);
      return () => clearTimeout(t);
    }
  }, [pending]);
  const round = s.rounds[s.roundIndex],
    locked = !!s.receipts[p?.id],
    disabled =
      s.paused ||
      locked ||
      connection !== "connected" ||
      pending ||
      (p?.jam > 0 && controllerNow < p.jamUntil);
  const submit = (value) => {
    setPending(true);
    send({ type: "answer", value });
  };
  if (!p)
    return (
      <main className="controller">
        <div className="panel center">
          <Icon name="Radio" size={45} />
          <h3>Joining the party…</h3>
          <p>Waiting for the host to welcome you.</p>
          <button className="btn secondary" onClick={reconnect}>
            Reconnect
          </button>
          <button className="text-button" onClick={leave}>
            Back
          </button>
        </div>
      </main>
    );
  const rank =
    standings({ ...s, settings: { ...s.settings, mode: "solo" } }).findIndex(
      (x) => x.id === p.id,
    ) + 1;
  return (
    <div className={`controller ${embedded ? "embedded" : ""}`}>
      <div className="player-header">
        <Avatar player={p} size={45} />
        <div>
          <b>{p.name}</b>
          <small>
            {p.audience
              ? "Audience"
              : s.settings.mode === "teams"
                ? `Team ${p.team}`
                : `Position ${rank}`}
          </small>
        </div>
        <strong>{cash(p.cash)}</strong>
      </div>
      {connection !== "connected" && (
        <div className="reconnect-panel">
          <p>Connection lost. Your nickname and cash are saved.</p>
          <button className="btn primary" onClick={reconnect}>
            <Icon name="RefreshCw" />
            Reconnect
          </button>
        </div>
      )}
      {s.paused && (
        <div className="notice">
          <Icon name="Pause" />
          Host paused the game
        </div>
      )}
      {s.phase === "playing" && p.jam > 0 && controllerNow < p.jamUntil && (
        <div className="jam-panel" role="status">
          <h3>Confetti Jam!</h3>
          <p>Clear {p.jam} bursts, or wait five seconds.</p>
          <button
            className="btn primary full"
            disabled={s.paused}
            onClick={() => send({ type: "unjam" })}
          >
            Clear confetti · {p.jam}
          </button>
        </div>
      )}
      {s.phase === "lobby" ? (
        <section className="controller-stage center">
          <div className="round-emblem">
            <Icon name="PartyPopper" size={48} />
          </div>
          <h2>You’re in!</h2>
          <p>
            Keep an eye on the TV.
            <br />
            The host will start the showdown.
          </p>
          <button
            className={`btn full ${p.ready ? "secondary" : "primary"}`}
            onClick={() => send({ type: "ready" })}
          >
            <Icon name={p.ready ? "CheckCircle2" : "Check"} />
            {p.ready ? "Ready to roll" : "I’m ready"}
          </button>
        </section>
      ) : s.phase === "tutorial" ? (
        <section className="controller-stage center">
          <Icon name={round.icon} size={47} />
          <p className="eyebrow">ROUND {s.roundIndex + 1}</p>
          <h2>{round.name}</h2>
          <p>{round.description}</p>
          {!p.audience && (
            <div className="trick-panel">
              <h3>Confetti Jam · {p.tricks ?? 2} left</h3>
              <p>
                Send a rival three confetti bursts to clear. Lasts at most five
                seconds. One trick per round; Cash Shield blocks it.
              </p>
              {s.players
                .filter(
                  (x) =>
                    x.id !== p.id &&
                    !x.audience &&
                    (s.settings.mode !== "teams" || x.team !== p.team),
                )
                .map((x) => (
                  <button
                    className="btn secondary"
                    key={x.id}
                    disabled={p.trickUsed || (p.tricks ?? 2) === 0 || x.jam > 0}
                    onClick={() =>
                      setConfirmation({
                        title: `Jam ${x.name}?`,
                        text: "Uses one of your two tricks. They can tap three times or wait five seconds to clear it.",
                        action: () => send({ type: "trick", target: x.id }),
                      })
                    }
                  >
                    Jam {x.name}
                  </button>
                ))}
            </div>
          )}
          {s.notice && <p className="notice">{s.notice}</p>}
          <p className="caption">
            Look up at the TV. The host starts this round.
          </p>
        </section>
      ) : s.phase === "select" ? (
        <section className="controller-stage">
          <Timer state={s} />
          <h2>Pick your province</h2>
          {locked ? (
            <Locked />
          ) : (
            <div className="province-options">
              {PROVINCES.map((v) => (
                <button
                  className="answer"
                  key={v}
                  disabled={s.paused || pending}
                  onClick={() => {
                    setPending(true);
                    send({ type: "vote", value: v });
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : s.phase === "wager" ? (
        <section className="controller-stage">
          <Timer state={s} />
          <h2>Back yourself.</h2>
          <p>Your wager stays secret.</p>
          {s.wagerReceipts[p.id] ? (
            <Locked text="Wager locked. Good luck!" />
          ) : (
            <>
              <label>
                Wager ·{" "}
                {cash(
                  Math.min(wager, p.cash, round.id === "final" ? 500 : 300),
                )}
                <input
                  aria-label="Wager amount"
                  type="range"
                  min="0"
                  max={Math.min(p.cash, round.id === "final" ? 500 : 300)}
                  step="50"
                  value={wager}
                  onChange={(e) => setWager(Number(e.target.value))}
                />
              </label>
              <p className="caption">
                Correct: win your wager plus the question reward. Incorrect:
                lose only your wager.
              </p>
              <button
                className="btn primary full"
                disabled={s.paused || pending}
                onClick={() => {
                  setPending(true);
                  send({ type: "wager", value: wager });
                }}
              >
                Lock secret wager <Icon name="LockKeyhole" />
              </button>
            </>
          )}
        </section>
      ) : ["playing", "event"].includes(s.phase) ? (
        <section className="controller-stage">
          <div className="controller-question-heading">
            <span className="eyebrow">
              {s.phase === "event" ? s.event.name : round.name}
            </span>
            <Timer state={s} />
          </div>
          {p.repairActive ? (
            <>
              <h3>Robot Repair</h3>
              <p>Tap SUN → SPARK → WAVE → LEAF for R100.</p>
              <SequenceGame
                kind="repair"
                sequence={[0, 2, 1, 3]}
                disabled={s.paused}
                sound={settings.sound}
                onSubmit={(v) => send({ type: "repair", value: v })}
              />
            </>
          ) : locked ? (
            <Locked />
          ) : s.phase === "event" ? (
            <>
              <h3>{s.event.instruction}</h3>
              <EventGame
                key={s.activityId}
                event={s.event}
                player={p}
                onSubmit={submit}
                disabled={disabled}
                sound={settings.sound}
              />
            </>
          ) : s.mini?.kind === "map" ? (
            <>
              <h2>Find {s.mini.target}</h2>
              <GameMap pin={pin} onSelect={setPin} disabled={disabled} />
              <button
                className="btn primary full"
                disabled={!pin || disabled}
                onClick={() => submit(pin)}
              >
                Lock my pin <Icon name="MapPin" />
              </button>
            </>
          ) : ["braai", "drum"].includes(s.mini?.kind) ? (
            <SequenceGame
              key={s.activityId}
              kind={s.mini.kind}
              sequence={s.mini.sequence}
              revealUntil={s.mini.revealUntil}
              disabled={disabled}
              sound={settings.sound}
              onSubmit={submit}
            />
          ) : s.question ? (
            <>
              <h3>{s.question.prompt}</h3>
              {s.settings.mode === "teams" && round.id === "huddle" && (
                <p className="team-note">
                  Discuss with Team {p.team}, then vote. Your team’s majority
                  answer is submitted.
                </p>
              )}
              <QuestionMedia q={s.question} settings={settings} />
              {s.question.format === "ordering" ? (
                <Ordering
                  key={s.activityId}
                  options={s.question.options}
                  onSubmit={submit}
                  disabled={disabled}
                />
              ) : s.question.options ? (
                <div className="answers">
                  {s.question.options.map((option, i) => (
                    <button
                      className={`answer answer-${i}`}
                      key={option}
                      disabled={disabled || s.hints[p.id] === option}
                      onClick={() => submit(option)}
                    >
                      <span>{String.fromCharCode(65 + i)}</span>
                      {s.hints[p.id] === option
                        ? "Removed by Extra Hint"
                        : option}
                    </button>
                  ))}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(text);
                  }}
                >
                  <label>
                    Your answer
                    <input
                      aria-label="Your answer"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={disabled}
                      autoComplete="off"
                      maxLength={120}
                    />
                  </label>
                  <button
                    className="btn primary full"
                    disabled={disabled || !text.trim()}
                  >
                    Lock answer <Icon name="Check" />
                  </button>
                </form>
              )}
            </>
          ) : null}
        </section>
      ) : ["results", "event-results"].includes(s.phase) ? (
        <section className="controller-stage center">
          <Icon
            name={
              s.results.find((r) => r.id === p.id)?.correct
                ? "PartyPopper"
                : "Lightbulb"
            }
            size={45}
          />
          <p className="eyebrow">ROUND RESULT</p>
          <h2>
            {s.results
              .filter((r) => r.id === p.id)
              .reduce((n, r) => n + r.delta, 0) >= 0
              ? "+"
              : ""}
            {cash(
              s.results
                .filter((r) => r.id === p.id)
                .reduce((n, r) => n + r.delta, 0),
            )}
          </h2>
          <p>
            {s.results
              .filter((r) => r.id === p.id)
              .map((r) => r.reason)
              .join(" · ")}
          </p>
          <RoundWinner state={s} />
          <div className="answer-reveal">
            <small>Correct answer</small>
            <b>{s.answer}</b>
          </div>
          {s.settings.autoAdvance && (
            <>
              <p className="caption">
                {s.paused
                  ? "The host paused the countdown."
                  : "Next round starts in"}
              </p>
              <Timer state={s} />
            </>
          )}
          <p className="caption">
            Look up for the standings. The host can continue early.
          </p>
        </section>
      ) : s.phase === "final" ? (
        <section className="controller-stage center">
          <Icon name="Crown" size={58} />
          <h2>What a showdown!</h2>
          <p>
            You finished with <b className="gold-text">{cash(p.cash)}</b>.
          </p>
          <p>Celebrate your local legends on the big screen.</p>
        </section>
      ) : null}
      {s.repairReceipts[p.id] && (
        <p className="notice">
          Robot Repair:{" "}
          {s.repairReceipts[p.id].correct
            ? "+R100 earned"
            : "No bonus this time"}
        </p>
      )}
      {["tutorial", "playing"].includes(s.phase) &&
        ["map", "braai", "drum"].includes(round.kind) &&
        !s.receipts[p.id] && (
          <details className="prediction">
            <summary>
              <Icon name="Eye" size={18} />
              Predict a duel winner · +R50
            </summary>
            {s.predictions[p.id] ? (
              <p>Prediction locked.</p>
            ) : (
              <div className="prediction-options">
                {s.players
                  .filter((x) => !x.audience && x.id !== p.id)
                  .map((x) => (
                    <button
                      className="btn secondary compact"
                      key={x.id}
                      onClick={() => send({ type: "predict", value: x.id })}
                    >
                      {x.name}
                    </button>
                  ))}
              </div>
            )}
          </details>
        )}
      {!p.audience &&
        ["playing", "event", "results", "tutorial"].includes(s.phase) && (
          <details className="card-hand">
            <summary>
              <Icon name="Layers" size={20} />
              Your cards <span>{p.cards.length} left</span>
            </summary>
            <div className="cards-grid">
              {CARDS.filter((c) => p.cards.includes(c.id)).map((c) => (
                <button
                  className="game-card"
                  key={c.id}
                  disabled={s.paused || connection !== "connected"}
                  onClick={() =>
                    setConfirmation({
                      title: c.name,
                      text: c.effect + " This card can be used once per match.",
                      action: () => send({ type: "card", card: c.id }),
                    })
                  }
                >
                  <Icon name={c.icon} size={25} />
                  <b>{c.name}</b>
                  <small>View effect</small>
                </button>
              ))}
            </div>
            {!p.cards.length && <p>All your cards have been played.</p>}
          </details>
        )}
      {p.shield && (
        <p className="shield-status">
          <Icon name="Shield" size={16} />
          Cash Shield is active
        </p>
      )}
      {!embedded && (
        <button className="text-button controller-leave" onClick={leave}>
          Leave controller
        </button>
      )}
    </div>
  );
}
function Locked({ text = "Answer locked. Nicely done." }) {
  return (
    <div className="locked" role="status">
      <span>
        <Icon name="Check" size={40} />
      </span>
      <h3>{text}</h3>
      <p>
        Look up at the TV.
        <br />
        Your answer stays private until time is up.
      </p>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="page center">
        <h1>A small detour.</h1>
        <p>
          The game hit an unexpected problem. Your last room is saved on this
          device.
        </p>
        <button className="btn primary" onClick={() => location.reload()}>
          Reload and reconnect
        </button>
        <details>
          <summary>Technical detail</summary>
          {this.state.error.message}
        </details>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
