import { expect, test } from "vitest";
import { add } from "./index.ts";

test("add sums coordinates", () => {
  expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
});
