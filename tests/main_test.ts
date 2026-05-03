import { assertEquals } from "@std/assert";
import { add } from "../src/server.ts";

Deno.test("add test", () => {
  assertEquals(add(2, 3), 5);
});
