import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { EditorModal } from "../components/editor";
import { Login, MfaGate } from "../components/auth";
import { api, type User, type Workspace } from "../lib/api";
vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  api: vi.fn(),
}));
vi.mock("../components/experience", () => ({
  Modal: ({ children, title }: { children: ReactNode; title: string }) => (
    <section role="dialog" aria-label={title}>
      {children}
    </section>
  ),
  Press: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
  Scene: () => null,
}));
const row = {
  id: "entity-1",
  version: 0,
  createdAt: "2026-11-01T00:00:00Z",
  code: "AT-01",
  name: "Atelier GmbH",
  registrationNumber: "HRB 42",
  address: "Stuttgart",
  active: true,
};
const branch = {
  ...row,
  id: "branch-1",
  name: "Atelier Stuttgart",
  legalEntityId: "entity-1",
  city: "Stuttgart",
  stateCode: "BW",
  timezone: "Europe/Berlin",
  accent: "mint",
};
const data = {
  entities: [row],
  branches: [branch],
  locations: [],
  employees: [],
  assignments: [],
  managerOptions: [],
  states: { BW: "Baden-Württemberg" },
  users: [],
  permissions: ["org.write"],
  audit: [],
  managerAssignments: [],
} as unknown as Workspace;
const user: User = {
  id: "admin",
  name: "Alex Morgan",
  email: "admin@atelier.local",
  roles: ["SYSTEM_ADMIN"],
  mfaEnabled: false,
  mfaRequired: true,
  mfaVerified: false,
  legalEntityIds: [],
  branchIds: [],
};
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
});
describe("F01 forms", () => {
  it("creates a branch with explicit legal entity and Berlin timezone", async () => {
    const saved = vi.fn().mockResolvedValue(undefined);
    vi.mocked(api).mockResolvedValue(branch);
    render(
      <EditorModal
        editor={{ kind: "branch" }}
        data={data}
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    const u = userEvent.setup();
    await u.type(
      screen.getByLabelText("Name der Niederlassung"),
      "Atelier Ulm",
    );
    await u.type(screen.getByLabelText("Standortcode"), "UL-06");
    await u.type(screen.getByLabelText("Stadt"), "Ulm");
    await u.selectOptions(screen.getByLabelText("Rechtseinheit"), "entity-1");
    await u.type(
      screen.getByLabelText("Vollständige Adresse"),
      "Münsterplatz 1, Ulm",
    );
    await u.click(screen.getByRole("button", { name: /Änderungen speichern/ }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith(
      "/org/branches",
      "POST",
      expect.objectContaining({
        code: "UL-06",
        legalEntityId: "entity-1",
        timezone: "Europe/Berlin",
        active: true,
      }),
    );
  });
  it("preserves the legal entity when editing a disabled parent selector", async () => {
    vi.mocked(api).mockResolvedValue(branch);
    render(
      <EditorModal
        editor={{ kind: "branch", row: branch }}
        data={data}
        onClose={vi.fn()}
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Änderungen speichern/ }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/org/branches/branch-1",
        "PUT",
        expect.objectContaining({ legalEntityId: "entity-1", version: 0 }),
      ),
    );
  });
  it("keeps the form open and announces a server validation error", async () => {
    vi.mocked(api).mockRejectedValue(
      new Error("Dieser Code ist bereits vergeben."),
    );
    const saved = vi.fn();
    render(
      <EditorModal
        editor={{ kind: "entity", row }}
        data={data}
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Änderungen speichern/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Code ist bereits",
      ),
    );
    expect(saved).not.toHaveBeenCalled();
  });
});
describe("F00 authentication", () => {
  it("submits credentials and passes the pending MFA state to the application", async () => {
    vi.mocked(api).mockResolvedValue(user);
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    const u = userEvent.setup();
    await u.type(
      screen.getByLabelText("E-Mail-Adresse"),
      "admin@atelier.local",
    );
    await u.type(screen.getByLabelText("Passwort"), "Atelier!2026Demo");
    await u.click(screen.getByRole("button", { name: /Zum Arbeitsbereich/ }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
    expect(api).toHaveBeenCalledWith("/auth/login", "POST", {
      email: "admin@atelier.local",
      password: "Atelier!2026Demo",
    });
  });
  it("does not authenticate after a rejected password", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Anmeldung nicht möglich."));
    const done = vi.fn();
    render(<Login onLogin={done} />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("E-Mail-Adresse"), "a@b.de");
    await u.type(screen.getByLabelText("Passwort"), "invalid");
    await u.click(screen.getByRole("button", { name: /Zum Arbeitsbereich/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Anmeldung nicht möglich",
      ),
    );
    expect(done).not.toHaveBeenCalled();
  });
  it("requires a six digit authenticator code before enrollment", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ secret: "TESTSECRET", uri: "otpauth://test" })
      .mockResolvedValueOnce({ ...user, mfaVerified: true, mfaEnabled: true });
    const done = vi.fn();
    render(<MfaGate user={user} onComplete={done} onLogout={vi.fn()} />);
    const u = userEvent.setup();
    await u.click(
      screen.getByRole("button", { name: /Authenticator einrichten/ }),
    );
    await waitFor(() => expect(screen.getByText("TESTSECRET")).toBeTruthy());
    await u.type(screen.getByLabelText("Bestätigungscode"), "123456");
    await u.click(screen.getByRole("button", { name: /Sicher anmelden/ }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(api).toHaveBeenLastCalledWith("/auth/mfa/verify", "POST", {
      code: "123456",
      enroll: true,
    });
  });
});
