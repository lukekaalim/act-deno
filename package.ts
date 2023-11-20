import { build, emptyDir } from "https://deno.land/x/dnt@0.38.1/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "@lukekaalim/act-deno",
    version: Deno.args[0],
    description: "Small component tree builder",
    license: "MIT",
  },
  compilerOptions: {
    lib: ["ES2021", "DOM"],
  },
  postBuild() {
    
  },
});