// getRandomValues also works on local-network HTTP, unlike randomUUID.
export const uuid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : [...crypto.getRandomValues(new Uint8Array(16))]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
