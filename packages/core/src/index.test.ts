import assert from "node:assert/strict";
import { test } from "node:test";
import { add } from "./index.ts";

test("add sums coordinates", () => {
  assert.deepEqual(add({ x: 1, y: 2 }, { x: 3, y: 4 }), { x: 4, y: 6 });
});
