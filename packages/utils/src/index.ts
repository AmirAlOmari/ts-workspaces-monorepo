import { add, type Point } from "@acme/core";

export function double(p: Point): Point {
  return add(p, p);
}
