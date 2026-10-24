# First-version verification

Checked on 24 October 2026 with Node 24, Chromium (Playwright) and Firebase Authentication/Realtime Database emulators. Production Firebase credentials were not available; production hosting has not been claimed as tested or live.

**Story:** A host creates a TV room → phones join through QR or a code → the transport delivers private inputs → the host validates and scores → everyone receives updated public state → final scores lead to creator credits.

| Boundary               | Result and evidence                                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Question data          | 600 entries validated, 60 per category, nine formats. Unique IDs and prompts; choice answers belong to options; ordering items and map targets checked; all entries have reference notes. Four cross-category paraphrase duplicates were replaced during review. |
| Engine                 | 12 automated tests cover all rounds, linked solo huddle, three-question mix, quick match, no repeats, settings, wagers, caps, all six cards, all six events, audience predictions, team majority/ties, pause, skip, end and restoration.                         |
| TV and phones          | Four Playwright suites cover the local relay, independent phones and the self-contained demo. The standard match completes ten rounds, credits and replay; the demo completes all five Quick Match rounds.                                                       |
| Joining                | QR image decoded with jsQR and the decoded URL opened as a new phone session. A second phone joins through the manual six-character code. No account or app installation flow.                                                                                   |
| Team play              | Two phones vote differently in Team Huddle. The earlier vote wins the tie and both receive the shared answer reward. Team standing shows average cash. Skipped earlier rounds preserve balances.                                                                 |
| Reconnection           | Phone refresh restores nickname, cash and room; no duplicate player appears. Firebase browser test also refreshes the TV, resumes its checkpoint and continues the same room.                                                                                    |
| Privacy and authority  | Two Firebase rules suites verify host-only state writes, per-user membership and input writes, host/self-only input reads, feedback privacy, invalid codes and expiration. Expected denied attempts are logged as `permission_denied`.                           |
| Firebase integration   | One Playwright suite runs the actual Firebase transport with anonymous Auth and Database emulators. Room creation, joining, ready state, input, results, phone reconnect and host recovery pass.                                                                 |
| Responsive layouts     | Screenshots inspected at 1920×1080 TV, 1440×900 desktop and 390×844 phone. Tests additionally use 360×800 and 320×568; small-screen horizontal overflow is checked.                                                                                              |
| Accessibility controls | Keyboard native controls, map arrow keys/Enter, larger text, sound toggle, reduced animation, written audio fallback, visible locked-answer feedback, modal Escape/focus containment. Full screen-reader and all-browser audits remain future work.              |
| Build and dependencies | `npm run build` succeeds. Production dependencies report zero known vulnerabilities with `npm audit --omit=dev`. A patched compatible gRPC dependency is pinned through an override; Firestore is not imported into the game.                                    |
| Deployment             | Source pushed to `nikeelnaidoo5518/sa-trivia-showdown`; GitHub Actions started. The integration cannot enable Pages or manage Actions variables (HTTP 403); owner setup and a successful live deployment are still required. |

## Fixes found through testing

- Firebase room creation now checks the readable owner field and uses a rules-protected creation write; a transaction at the unreadable room root would fail.
- Firebase snapshots are normalised because Realtime Database removes empty arrays/objects.
- Replayed input IDs survive host checkpoint restoration.
- Local relay reconnect tokens are separate from public player IDs.
- The demo controller has reserved space on desktop, becomes inline on smaller screens and hides on final results, keeping host controls accessible.
- Map-bank questions are reserved for actual map controls, rather than appearing as text entry with the answer in the prompt.
- Robot Repair bonuses appear in the round cash ledger.
- Pause/resume adjusts memory reveal times as well as the activity deadline.
- The Firebase test runner includes a loopback-only proxy compatibility adapter. It leaves remote proxy routing unchanged and is not included in the web bundle. No installed dependency patch is needed to reproduce tests.
- The first GitHub browser run exposed a test waiting for the continuously moving money bag to become stationary. The test now uses the bag's keyboard control and selects a repeatable event sequence that always includes it.

## Reproduce

```sh
npm ci
npm run validate
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:firebase  # Java 21+
npm run build
```

`docs/screenshots/` contains the start menu, TV question and phone controller captured from browser tests. Screenshots under `test-results/` and Playwright HTML reports are generated, ignored artifacts.

## Owner checks before a public game night

Configure a real Firebase project and deploy the supplied rules. Select GitHub Actions for Pages, add the public web configuration variables and confirm the workflow completes. Check the resulting HTTPS URL on the actual TV and physical phones, including scanning the QR with a camera and device-specific speech output. This build did not test physical phone cameras, TV overscan, iOS/Safari voices, internet latency or production Firebase quotas.
