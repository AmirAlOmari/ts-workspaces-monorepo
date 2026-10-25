import { expect, test } from "vite-plus/test";
import { double } from "./index.ts";

test("double uses @acme/core through the workspace link", () => {
  expect(double({ x: 1, y: 2 })).toEqual({ x: 2, y: 4 });
});
