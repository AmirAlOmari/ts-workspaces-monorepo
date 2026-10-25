import assert from "node:assert/strict";
import { test } from "node:test";
import { double } from "./index.ts";

test("double uses @acme/core through the workspace link", () => {
  assert.deepEqual(double({ x: 1, y: 2 }), { x: 2, y: 4 });
});
