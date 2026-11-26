import { afterEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LeaveView } from "../components/leave";

afterEach(() => vi.unstubAllGlobals());

it("keeps pending days, remaining entitlement and expiry under their respective headers", async () => {
  const request = { employeeId: 7, leaveTypeId: 2, startDate: "2026-06-12", requestedDays: 1.5, status: "PENDING" };
  const balance = {
    balanceId: 1, employeeId: 7, employeeName: "Alex", employeeCode: "E-007", leaveTypeId: 2,
    leaveTypeName: "Jahresurlaub", leaveYear: 2026, entitledDays: 22, carriedDays: 2,
    usedDays: 6, remainingDays: 18, expiryDate: null,
  };
  vi.stubGlobal("fetch", async (url: string) => {
    if (url.includes("/balances?")) return Response.json([balance]);
    if (url.includes("/requests?")) return Response.json([
      request, { ...request, requestedDays: 2 }, { ...request, status: "APPROVED" },
      { ...request, leaveTypeId: 3 }, { ...request, employeeId: 8 }, { ...request, startDate: "2025-06-12" },
    ]);
    return Response.json([]);
  });
  render(<LeaveView canReview canRecord={false} canRequest={false} />);
  const row = await screen.findByRole("row", { name: /Alex/ });
  const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
  const cells = [...row.querySelectorAll("th, td")].map(cell => cell.textContent);
  expect(cells).toHaveLength(headers.length);
  expect(within(row).getByRole("rowheader").textContent).toContain("E-007");
  expect(cells[headers.indexOf("Beantragt")]).toBe("3,5");
  expect(cells[headers.indexOf("Resturlaub")]).toBe("18");
  expect(cells[headers.indexOf("Verfall")]).toBe("—");
});
