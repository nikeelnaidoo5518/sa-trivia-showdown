import { test, expect } from "@playwright/test";
test("Firebase anonymous auth, room creation, team vote, private input, host resume and phone reconnect", async ({
  browser,
  page: host,
}) => {
  const errors = [];
  host.on("pageerror", (e) => errors.push(e.message));
  await host.goto("/");
  await host.evaluate(() =>
    localStorage.setItem(
      "sa.settings",
      JSON.stringify({ mode: "teams", events: false }),
    ),
  );
  await host.reload();
  // Force Firebase via the development emulator build; production uses configured Firebase automatically.
  await host.getByRole("button", { name: "Start Game", exact: true }).click();
  await host.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(host.locator(".big-room-code")).toBeVisible();
  const code = await host.locator(".big-room-code").innerText();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const phone = await ctx.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(`http://127.0.0.1:5174/?room=${code}&mode=firebase`);
  await phone.getByLabel("Nickname").fill("Firebase Player");
  await phone.getByRole("button", { name: "Let me in" }).click();
  await expect(
    phone.getByRole("heading", { name: "You’re in!" }),
  ).toBeVisible();
  await phone.getByRole("button", { name: "I’m ready" }).click();
  await expect(host.locator(".lobby-player")).toContainText("Team Ubuntu");
  await host.getByRole("button", { name: "Let the showdown begin" }).click();
  await host.getByRole("button", { name: "Let’s do this" }).click();
  await expect(phone.locator(".answer").first()).toBeVisible();
  await phone.locator(".answer").first().click();
  await expect(
    phone.getByRole("status").filter({ hasText: "Answer locked" }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Reveal results" }).click();
  const cash = await phone.locator(".player-header>strong").innerText();
  await phone.reload();
  await expect(phone.locator(".player-header")).toContainText(
    "Firebase Player",
  );
  await expect(phone.locator(".player-header>strong")).toHaveText(cash);
  await host.reload();
  await host
    .getByRole("button", { name: "Resume your last hosted room" })
    .click();
  await expect(host.locator(".result-answer")).toBeVisible();
  await expect(host.locator(".standing")).toContainText("Ubuntu");
  for (let question = 1; question < 5; question++) {
    await host.getByRole("button", { name: "Next question" }).click();
    await host.getByRole("button", { name: "Skip", exact: true }).click();
  }
  await host.getByRole("button", { name: "Next round" }).click();
  await expect(
    phone.getByRole("heading", { name: "Pick Your Province" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test("Firebase transports a targeted trick between independent phone sessions", async ({
  browser,
  page: host,
}) => {
  await host.goto("/");
  await host.getByRole("button", { name: "Start Game", exact: true }).click();
  await host.getByRole("button", { name: "Create room", exact: true }).click();
  const code = await host.locator(".big-room-code").innerText();
  const contexts = [],
    phones = [];
  for (const name of ["Zola", "Avi"]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    contexts.push(ctx);
    const p = await ctx.newPage();
    phones.push(p);
    await p.goto(`http://127.0.0.1:5174/?room=${code}`);
    await p.getByLabel("Nickname").fill(name);
    await p.getByRole("button", { name: "Let me in" }).click();
    await expect(p.getByRole("heading", { name: "You’re in!" })).toBeVisible();
  }
  await host.getByRole("button", { name: "Let the showdown begin" }).click();
  await phones[0].getByRole("button", { name: "Jam Avi", exact: true }).click();
  await phones[0].getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(phones[1].getByText(/Zola sent Confetti Jam/)).toBeVisible();
  await host.getByRole("button", { name: "Let’s do this" }).click();
  for (let n = 3; n > 0; n--)
    await phones[1]
      .getByRole("button", { name: `Clear confetti · ${n}`, exact: true })
      .click();
  await expect(phones[1].locator(".jam-panel")).toHaveCount(0);
  for (const ctx of contexts) await ctx.close();
});
