import { ClassDeclaration, ConstructorDeclarationStructure, Project, SourceFile, StringLiteral, StructureKind, VariableDeclaration, VariableDeclarationKind } from 'ts-morph';
import { BaseInfo, FieldInfo, NamespaceInfo, ObjectInfo, StructInfo, TypeInfo, writeNamespace } from './write';
import { baseInfoType, baseInfoTypes, gi, gi_function_info_flag_masks, gi_function_info_flags, gi_type_tag_name, repo } from './lib';

type PromiseOf<T> = T extends Promise<infer X> ? X : never;

export const generate = async (namespace: string, namespaceMap: Map<string, NamespaceInfo>) => {
  const project = new Project();
  const namespaceInfo = namespaceMap.get(namespace) as NamespaceInfo;

  if (!namespaceInfo)
    return;

  const file = project.createSourceFile(
    `./gen/${namespace}.ts`,
    { statements: [] },
    { overwrite: true }
  );

  file.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: 'ffi-napi',
    namedImports: ['Library'],
  });

  for (const [name, info] of namespaceMap) {
    if (info !== namespaceInfo)
      file.addImportDeclaration({
        kind: StructureKind.ImportDeclaration,
        moduleSpecifier: `./${name}.ts`,
        namespaceImport: name,
      });
  }

  const generateInfo = (info: BaseInfo) => {
    switch (info.type) {
      case 'GI_INFO_TYPE_OBJECT':
        return generateObjectInfo(info.object);
      case 'GI_INFO_TYPE_STRUCT':
        return generateStructInfo(info.struct);
      default:
        return;
    }
  }

  const generateObjectInfo = (info: ObjectInfo) => {
    const fileClass = file.addClass({
      isExported: true,
      name: info.name,
    })
    for (const field of info.fields)
      generateFieldInfo(fileClass, field);
    console.log(`Generated Class ${info.name}`);
  }
  const generateStructInfo = (info: StructInfo) => {
    const fileClass = file.addClass({
      isExported: true,
      name: info.name,
    })
    for (const field of info.fields)
      generateFieldInfo(fileClass, field);
    console.log(`Generated Struct ${info.name}`);
  }

  const generateFieldInfo = (fileClass: ClassDeclaration, field: FieldInfo) => {
    fileClass.addProperty({
      kind: StructureKind.Property,
      name: field.name === 'constructor' ? '_constructor' : field.name,
      type: generateTypeReference(field.type)
    });
    console.log(`Generated Field ${field.name} (${generateTypeReference(field.type)})`);
  }

  const generateTypeReference = (type: TypeInfo) => {
    return (type.tagName === 'GI_TYPE_TAG_INTERFACE' && type.namespace !== namespace)
      ? [type.namespace, type.name].join('.')
      : type.name
  }

  for (const info of namespaceInfo.infos) {
    generateInfo(info)
  }

  await file.save();
};

