import {
  Apple,
  AudioLines,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Backpack,
  Banknote,
  BatteryCharging,
  BriefcaseBusiness,
  BookOpen,
  Bot,
  Building2,
  Bus,
  Check,
  CheckCircle2,
  ChevronsUp,
  CircleAlert,
  Clock3,
  Coins,
  Copy,
  Crown,
  Drum,
  ExternalLink,
  Eye,
  Flame,
  Flower2,
  Gauge,
  Goal,
  Headphones,
  HandCoins,
  Heart,
  Image,
  Landmark,
  Layers,
  Leaf,
  Lightbulb,
  LockKeyhole,
  Mail,
  Map,
  MapPin,
  MapPinned,
  Maximize,
  MessagesSquare,
  Milk,
  Minus,
  Mountain,
  Music2,
  Palmtree,
  PartyPopper,
  Pause,
  Play,
  Power,
  Puzzle,
  QrCode,
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  Shield,
  ScanEye,
  ShoppingBasket,
  Shuffle,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Tv,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  Waves,
  Wheat,
  Zap,
} from "lucide-react";
const Icons = {
  Apple,
  AudioLines,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Backpack,
  Banknote,
  BatteryCharging,
  BriefcaseBusiness,
  BookOpen,
  Bot,
  Building2,
  Bus,
  Check,
  CheckCircle2,
  ChevronsUp,
  CircleAlert,
  Clock3,
  Coins,
  Copy,
  Crown,
  Drum,
  ExternalLink,
  Eye,
  Flame,
  Flower2,
  Gauge,
  Goal,
  Headphones,
  HandCoins,
  Heart,
  Image,
  Landmark,
  Layers,
  Leaf,
  Lightbulb,
  LockKeyhole,
  Mail,
  Map,
  MapPin,
  MapPinned,
  Maximize,
  MessagesSquare,
  Milk,
  Minus,
  Mountain,
  Music2,
  Palmtree,
  PartyPopper,
  Pause,
  Play,
  Power,
  Puzzle,
  QrCode,
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  Shield,
  ScanEye,
  ShoppingBasket,
  Shuffle,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Tv,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  Waves,
  Wheat,
  Zap,
};
export function Icon({ name, size = 22, ...rest }) {
  const Component = Icons[name] || Icons.Sparkles;
  return <Component size={size} strokeWidth={2} aria-hidden="true" {...rest} />;
}
export function Avatar({ player, size = 48 }) {
  return (
    <span
      className="avatar"
      style={{
        "--player": player.colour || "#50d5c0",
        width: size,
        height: size,
      }}
    >
      <Icon name={player.avatar || "Sun"} size={size * 0.51} />
    </span>
  );
}
export function ShowdownMascots({
  mood = "welcome",
  compact = false,
  className = "",
}) {
  return (
    <div
      className={`showdown-mascots ${compact ? "compact" : ""} mood-${mood} ${className}`}
      aria-label="Meet Zola the quiz bot, Pip the rhythm bird, and Sizzle the braai buddy"
      role="img"
    >
      <svg viewBox="0 0 520 220" aria-hidden="true">
        <ellipse className="mascot-shadow" cx="100" cy="188" rx="54" ry="10" />
        <ellipse className="mascot-shadow" cx="260" cy="188" rx="57" ry="11" />
        <ellipse className="mascot-shadow" cx="422" cy="188" rx="53" ry="10" />
        <g className="mascot mascot-pip">
          <path
            d="M77 116c-8-37 8-71 39-76 34-6 56 22 51 57-4 28-24 54-48 54-21 0-37-14-42-35Z"
            fill="#65c6d8"
            stroke="#152b43"
            strokeWidth="7"
          />
          <path
            d="M80 79q-4-48 36-48t48 49"
            fill="none"
            stroke="#ad8cff"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <rect
            x="70"
            y="72"
            width="17"
            height="36"
            rx="8"
            fill="#ffcb60"
            stroke="#152b43"
            strokeWidth="5"
          />
          <rect
            x="151"
            y="72"
            width="17"
            height="36"
            rx="8"
            fill="#ffcb60"
            stroke="#152b43"
            strokeWidth="5"
          />
          <path
            d="M107 43q-4-25 13-29m9 29q2-27 19-22"
            fill="none"
            stroke="#65c6d8"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="m155 88 29 10-28 14"
            fill="#ff9b62"
            stroke="#152b43"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <ellipse cx="111" cy="79" rx="9" ry="12" fill="#fff6df" />
          <ellipse
            className="mascot-eye"
            cx="114"
            cy="81"
            rx="4"
            ry="6"
            fill="#172b42"
          />
          <path
            d="M112 105q14 13 27-1"
            fill="none"
            stroke="#17304a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="m84 103-24 16 12-30m57 44 4 30m-30-27-5 27"
            fill="none"
            stroke="#152b43"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m87 166-11 5m40-4 11 4"
            stroke="#ffcb60"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path d="m99 147 23 1-3 12-18-1Z" fill="#ad8cff" />
        </g>
        <g className="mascot mascot-zola">
          <path
            d="M231 143v26m54-26v26"
            stroke="#17304a"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M218 172h25m34 0h25"
            stroke="#ffcb60"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="m219 104-22 27m104-27 21 23"
            stroke="#45bfae"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M216 98q0-17 17-17h54q17 0 17 17v44q0 15-17 15h-54q-17 0-17-15Z"
            fill="#51cdb8"
            stroke="#17304a"
            strokeWidth="7"
          />
          <path
            d="M202 50q0-23 23-23h70q23 0 23 23v41h-116Z"
            fill="#ffcb60"
            stroke="#17304a"
            strokeWidth="7"
          />
          <path d="M218 48q0-11 12-11h59q12 0 12 11v24h-83Z" fill="#172b42" />
          <circle cx="235" cy="55" r="6" fill="#70e5cf" />
          <circle cx="282" cy="55" r="6" fill="#70e5cf" />
          <path
            d="M238 67q21 16 42 0"
            fill="none"
            stroke="#f7f0db"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            cx="199"
            cy="59"
            r="10"
            fill="#ff8e80"
            stroke="#17304a"
            strokeWidth="5"
          />
          <circle
            cx="321"
            cy="59"
            r="10"
            fill="#ff8e80"
            stroke="#17304a"
            strokeWidth="5"
          />
          <path
            d="M260 26V13"
            stroke="#17304a"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle
            cx="260"
            cy="9"
            r="9"
            fill="#ff8e80"
            stroke="#17304a"
            strokeWidth="4"
          />
          <path
            d="m250 112 10-17 10 17-10 18Z"
            fill="#ffcb60"
            stroke="#17304a"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="235" cy="126" r="4" fill="#fff6df" />
          <circle cx="284" cy="126" r="4" fill="#fff6df" />
        </g>
        <g className="mascot mascot-sizzle">
          <path
            d="M404 63q-6-21 11-34 19 19 13 38"
            fill="#64c88d"
            stroke="#17304a"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M407 56q-8-21-29-18 4 21 27 27m21-8q13-19 33-11-9 19-31 20"
            fill="#64c88d"
            stroke="#17304a"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M389 64c-24 21-24 70-4 94 17 20 53 18 68-5 15-24 8-65-13-85-15-14-35-15-51-4Z"
            fill="#ff8b73"
            stroke="#17304a"
            strokeWidth="7"
          />
          <path
            d="M386 125q-21-2-26 16m91-18q19 3 22 17"
            fill="none"
            stroke="#17304a"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <ellipse cx="405" cy="97" rx="8" ry="11" fill="#fff6df" />
          <ellipse
            className="mascot-eye"
            cx="407"
            cy="99"
            rx="4"
            ry="6"
            fill="#17304a"
          />
          <ellipse cx="437" cy="97" rx="8" ry="11" fill="#fff6df" />
          <ellipse
            className="mascot-eye"
            cx="439"
            cy="99"
            rx="4"
            ry="6"
            fill="#17304a"
          />
          <path
            d="M407 119q15 16 30-1"
            fill="none"
            stroke="#17304a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="m404 157-4 15m34-13 5 13"
            stroke="#17304a"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="m394 174-3 7m47-7 4 7"
            stroke="#ffcb60"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="m416 67 7 15 11-12"
            fill="none"
            stroke="#ffe2aa"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
        <path
          className="mascot-sparkle sparkle-one"
          d="m184 40 5 12 12 4-12 4-5 12-4-12-12-4 12-4Zm172 22 4 9 9 3-9 3-4 9-3-9-9-3 9-3Z"
          fill="#ffcb60"
        />
        <path
          className="mascot-sparkle sparkle-two"
          d="m335 128 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
          fill="#70e5cf"
        />
      </svg>
      {!compact && (
        <div className="mascot-names">
          <span>
            ZOLA <small>QUIZ BOT</small>
          </span>
          <span>
            PIP <small>RHYTHM BIRD</small>
          </span>
          <span>
            SIZZLE <small>BRAAI BUDDY</small>
          </span>
        </div>
      )}
    </div>
  );
}
export function Landscape({ compact = false }) {
  return (
    <svg
      className={`landscape ${compact ? "compact" : ""}`}
      viewBox="0 0 800 640"
      role="img"
      aria-label="Original illustration of a lively South African coastal city with a mountain, market and friends"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#ef9b70" />
          <stop offset="1" stopColor="#f8ce84" />
        </linearGradient>
        <linearGradient id="water" x2="0" y2="1">
          <stop stopColor="#4ba9b2" />
          <stop offset="1" stopColor="#287b91" />
        </linearGradient>
      </defs>
      <path
        d="M90 130Q390 -40 682 129Q820 238 757 510Q610 668 207 593Q-25 469 90 130"
        fill="url(#sky)"
      />
      <circle cx="588" cy="174" r="69" fill="#ffe3a1" />
      <path
        d="M25 312 172 178 211 203 242 179 436 179 479 213 512 198 670 331Z"
        fill="#475b71"
      />
      <path d="m210 204 32-25 194 0 43 34-60-15-147 8Z" fill="#6a7b83" />
      <path
        d="M42 321Q340 267 761 335L743 461Q391 526 58 431Z"
        fill="url(#water)"
      />
      <g stroke="#a9e1d4" strokeWidth="4" strokeLinecap="round">
        <path d="M107 352h77m41 30h101m204-33h73m-190 44h124m-384 20h87m399-8h51" />
      </g>
      <path
        d="M55 430Q337 377 753 444L712 562Q410 676 107 542Z"
        fill="#ddb58a"
      />
      <g stroke="#182d42" strokeWidth="5" strokeLinejoin="round">
        <path d="M95 391V279h70v112" fill="#ed7c67" />
        <path d="m86 280 44-38 44 38" fill="#a85452" />
        <path d="M167 401V250h82v151" fill="#f4d38f" />
        <path d="M249 407V295h76v112" fill="#d6e3ce" />
        <path d="M542 409V271h76v138" fill="#f1c164" />
        <path d="M622 413V310h69v103" fill="#d88173" />
        <path d="M610 313 655 276 701 313" fill="#753d50" />
      </g>
      <g fill="#264c61">
        <path d="M111 300h17v25h-17zm31 0h13v25h-13zm40-29h20v26h-20zm30 0h20v26h-20zm-30 46h20v25h-20zm30 0h20v25h-20zm53 0h17v22h-17zm29 0h17v22h-17zm263-24h16v27h-16zm29 0h16v27h-16zm-29 43h16v27h-16zm29 0h16v27h-16zm49-8h18v25h-18zm29 0h15v25h-15z" />
      </g>
      <path
        d="M364 400h137v91H364z"
        fill="#f5d093"
        stroke="#243b4d"
        strokeWidth="5"
      />
      <path d="m350 400 18-47h129l19 47z" fill="#e87562" />
      <path
        d="m375 353-5 47h25l2-47m25 0v47h25l-3-47m26 0 7 47h25l-11-47"
        fill="#fff1c7"
      />
      <path d="M381 439h99v48h-99z" fill="#60b9a6" />
      <g fill="#f1bd48">
        <circle cx="394" cy="431" r="9" />
        <circle cx="412" cy="431" r="9" />
        <circle cx="429" cy="431" r="9" />
      </g>
      <g fill="#dc7356">
        <circle cx="453" cy="431" r="9" />
        <circle cx="472" cy="431" r="9" />
      </g>
      <g transform="translate(176 408) rotate(-7)">
        <path
          d="M0 73 8 126m34-53 13 50"
          stroke="#1c3146"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path d="M-6 29q25-20 53 0l9 54h-68z" fill="#49bdaa" />
        <path
          d="M-6 37-29 62m73-25 25-30"
          stroke="#774f41"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle cx="20" cy="0" r="24" fill="#9b6750" />
        <path d="M-5-5q-3-34 31-26 25 3 20 25l-17-9-32 13" fill="#243345" />
        <path
          d="m11 8 12 1"
          stroke="#ffe6c2"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(586 430) rotate(6)">
        <path
          d="M0 65-8 115m41-50 8 48"
          stroke="#25334c"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path d="M-6 20q25-16 53 0l2 57H-9z" fill="#a28ccc" />
        <path
          d="m-7 27-25-17m74 17 23 28"
          stroke="#b77853"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <circle cx="20" cy="-8" r="24" fill="#bd805c" />
        <path d="M-4-14q-12-40 19-27 32-10 29 29l-17-14-29 15" fill="#372c3b" />
        <path
          d="m12 0 13 0"
          stroke="#ffe6c2"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(314 485)">
        <path d="M0 14h66l-9 36H9z" fill="#22374b" />
        <path d="m12 51-8 27m48-27 9 27" stroke="#22374b" strokeWidth="6" />
        <path
          d="M16 7q-9-16 2-23m15 23q-9-16 2-23m16 23q-9-16 2-23"
          fill="none"
          stroke="#fff0cc"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M7 18h53" stroke="#f39a66" strokeWidth="5" />
      </g>
      <g fill="#264f5b">
        <path d="m697 364 10-97h8l-1 97z" />
        <path d="M711 270q-59 15-48-14 22-13 48 10-16-50 12-42 14 14-9 43 47-29 45 3-11 17-45 3z" />
      </g>
      <g fill="#fcdfa4">
        <path d="m93 159 5 12 13 2-10 8 3 13-11-7-12 7 3-13-10-8 14-2zM703 199l4 10 11 2-8 7 2 11-9-6-10 6 3-11-8-7 11-2z" />
      </g>
      <path
        d="m291 115 12-6 12 6m16-11 12-6 12 6"
        fill="none"
        stroke="#6d5d62"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function ClueArt({ type = "mountain" }) {
  return (
    <svg
      className="clue-art"
      viewBox="0 0 400 190"
      role="img"
      aria-label={`Stylised ${type} illustration; use the written clues for identification`}
    >
      <rect width="400" height="190" rx="24" fill="#223b50" />
      <circle cx="322" cy="48" r="26" fill="#ffcf6b" />
      {["mountain", "coast", "city"].includes(type) ? (
        <>
          <path
            d="m0 142 77-89 44 29 20-13h119l47 57 40-31 53 47"
            fill="#6c9b99"
          />
          <path d="M0 144h400v46H0" fill="#409d9f" />
          <path d="M30 164h81m133 8h100" stroke="#a1d6c7" strokeWidth="4" />
          {type === "city" && (
            <path
              d="M50 144V98h32v46m20 0V78h42v66m25 0V112h32v32"
              stroke="#f3af80"
              strokeWidth="14"
            />
          )}
        </>
      ) : type === "braai" ? (
        <>
          <path d="M110 83h180l-28 70H138z" fill="#172638" />
          <path
            d="m145 150-15 30m125-30 15 30"
            stroke="#f6d27f"
            strokeWidth="8"
          />
          <path
            d="M145 65q-16-21 0-42m55 42q-16-21 0-42m55 42q-16-21 0-42"
            fill="none"
            stroke="#f5ae82"
            strokeWidth="9"
          />
        </>
      ) : type === "flower" ? (
        <g transform="translate(200 95)">
          <path d="M0 24v60" stroke="#62b499" strokeWidth="9" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              rx="21"
              ry="48"
              transform={`rotate(${a}) translate(0 -23)`}
              fill="#e7999b"
              stroke="#263b50"
              strokeWidth="3"
            />
          ))}
          <circle r="23" fill="#ffd780" />
        </g>
      ) : type === "stadium" ? (
        <>
          <ellipse cx="200" cy="110" rx="140" ry="61" fill="#ece0bb" />
          <ellipse cx="200" cy="104" rx="114" ry="42" fill="#57a78c" />
          <rect
            x="133"
            y="80"
            width="134"
            height="48"
            fill="none"
            stroke="#fff8dd"
            strokeWidth="3"
          />
          <circle
            cx="200"
            cy="104"
            r="16"
            fill="none"
            stroke="#fff8dd"
            strokeWidth="3"
          />
        </>
      ) : (
        <>
          <path
            d="M125 117q48-99 115-39l48 8-34 19q-47 66-129 12"
            fill="#89bac5"
          />
          <path d="m165 106 63 4-46 31" fill="#4d798f" />
          <circle cx="237" cy="79" r="5" fill="#12253a" />
          <path d="m193 143-5 30m27-35 8 35" stroke="#f4c56e" strokeWidth="5" />
        </>
      )}
    </svg>
  );
}
