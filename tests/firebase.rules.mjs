import test, { after, before } from "node:test";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-sa-trivia-showdown",
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: fs.readFileSync(
        new URL("../database.rules.json", import.meta.url),
        "utf8",
      ),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
test("Firebase: host owns state, players own inputs, submissions stay private", async () => {
  const host = env.authenticatedContext("host").database(),
    alice = env.authenticatedContext("alice").database(),
    bob = env.authenticatedContext("bob").database(),
    anonymous = env.unauthenticatedContext().database();
  const code = "ABC234",
    path = "rooms/" + code;
  await assertSucceeds(
    host
      .ref(path)
      .set({
        host: "host",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        state: { phase: "lobby", players: [] },
      }),
  );
  await assertSucceeds(alice.ref(path + "/host").get());
  await assertSucceeds(alice.ref(path + "/state").get());
  await assertFails(anonymous.ref(path + "/state").get());
  await assertFails(alice.ref(path + "/state").set({ phase: "final" }));
  await assertFails(alice.ref(path + "/host").set("alice"));
  const profile = {
    name: "Alice",
    avatar: "Sun",
    colour: "#50d5c0",
    team: "Ubuntu",
    audience: false,
  };
  await assertSucceeds(alice.ref(path + "/members/alice").set(profile));
  await assertSucceeds(
    bob.ref(path + "/members/bob").set({ ...profile, name: "Bob" }),
  );
  await assertFails(
    bob.ref(path + "/members/alice").set({ ...profile, name: "Imposter" }),
  );
  await assertSucceeds(
    alice
      .ref(path + "/inputs/alice")
      .set({
        id: "1",
        type: "answer",
        activityId: "q1",
        value: "Secret answer",
      }),
  );
  await assertSucceeds(host.ref(path + "/inputs/alice").get());
  await assertSucceeds(alice.ref(path + "/inputs/alice").get());
  await assertFails(bob.ref(path + "/inputs/alice").get());
  await assertFails(bob.ref(path + "/inputs").get());
  await assertFails(
    bob
      .ref(path + "/inputs/alice")
      .set({ id: "2", type: "answer", value: "spoofed" }),
  );
  await assertFails(
    alice
      .ref(path + "/members/alice")
      .set({ ...profile, name: "x".repeat(100) }),
  );
  await assertSucceeds(host.ref(path + "/state").set({ phase: "playing" }));
  await assertSucceeds(
    host
      .ref(path + "/feedback/alice")
      .set({ message: "Locked", error: false, at: Date.now() }),
  );
  await assertSucceeds(alice.ref(path + "/feedback/alice").get());
  await assertFails(bob.ref(path + "/feedback/alice").get());
  await assertFails(alice.ref(path).get());
  await assertSucceeds(host.ref(path).remove());
});
test("Firebase rejects expired rooms and malformed room codes", async () => {
  const host = env.authenticatedContext("host").database(),
    alice = env.authenticatedContext("alice").database();
  await assertFails(
    host
      .ref("rooms/INVALID")
      .set({
        host: "host",
        createdAt: 0,
        expiresAt: 1,
        state: { phase: "lobby" },
      }),
  );
  await assertSucceeds(
    host
      .ref("rooms/EXP234")
      .set({
        host: "host",
        createdAt: 0,
        expiresAt: 1,
        state: { phase: "lobby" },
      }),
  );
  await assertFails(alice.ref("rooms/EXP234/state").get());
  await assertFails(
    alice
      .ref("rooms/EXP234/members/alice")
      .set({
        name: "Alice",
        avatar: "Sun",
        colour: "red",
        team: "Ubuntu",
        audience: false,
      }),
  );
});
