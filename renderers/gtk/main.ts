import ref from "ref-napi";
import { readUntilNull } from "./ffi";
import { addNamespace, libgi, repo } from "./lib";
import { NamespaceInfo, readNamespace, writeNamespace } from "./write";
import { generate } from "./codegen";
import { createNamespaceLookups } from "./infos/namespace";


const lib = {
  name: "Gtk",
  ver: "4.0"
}

export const writeMyNamespace = async () => {
  console.log("Starting namespace write");
  addNamespace(lib.name, lib.ver);
  for (const namespace of getAllLoadedNamespaces()) {
    await writeNamespace(namespace);
    console.log(`Finished namespace "${namespace}" write`)
  }
  console.log("Finished all namespace write");
};

export const readMyNamespace = async () => {
  addNamespace(lib.name, lib.ver);
  const allNamespaces = new Map<string, NamespaceInfo>();
  for (const namespace of getAllLoadedNamespaces()) {
    allNamespaces.set(namespace, await readNamespace(namespace))
  }
  const lookup = createNamespaceLookups(allNamespaces)
  for (const [name, info] of allNamespaces) {
    await generate(name, lookup);
  }
}


export const main = async (command = 'write') => {
  switch (command) {
    case 'gen':
      return await readMyNamespace();
    case 'write':
      return await writeMyNamespace();
    case 'deps':
      addNamespace("Gtk", "4.0");
      return console.log(getAllLoadedNamespaces());
    default:
      return console.log(`Unknown command "${command}"`)
  }
}

const getAllLoadedNamespaces = () => {
  const namespacesPointer = libgi.g_irepository_get_loaded_namespaces(repo);
  const namespaceArray = readUntilNull(namespacesPointer.address());

  const namespaces = [] as string[];

  for (let i = 0; i < (namespaceArray.byteLength / 8) - 1; i++) {
    const address = namespaceArray.readUInt64LE(i * 8);
    const stringBuffer = readUntilNull(address, 1);
    const string = ref.readCString(stringBuffer);
    namespaces.push(string);
  }

  return namespaces;
}


main(...process.argv.slice(2))
  .catch(console.error)