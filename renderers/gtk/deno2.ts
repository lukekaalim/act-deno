import ffi from 'ffi-napi';
import ref, { alloc } from 'ref-napi';
import struct_di from 'ref-struct-di';

const struct = struct_di(ref);

import { readUntilNull } from './ffi';

const libDir = '/opt/homebrew/lib/'
const libPath = libDir + 'libgirepository-2.0';

export const gi = ffi.Library(libPath, {
  'gi_repository_new': ['pointer', []],
  'gi_repository_require': ['pointer', ['pointer', "CString", "CString", "uint32", "pointer"]],
} as const);

const repo = gi.gi_repository_new();

const errorStruct = struct({
  domain: 'pointer',
  message: "CString",
  code: 'uint32',
});

const errorPointer = alloc('pointer');
errorPointer.writePointer(ref.NULL);
console.log(errorPointer);

const typeLib = gi.gi_repository_require(repo, "Gtk", "4.14", 0, errorPointer);
console.log(errorPointer);

if (typeLib.isNull()) {
  const errorBytes = errorPointer.readPointer(0, errorStruct.size);
  const error = ref.get(errorBytes, 0, errorStruct);
  console.error(error.message);
}

