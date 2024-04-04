import { Rand } from "./gen/GLib";

try {
  console.log("ABOUT TO CREATE RAND RAND");
  const r = Rand.new();
  console.log("CALLED RAND INT");

  console.log("RAND:", r.int());
} catch (error) {
  console.error(error);
}