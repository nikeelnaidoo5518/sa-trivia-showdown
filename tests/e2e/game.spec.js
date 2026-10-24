import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import fs from "node:fs";
const bank = ["a", "b", "c"].flatMap((x) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`../../src/data/questions-${x}.json`, import.meta.url),
    ),
  ),
);
const saved = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("sa.host"))?.engine);
const phase = async (page, value) =>
  expect.poll(async () => (await saved(page))?.state.phase).toBe(value);
async function answer(phone, e) {
  const s = e.state;
  if (s.phase === "select") {
    await phone
      .getByRole("button", { name: "Western Cape", exact: true })
      .click();
    return;
  }
  if (s.phase === "wager") {
    await phone.getByRole("button", { name: "Lock secret wager" }).click();
    return;
  }
  if (s.phase === "event") {
    const ev = s.event;
    if (ev.kind === "repair") {
      await phone.waitForTimeout(
        Math.max(0, ev.revealUntil - Date.now()) + 100,
      );
      for (const n of ev.sequence)
        await phone
          .getByRole("button", {
            name: ["SUN", "WAVE", "SPARK", "LEAF"][n],
            exact: true,
          })
          .click();
      await phone.getByRole("button", { name: "Lock sequence" }).click();
    } else if (ev.kind === "memory") {
      await phone.waitForTimeout(
        Math.max(0, ev.revealUntil - Date.now()) + 100,
      );
      await phone
        .getByRole("button", {
          name: ["Maize", "Apple", "Bread", "Milk"][ev.missing],
          exact: true,
        })
        .click();
    } else if (ev.kind === "route")
      await phone.getByRole("button", { name: /Take the safe route/ }).click();
    else {
      if (ev.kind === "catch")
        // This target deliberately never stops moving. Exercise its keyboard
        // control instead of waiting for Playwright's pointer stability check.
        await phone
          .getByRole("button", { name: "Catch game-money bag" })
          .press("Enter");
      await phone
        .getByLabel("Your answer", { exact: true })
        .fill(String(ev.a + ev.b));
      await phone.getByRole("button", { name: "Submit answer" }).click();
    }
    return;
  }
  if (s.mini?.kind === "map") {
    const target = bank.find(
      (q) => q.answer === s.mini.target && q.format === "map",
    ).mapTarget;
    const rect = await phone.locator(".game-map").last().boundingBox();
    await phone.mouse.click(
      rect.x + (rect.width * target.x) / 100,
      rect.y + (rect.height * target.y) / 100,
    );
    await phone.getByRole("button", { name: "Lock my pin" }).click();
    return;
  }
  if (s.mini?.kind === "braai") {
    await phone.waitForTimeout(
      Math.max(0, s.mini.revealUntil - Date.now()) + 100,
    );
    for (const n of s.mini.sequence)
      await phone
        .getByRole("button", {
          name: ["Mielie", "Pepper", "Mushroom", "Sosatie"][n],
          exact: true,
        })
        .click();
    await phone.getByRole("button", { name: "Lock sequence" }).click();
    return;
  }
  const q = e.question;
  if (q.format === "ordering") {
    for (const option of q.answer.split(" → "))
      await phone.getByRole("button", { name: option, exact: true }).click();
    await phone.getByRole("button", { name: "Lock order" }).click();
  } else if (q.options) {
    await phone
      .locator(".answer")
      .filter({ hasText: q.answer })
      .first()
      .click();
  } else {
    await phone.getByLabel("Your answer", { exact: true }).fill(q.answer);
    await phone.getByRole("button", { name: "Lock answer" }).click();
  }
}
test("TV layouts, QR decode, two phones, manual join, reconnect and all ten rounds to credits", async ({
  browser,
  page: host,
}) => {
  const errors = [];
  host.on("pageerror", (e) => errors.push(e.message));
  // Always include the rolling-bag event so its interaction stays covered.
  await host.addInitScript(() => {
    Math.random = () => 0.99;
  });
  await host.setViewportSize({ width: 1440, height: 900 });
  await host.goto("/");
  await expect(host.getByRole("heading", { name: /SA TRIVIA/ })).toBeVisible();
  await host.screenshot({ path: "test-results/menu-1440.png", fullPage: true });
  await host.setViewportSize({ width: 1920, height: 1080 });
  await host.screenshot({
    path: "test-results/menu-tv-1920.png",
    fullPage: true,
  });
  await host.getByRole("button", { name: "Start Game", exact: true }).click();
  await host.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(host.locator(".big-room-code")).toBeVisible();
  const code = await host.locator(".big-room-code").innerText();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  const data = await host.locator(".qr").getAttribute("src");
  const png = PNG.sync.read(Buffer.from(data.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded.data).toContain(`room=${code}`);
  const mobileContext = await browser.newContext({
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobileContext.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(decoded.data);
  await expect(phone.getByLabel("Room code")).toHaveValue(code);
  await phone.getByLabel("Nickname").fill("Nikeel");
  await phone.getByRole("button", { name: "Let me in" }).click();
  await expect(
    phone.getByRole("heading", { name: "You’re in!" }),
  ).toBeVisible();
  await phone.getByRole("button", { name: "I’m ready" }).click();
  const context2 = await browser.newContext({
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const phone2 = await context2.newPage();
  await phone2.goto("/");
  await phone2.getByRole("button", { name: "Join Game", exact: true }).click();
  await phone2.getByLabel("Room code").fill(code);
  await phone2.getByLabel("Nickname").fill("Thandi");
  await phone2.getByRole("button", { name: "Let me in" }).click();
  await phone2.getByRole("button", { name: "I’m ready" }).click();
  await expect(host.locator(".lobby-player")).toHaveCount(2);
  await host.screenshot({ path: "test-results/lobby-tv.png", fullPage: true });
  await phone.screenshot({
    path: "test-results/controller-lobby-390.png",
    fullPage: true,
  });
  await phone.reload();
  await expect(
    phone.getByRole("heading", { name: "You’re in!" }),
  ).toBeVisible();
  await expect(phone.locator(".player-header")).toContainText("Nikeel");
  await expect(host.locator(".lobby-player")).toHaveCount(2);
  await host.getByRole("button", { name: "Let the showdown begin" }).click();
  const visited = new Set();
  const events = new Set();
  let steps = 0;
  while (steps++ < 70) {
    const e = await saved(host);
    const s = e.state;
    visited.add(s.rounds[s.roundIndex].id);
    if (s.phase === "event") events.add(s.event.id);
    if (s.phase === "credits") break;
    if (s.phase === "tutorial") {
      await host.getByRole("button", { name: "Let’s do this" }).click();
      continue;
    }
    if (["select", "wager", "playing", "event"].includes(s.phase)) {
      if (s.phase === "playing" && s.roundIndex === 0) {
        await host.getByRole("button", { name: "Pause", exact: true }).click();
        await expect(phone.getByText("Host paused the game")).toBeVisible();
        await expect(phone.locator(".answer").first()).toBeDisabled();
        await host.getByRole("button", { name: "Resume", exact: true }).click();
        await host.screenshot({
          path: "test-results/question-tv.png",
          fullPage: true,
        });
        await phone.screenshot({
          path: "test-results/question-phone.png",
          fullPage: true,
        });
      }
      await answer(phone, e);
      await expect(
        phone.getByRole("status").filter({ hasText: /locked/ }),
      ).toBeVisible();
      if (s.phase === "select")
        await host.getByRole("button", { name: "Close voting" }).click();
      else if (s.phase === "wager")
        await host.getByRole("button", { name: "Reveal the question" }).click();
      else await host.getByRole("button", { name: "Reveal results" }).click();
      continue;
    }
    if (s.phase === "results" || s.phase === "event-results") {
      await host
        .getByRole("button", {
          name:
            s.roundIndex === s.rounds.length - 1
              ? "The final scores"
              : "Keep the party going",
        })
        .click();
      continue;
    }
    if (s.phase === "final") {
      await host.screenshot({
        path: "test-results/final-tv.png",
        fullPage: true,
      });
      await host.getByRole("button", { name: "Roll the credits" }).click();
    }
  }
  expect(visited.size).toBe(10);
  expect(events.has("cash")).toBe(true);
  expect(steps).toBeLessThan(70);
  await expect(
    host.getByText("Created by Nikeel Naidoo", { exact: true }),
  ).toBeVisible();
  await expect(
    host.getByText("Creator & concept owner", { exact: true }),
  ).toBeVisible();
  const e = await saved(host);
  expect(new Set(e.used).size).toBe(e.used.length);
  await expect(
    phone.getByText("Created by Nikeel Naidoo", { exact: true }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Play Again", exact: true }).click();
  await phase(host, "lobby");
  await expect(host.locator(".lobby-player")).toHaveCount(2);
  expect(errors).toEqual([]);
  await mobileContext.close();
  await context2.close();
});
test("quick demo, credits navigation, settings, small screens and bonus arcade", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start Game", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Credits", exact: true }).click();
  await expect(
    page.getByText("Created by Nikeel Naidoo", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to Main Menu" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Match length").selectOption("5");
  await page.getByLabel("Reduced animation").check();
  await page.getByLabel("Larger text").check();
  await page.getByRole("button", { name: "Back to the party" }).click();
  await page.getByRole("button", { name: "Try a playable demo" }).click();
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.locator(".lobby-player")).toHaveCount(4);
  expect((await saved(page)).state.rounds.length).toBe(5);
  await page.getByRole("button", { name: "End game", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Roll the credits" }).click();
  await page.getByRole("button", { name: "Return to Main Menu" }).click();
  await page.getByRole("button", { name: "How to Play", exact: true }).click();
  await page.getByRole("button", { name: "Goal Rush" }).click();
  await page.getByRole("button", { name: "Shoot Right" }).click();
  await page.getByRole("button", { name: "Shoot Left" }).click();
  await page.getByRole("button", { name: "Shoot Right" }).click();
  await expect(page.getByText("300 points")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the party", exact: true })
    .last()
    .click();
});
test("team huddle shares the winning vote and host skip changes no cash", async ({
  browser,
  page: host,
}) => {
  await host.goto("/");
  await host.evaluate(() =>
    localStorage.setItem(
      "sa.settings",
      JSON.stringify({ mode: "teams", events: false }),
    ),
  );
  await host.reload();
  await host.getByRole("button", { name: "Start Game", exact: true }).click();
  await host.getByRole("button", { name: "Create room", exact: true }).click();
  const code = await host.locator(".big-room-code").innerText();
  const contexts = [];
  const phones = [];
  for (const name of ["Team One", "Team Two"]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    contexts.push(ctx);
    const phone = await ctx.newPage();
    phones.push(phone);
    await phone.goto(`http://127.0.0.1:5173/?room=${code}`);
    await phone.getByLabel("Nickname").fill(name);
    await phone.getByRole("button", { name: "Let me in" }).click();
    await expect(
      phone.getByRole("heading", { name: "You’re in!" }),
    ).toBeVisible();
  }
  await host.getByRole("button", { name: "Let the showdown begin" }).click();
  let steps = 0;
  while (steps++ < 40) {
    const e = await saved(host);
    if (e.state.roundIndex === 6 && e.state.phase === "playing") break;
    if (e.state.phase === "tutorial")
      await host.getByRole("button", { name: "Let’s do this" }).click();
    else if (e.state.phase === "results")
      await host.getByRole("button", { name: "Keep the party going" }).click();
    else await host.getByRole("button", { name: "Skip", exact: true }).click();
  }
  const e = await saved(host);
  expect(e.state.players.every((p) => p.cash === 500)).toBe(true);
  await expect(phones[0].getByText(/Discuss with Team Ubuntu/)).toBeVisible();
  await answer(phones[0], e);
  await expect(
    phones[0].getByRole("status").filter({ hasText: "Answer locked" }),
  ).toBeVisible();
  const q = e.question;
  if (q.options && q.format !== "ordering") {
    const wrong = q.options.find((x) => x !== q.answer);
    await phones[1]
      .locator(".answer")
      .filter({ hasText: wrong })
      .first()
      .click();
  } else if (q.format === "ordering") {
    for (const option of [...q.options].reverse())
      await phones[1]
        .getByRole("button", { name: option, exact: true })
        .click();
    await phones[1].getByRole("button", { name: "Lock order" }).click();
  } else {
    await phones[1].getByLabel("Your answer", { exact: true }).fill("wrong");
    await phones[1].getByRole("button", { name: "Lock answer" }).click();
  }
  await host.getByRole("button", { name: "Reveal results" }).click();
  for (const phone of phones)
    await expect(
      phone.getByText("Shared team answer", { exact: true }),
    ).toBeVisible();
  const after = await saved(host);
  expect(after.state.players.every((p) => p.cash === 800)).toBe(true);
  await expect(host.locator(".standing")).toContainText("R800");
  for (const c of contexts) await c.close();
});

test("five-round demo is playable through the on-screen phone and credits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "sa.settings",
      JSON.stringify({ length: 5, events: false }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "Try a playable demo" }).click();
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await page.getByRole("button", { name: "Let the showdown begin" }).click();
  const visited = new Set();
  for (let i = 0; i < 30; i++) {
    const e = await saved(page);
    visited.add(e.state.rounds[e.state.roundIndex].id);
    if (e.state.phase === "credits") break;
    if (e.state.phase === "tutorial")
      await page.getByRole("button", { name: "Let’s do this" }).click();
    else if (e.state.phase === "playing" || e.state.phase === "wager") {
      await answer(page, e);
      await expect(page.locator(".demo-controller .locked")).toBeVisible();
      await page
        .getByRole("button", {
          name:
            e.state.phase === "wager"
              ? "Reveal the question"
              : "Reveal results",
        })
        .click();
    } else if (e.state.phase === "results")
      await page
        .getByRole("button", {
          name:
            e.state.roundIndex === 4
              ? "The final scores"
              : "Keep the party going",
        })
        .click();
    else if (e.state.phase === "final")
      await page.getByRole("button", { name: "Roll the credits" }).click();
  }
  expect(visited.size).toBe(5);
  await expect(
    page.getByText("Created by Nikeel Naidoo", { exact: true }),
  ).toBeVisible();
  expect(
    (await saved(page)).state.players.find((p) => p.id === "demo-you").cash,
  ).toBeGreaterThan(500);
});

test("difficulty choice, rival trick, automatic reveal and round winner", async ({
  browser,
  page: host,
}) => {
  await host.goto("/");
  await host.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(host.getByRole("dialog")).toBeVisible();
  await host.getByRole("button", { name: /Hard For local legends/ }).click();
  await host.getByRole("button", { name: "Create room", exact: true }).click();
  const code = await host.locator(".big-room-code").innerText();
  const contexts = [],
    phones = [];
  for (const name of ["Zola", "Avi"]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    contexts.push(ctx);
    const phone = await ctx.newPage();
    phones.push(phone);
    await phone.goto(`http://127.0.0.1:5173/?room=${code}`);
    await phone.getByLabel("Nickname").fill(name);
    await phone.getByRole("button", { name: "Let me in" }).click();
    await expect(
      phone.getByRole("heading", { name: "You’re in!" }),
    ).toBeVisible();
  }
  await host.getByRole("button", { name: "Let the showdown begin" }).click();
  await phones[0].getByRole("button", { name: "Jam Avi", exact: true }).click();
  await phones[0].getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(phones[1].getByText(/Zola sent Confetti Jam/)).toBeVisible();
  await host.getByRole("button", { name: "Let’s do this" }).click();
  const e = await saved(host);
  expect(e.question.difficulty).toBe("hard");
  for (let n = 3; n > 0; n--) {
    await phones[1]
      .getByRole("button", { name: `Clear confetti · ${n}`, exact: true })
      .click();
  }
  await answer(phones[0], e);
  await answer(phones[1], e);
  await expect(host.locator(".result-answer")).toBeVisible();
  await expect(host.locator(".round-winners")).toContainText(/win.*this round/);
  await expect(phones[0].locator(".answer-reveal")).toBeVisible();
  for (const ctx of contexts) await ctx.close();
});
