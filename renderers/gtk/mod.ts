import ref from "ref-napi";
import { readUntilNull } from "./ffi";
import { addNamespace, libgi, repo } from "./lib";
import { writeNamspace } from "./write";

console.log("Starting namespace write");

addNamespace("Gtk", "4.0");
addNamespace("GLib", "2.0");

const namespaces = libgi.g_irepository_get_loaded_namespaces(repo);


const namespaceArray = readUntilNull(namespaces.address());

for (let i = 0; i < (namespaceArray.byteLength / 8) - 1; i++) {
  const address = namespaceArray.readUInt64LE(i * 8);
  const stringBuffer = readUntilNull(address, 1);
  const string = ref.readCString(stringBuffer);

  await writeNamspace(string);
}

console.log('DONE');