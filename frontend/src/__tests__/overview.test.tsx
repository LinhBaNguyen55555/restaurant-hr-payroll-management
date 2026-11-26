import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BranchList, Overview, SodModal } from "../components/workspace";
import { workspaceKind } from "../components/role-home";
import type { Branch, Workspace } from "../lib/api";

afterEach(() => vi.unstubAllGlobals());

const row = { version: 0, createdAt: "2024-01-01T00:00:00Z" };
const branch: Branch = {
  ...row,
  id: "north",
  name: "Atelier Nord",
  code: "N01",
  legalEntityId: "e1",
  city: "Berlin",
  address: "Markt 1",
  stateCode: "BE",
  timezone: "Europe/Berlin",
  active: true,
  accent: "mint",
};
const assignment = {
  ...row,
  id: "a1",
  branchId: "north",
  employeeId: "p1",
  validFrom: "2020-01-01",
  validTo: null,
  workLocationId: "w1",
  kind: "REGULAR",
  reason: "",
};
const workspace: Workspace = {
  user: {
    id: "u",
    name: "Test",
    email: "",
    roles: ["SYSTEM_ADMIN"],
    mfaEnabled: false,
    mfaRequired: false,
    mfaVerified: false,
    legalEntityIds: [],
    branchIds: [],
  },
  permissions: ["org.read", "workforce.read"],
  entities: [],
  locations: [],
  users: [],
  audit: [],
  employees: [],
  states: { BE: "Berlin" },
  managerOptions: [{ id: "m1", name: "Alex Weber" }],
  branches: [
    branch,
    { ...branch, id: "east", name: "Atelier Ost", code: "O02" },
    { ...branch, id: "west", name: "Atelier West", code: "W03", active: false },
  ],
  assignments: [assignment, { ...assignment, id: "a2" }],
  managerAssignments: [
    { ...assignment, managerId: "m1" },
    {
      ...assignment,
      id: "m2",
      managerId: "m1",
      branchId: "east",
      validTo: "2021-01-01",
    },
  ],
};

describe("workspace selection", () => {
  it("uses the active kitchen posting and gives a management role its own workspace", () => {
    const staff: Workspace = {
      ...workspace,
      user: { ...workspace.user, roles: ["EMPLOYEE"] },
      permissions: ["schedule.read"],
    };
    expect(workspaceKind(staff)).toBe("employee");
    const kitchen = {
      ...staff,
      selfPostings: [{ branchId: branch.id, branchName: branch.name, positionCode: "KITCHEN" }],
    };
    expect(workspaceKind(kitchen)).toBe("kitchen");
    expect(workspaceKind({ ...kitchen, user: { ...staff.user, roles: ["RESTAURANT_MANAGER"] } })).toBe("manager");
    expect(workspaceKind(workspace)).toBe("admin");
  });
});

describe("admin overview", () => {
  it("displays the server's current grants when comparing roles", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const fetchMatrix = vi.fn().mockResolvedValue(Response.json({
      rolePermissions: {
        SYSTEM_ADMIN: ["iam.write", "org.read"],
        EMPLOYEE: ["schedule.read"],
      },
    }));
    vi.stubGlobal("fetch", fetchMatrix);
    render(<SodModal open onClose={vi.fn()} data={workspace} />);
    await userEvent.click(screen.getByRole("button", { name: "Rechtematrix" }));
    const select = await screen.findByLabelText("Rolle auswählen");
    await userEvent.selectOptions(select, "EMPLOYEE");
    expect(within(screen.getByRole("row", { name: /Dienstplan lesen/ })).getByText("Ja")).toBeTruthy();
    expect(within(screen.getByRole("row", { name: /Konten verwalten/ })).getByText("Nein")).toBeTruthy();
    await userEvent.selectOptions(select, "");
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(fetchMatrix.mock.calls[0][0]).toBe("/api/v1/iam/sod-matrix");
  });

  it("shows current assignments, filters active branches needing a lead and opens a branch", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    render(<Overview data={workspace} navigate={vi.fn()} onBranch={open} />);
    const north = screen.getByRole("row", { name: /Atelier Nord/ });
    expect(
      within(north).getByRole("cell", { name: "Alex Weber" }),
    ).toBeTruthy();
    expect(within(north).getByRole("cell", { name: "1" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Leitung fehlt 1/ }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Atelier Ost" }));
    expect(open).toHaveBeenCalledWith("east");
    await user.type(screen.getByRole("searchbox"), "N01");
    expect(screen.getByText("Keine passenden Niederlassungen")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Filter zurücksetzen" }),
    );
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("only shows metrics and actions within the current user's scope", async () => {
    const navigate = vi.fn();
    const { rerender } = render(
      <Overview
        data={{ ...workspace, permissions: ["org.read"] }}
        navigate={navigate}
        onBranch={vi.fn()}
      />,
    );
    expect(screen.queryByText("Zugeordnete Mitarbeitende")).toBeNull();
    expect(screen.queryByText("Letzte Aktivitäten")).toBeNull();
    rerender(
      <Overview
        data={{ ...workspace, permissions: [] }}
        navigate={navigate}
        onBranch={vi.fn()}
      />,
    );
    expect(screen.queryByRole("table")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Zeiterfassung" }),
    );
    expect(navigate).toHaveBeenCalledWith("attendance");
  });

  it("opens the branch directory as a table and keeps search active when switching views", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();
    render(<BranchList data={workspace} onBranch={vi.fn()} onEdit={vi.fn()} />);
    expect(
      screen
        .getByRole("button", { name: "Listenansicht" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await user.type(screen.getByLabelText("Niederlassungen suchen"), "N01");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Rasteransicht" }));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Atelier Nord")).toBeTruthy();
    expect(screen.queryByText("Atelier Ost")).toBeNull();
  });
});
