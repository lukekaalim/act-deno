import { assertEquals } from "https://deno.land/std@0.204.0/assert/mod.ts";
import { calculateChangedElements } from "../mod.ts";

Deno.test("calculateChangedElements() array reorder", () => {
  const changes = calculateChangedElements(
    ["A", "B", "C"],
    ["b", "c", "a"],
    (left, right) => left.toLowerCase() === right
  );

  assertEquals(changes.nextToPrev, [1, 2, 0], "Array reordered")
  assertEquals(changes.created, [], "No elements created")
  assertEquals(changes.removed, [], "No elements removed")
});

Deno.test("calculateChangedElements() array create", () => {
  const changes = calculateChangedElements(
    ["A", "B"],
    ["a", "b", "c"],
    (left, right) => left.toLowerCase() === right
  );

  assertEquals(changes.nextToPrev, [0, 1, -1], "New element has -1 prev index")
  assertEquals(changes.created, [2], "'C' created")
  assertEquals(changes.removed, [], "No elements removed")
});

Deno.test("calculateChangedElements() array delete", () => {
  const changes = calculateChangedElements(
    ["A", "B", "C", "D"],
    ["a", "b", "c"],
    (left, right) => left.toLowerCase() === right
  );

  assertEquals(changes.nextToPrev, [0, 1, 2], "Next array only has remaining entries")
  assertEquals(changes.created, [], "No elements created")
  assertEquals(changes.removed, [3], "Last element removed")
});
