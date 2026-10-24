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
  await host.getByRole("button", { name: "Keep the party going" }).click();
  await expect(
    phone.getByRole("heading", { name: "Pick Your Province" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});
