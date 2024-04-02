import ref from "ref-napi";
import { baseInfoTypes, g_error, g_error_pointer2, g_repo_struct, libgi, repo } from "./lib";

import { writeFile } from 'node:fs/promises';

export const writeNamspace = async (namespace: string) => {
  var errorPointer = ref.alloc(g_error_pointer2);
  errorPointer.writePointer(ref.NULL, 0);

  const error = errorPointer.readPointer(0, g_error.size);

  if (!error.isNull()) {
    console.error(ref.get(error, 0, g_error).message);
    process.exit();
  }

  const infoCount = libgi.g_irepository_get_n_infos(repo, namespace);
  const infos = [];
  
  for (let i = 0; i < infoCount; i++) {
    const info = libgi.g_irepository_get_info(repo, namespace, i);
    infos.push(info);
  }  

  await writeFile(`out/${namespace}.json`, JSON.stringify(Object.fromEntries(infos.map(info => {
    const data = {
      type: baseInfoTypes[libgi.g_base_info_get_type(info)],
      name: libgi.g_base_info_get_name(info),
    }

    return [data.name, data];
  })), null, 2));
  console.log(`Written to out/${namespace}.json`);
}