import { expect, test, vi } from "vitest";
import { double } from "./index.ts";

test("double uses @acme/core through the workspace link", () => {
  expect(double({ x: 1, y: 2 })).toEqual({ x: 2, y: 4 });
});

test("module mocks replace a workspace dependency", async () => {
  vi.resetModules();
  vi.doMock("@acme/core", () => ({ add: vi.fn(() => ({ x: 0, y: 0 })) }));
  const { double: mocked } = await import("./index.ts");
  expect(mocked({ x: 1, y: 2 })).toMatchInlineSnapshot(`
    {
      "x": 0,
      "y": 0,
    }
  `);
  vi.doUnmock("@acme/core");
});
