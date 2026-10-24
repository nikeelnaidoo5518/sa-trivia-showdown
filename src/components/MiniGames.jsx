import { useEffect, useRef, useState } from "react";
import { Icon } from "./Art.jsx";
const BRAAI = ["Mielie", "Pepper", "Mushroom", "Sosatie"],
  SWITCH = ["SUN", "WAVE", "SPARK", "LEAF"];
export function GameMap({ onSelect, pin, target, disabled = false }) {
  const svg = useRef();
  const [cursor, setCursor] = useState(pin || { x: 50, y: 50 });
  const place = (p) => {
    setCursor(p);
    onSelect?.(p);
  };
  return (
    <div className="map-wrap">
      <svg
        ref={svg}
        className="game-map"
        viewBox="0 0 100 100"
        role={onSelect ? "application" : "img"}
        tabIndex={onSelect ? 0 : undefined}
        aria-label="Simplified South Africa map. Click to place a pin or use arrow keys and Enter."
        onClick={(e) => {
          if (!onSelect || disabled) return;
          const rect = svg.current.getBoundingClientRect();
          place({
            x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
            y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
          });
        }}
        onKeyDown={(e) => {
          if (!onSelect || disabled) return;
          const d = {
            ArrowLeft: [-2, 0],
            ArrowRight: [2, 0],
            ArrowUp: [0, -2],
            ArrowDown: [0, 2],
          }[e.key];
          if (d) {
            e.preventDefault();
            setCursor((p) => ({
              x: Math.max(0, Math.min(100, p.x + d[0])),
              y: Math.max(0, Math.min(100, p.y + d[1])),
            }));
          }
          if (e.key === "Enter") place(cursor);
        }}
      >
        <rect width="100" height="100" rx="9" fill="#193c50" />
        <path
          d="m5 34 13-7 11 5 9-4 11 1 9-16 12-6 16-4 8 14-4 13 5 9-7 13-4 15-12 13-14 9-16 4-14-2-12-10-6-18-8-16z"
          fill="#d2c6a1"
          stroke="#f1dfae"
          strokeWidth="1"
        />
        <path
          d="m29 32 8 20-13 26m13-26 17 10 5 24m-5-24 11-23 24-8m-24 8-3-20m-8 43 25-5"
          fill="none"
          stroke="#9f9d84"
          strokeWidth=".6"
        />
        <path
          d="m63 57 6-5 6 4-3 6-6 2z"
          fill="#193c50"
          stroke="#f1dfae"
          strokeWidth=".6"
        />
        <text x="8" y="96" fill="#a5c1c6" fontSize="3">
          ATLANTIC
        </text>
        <text x="77" y="85" fill="#a5c1c6" fontSize="3">
          INDIAN OCEAN
        </text>
        <text x="93" y="10" fill="#eef0d9" fontSize="4">
          N ↑
        </text>
        {onSelect && !pin && (
          <circle
            cx={cursor.x}
            cy={cursor.y}
            r="2.2"
            fill="none"
            stroke="#152636"
            strokeWidth=".8"
          />
        )}
        {pin && (
          <g>
            <circle
              cx={pin.x}
              cy={pin.y}
              r="3"
              fill="#e46e63"
              stroke="#fff"
              strokeWidth="1"
            />
            <path d={`M${pin.x} ${pin.y - 6}v3`} stroke="#fff" />
          </g>
        )}
        {target && (
          <g>
            <circle
              cx={target.x}
              cy={target.y}
              r="5"
              fill="none"
              stroke="#fff"
            />
            <circle cx={target.x} cy={target.y} r="2" fill="#ffce63" />
          </g>
        )}
      </svg>
      <span className="caption">Simplified game map · north is up</span>
    </div>
  );
}
export function SequenceGame({
  sequence,
  kind = "braai",
  revealUntil = 0,
  onSubmit,
  disabled,
  limit,
}) {
  const [chosen, setChosen] = useState([]),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const labels = kind === "braai" ? BRAAI : SWITCH;
  const target = sequence.slice(0, limit || sequence.length),
    revealing = now < revealUntil;
  return (
    <div className="mini-controller">
      <p className="mini-instruction">
        {revealing
          ? "Remember this sequence…"
          : `Tap ${target.length} items in the same order.`}
      </p>
      <div className="sequence-display">
        {(revealing ? target : target.map((_, i) => chosen[i])).map((v, i) => (
          <span key={i} className={v === undefined ? "empty" : ""}>
            {v === undefined ? "?" : labels[v]}
          </span>
        ))}
      </div>
      <div className="pad-grid">
        {labels.map((label, i) => (
          <button
            key={label}
            className={`pad pad-${i}`}
            disabled={disabled || revealing || chosen.length === target.length}
            onClick={() => setChosen((a) => [...a, i])}
          >
            <Icon
              name={
                (kind === "braai"
                  ? ["Wheat", "Flame", "Sprout", "Utensils"]
                  : ["Sun", "Waves", "Zap", "Leaf"])[i]
              }
              size={30}
            />
            {label}
          </button>
        ))}
      </div>
      <div className="row">
        <button
          className="btn secondary"
          disabled={disabled || !chosen.length}
          onClick={() => setChosen([])}
        >
          Reset
        </button>
        <button
          className="btn primary"
          disabled={disabled || chosen.length !== target.length}
          onClick={() => onSubmit(chosen)}
        >
          Lock sequence <Icon name="Check" />
        </button>
      </div>
    </div>
  );
}
export function EventGame({ event, player, onSubmit, disabled }) {
  const [value, setValue] = useState(""),
    [caught, setCaught] = useState(false),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  if (event.kind === "repair")
    return (
      <SequenceGame
        sequence={event.sequence}
        kind="repair"
        limit={player?.backup ? 3 : 4}
        revealUntil={event.revealUntil}
        onSubmit={onSubmit}
        disabled={disabled}
      />
    );
  if (event.kind === "memory") {
    const revealing = now < event.revealUntil;
    return (
      <div>
        <div className="memory-items">
          {["Maize", "Apple", "Bread", "Milk"].map((x, i) => (
            <span key={x}>{revealing || i !== event.missing ? x : "?"}</span>
          ))}
        </div>
        <p>Which item disappeared?</p>
        <div className="answers">
          {["Maize", "Apple", "Bread", "Milk"].map((x, i) => (
            <button
              key={x}
              className="answer"
              disabled={disabled || revealing}
              onClick={() => onSubmit(i)}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      {event.kind === "catch" && !caught ? (
        <div className="catch-zone">
          <button
            className="rolling-bag"
            aria-label="Catch game-money bag"
            disabled={disabled}
            onClick={() => setCaught(true)}
          >
            <Icon name="Banknote" size={45} />
          </button>
          <span>Catch the bag!</span>
        </div>
      ) : (
        <>
          <p className="puzzle-sum">
            {event.a} {event.kind === "route" ? "×" : "+"} {event.b} = ?
          </p>
          <label>
            Your answer
            <input
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled}
            />
          </label>
          <button
            className="btn primary full"
            disabled={disabled || !value}
            onClick={() =>
              onSubmit(
                event.kind === "catch" ? { caught, answer: value } : value,
              )
            }
          >
            Submit answer <Icon name="ArrowRight" />
          </button>
        </>
      )}
      {event.kind === "route" && (
        <button
          className="btn secondary full"
          disabled={disabled}
          onClick={() => onSubmit("safe")}
        >
          Take the safe route · +R50
        </button>
      )}
    </div>
  );
}
export function PracticeGame({ kind, onExit }) {
  const [result, setResult] = useState(null),
    [target, setTarget] = useState(0),
    [hits, setHits] = useState(0),
    [beat, setBeat] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => {
    if (kind !== "drum") return;
    const t = setInterval(
      () => setBeat(Math.floor((Date.now() - start.current) / 700) % 4),
      50,
    );
    return () => clearInterval(t);
  }, [kind]);
  const finish = (n) => setResult(n);
  if (result !== null)
    return (
      <div className="center">
        <Icon name="Trophy" size={64} />
        <h2>Nice practice!</h2>
        <p className="gold-text">{result} points</p>
        <button className="btn primary" onClick={onExit}>
          Back to the party
        </button>
      </div>
    );
  return (
    <div className="practice">
      <p className="eyebrow">BONUS ARCADE · PRACTICE</p>
      <h2>
        {
          {
            drum: "Drum Beat",
            picture: "Picture Puzzle",
            goal: "Goal Rush",
            memory: "Market Memory",
            repair: "Robot Repair",
          }[kind]
        }
      </h2>
      {kind === "repair" ? (
        <SequenceGame
          sequence={[0, 2, 1, 3]}
          kind="repair"
          revealUntil={start.current + 4000}
          onSubmit={(v) => finish(JSON.stringify(v) === "[0,2,1,3]" ? 100 : 0)}
        />
      ) : kind === "memory" ? (
        <EventGame
          event={{
            kind: "memory",
            missing: 2,
            revealUntil: start.current + 4000,
          }}
          onSubmit={(v) => finish(v === 2 ? 100 : 0)}
        />
      ) : kind === "drum" ? (
        <>
          <p>
            Tap the drum when the first beat is lit. Land four taps. Timing
            practice has no cash risk.
          </p>
          <div className="beats">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={beat === i ? "lit" : ""}>
                {i + 1}
              </span>
            ))}
          </div>
          <button
            className="drum-pad"
            onClick={() => {
              const n = hits + (beat === 0 ? 25 : 0);
              setHits(n);
              setTarget(target + 1);
              if (target === 3) finish(n);
            }}
          >
            <Icon name="Drum" size={70} />
            TAP · {target}/4
          </button>
        </>
      ) : kind === "goal" ? (
        <>
          <p>Watch the keeper. Shoot into an open side, three times.</p>
          <div className="goal">
            <span
              className="keeper"
              style={{ left: target % 2 ? "72%" : "22%" }}
            >
              ✋
            </span>
          </div>
          <div className="row">
            {["Left", "Right"].map((label, i) => (
              <button
                key={label}
                className="btn primary"
                onClick={() => {
                  const n = hits + (i !== target % 2 ? 100 : 0);
                  setHits(n);
                  setTarget(target + 1);
                  if (target === 2) finish(n);
                }}
              >
                Shoot {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>
            Rebuild the mountain scene: put the layers in order from the sky
            down to the sea.
          </p>
          <Ordering
            options={["Ocean", "Mountain", "Sky", "Shore"]}
            onSubmit={(v) =>
              finish(v === "Sky → Mountain → Shore → Ocean" ? 100 : 0)
            }
          />
        </>
      )}
      <button className="text-button" onClick={onExit}>
        Exit practice
      </button>
    </div>
  );
}
export function Ordering({ options, onSubmit, disabled }) {
  const [order, setOrder] = useState([]);
  return (
    <>
      <div className="ordering-result">
        {order.length
          ? order.join(" → ")
          : "Tap the items in the correct order"}
      </div>
      <div className="answers">
        {options.map((o) => (
          <button
            key={o}
            className="answer"
            disabled={disabled || order.includes(o)}
            onClick={() => setOrder([...order, o])}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="row">
        <button
          className="btn secondary"
          disabled={disabled}
          onClick={() => setOrder([])}
        >
          Reset
        </button>
        <button
          className="btn primary"
          disabled={disabled || order.length !== options.length}
          onClick={() => onSubmit(order.join(" → "))}
        >
          Lock order
        </button>
      </div>
    </>
  );
}
