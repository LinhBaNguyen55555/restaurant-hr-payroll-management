import { beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});
it("fetches CSRF before mutations and sends session credentials", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "csrf-token" }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetcher);
  const { api } = await import("../lib/api");
  await api("/auth/login", "POST", { email: "x@y.de", password: "example" });
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    "/api/v1/auth/login",
    expect.objectContaining({
      credentials: "same-origin",
      headers: expect.objectContaining({ "X-XSRF-TOKEN": "csrf-token" }),
    }),
  );
});
it("returns a controlled message on network failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
  const { api } = await import("../lib/api");
  await expect(api("/workspace")).rejects.toThrow(
    "Keine Verbindung zum Server",
  );
});
it("preserves HTTP status to support expired-session handling", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Bitte anmelden." }),
    }),
  );
  const { api } = await import("../lib/api");
  await expect(api("/workspace")).rejects.toMatchObject({
    status: 401,
    message: "Bitte anmelden.",
  });
});
