import { ClassDeclaration, ConstructorDeclarationStructure, Project, SourceFile, StringLiteral, StructureKind, VariableDeclaration, VariableDeclarationKind } from 'ts-morph';
import { BaseInfo, FieldInfo, NamespaceInfo, ObjectInfo, StructInfo, TypeInfo, writeNamespace } from './write';
import { baseInfoType, baseInfoTypes, gi, gi_function_info_flag_masks, gi_function_info_flags, gi_type_tag_name, repo } from './lib';
import ts from 'typescript';
import { createFFILibraryNode } from './generation/ffiLibrary';
import { createGObjectStructNode } from './generation/gobjectStruct';
import { createGObjectNode } from './generation/gobjectObject';

import ts from 'typescript';

export const generate = async (namespace: string, namespaceMap: Map<string, NamespaceInfo>) => {
  console.log('Start')
  const project = new Project();
  const printer = ts.createPrinter();
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
  file.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    moduleSpecifier: 'ref-napi',
    defaultImport: 'ref',
  });

  for (const [name, info] of namespaceMap) {
    if (info !== namespaceInfo)
      file.addImportDeclaration({
        kind: StructureKind.ImportDeclaration,
        moduleSpecifier: `./${name}.ts`,
        namespaceImport: name,
      });
  }

  const libraryNode = createFFILibraryNode(namespaceInfo);

  if (libraryNode) {
    file.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [{
        name: namespace,
        initializer: printer.printNode(ts.EmitHint.Expression, libraryNode, file.compilerNode),
      }]
    })
    const objects: ObjectInfo[] = [];
    const structures: StructInfo[] = [];
  
    for (const info of namespaceInfo.infos) {
      if (info.type === 'GI_INFO_TYPE_OBJECT')
        objects.push(info.object)
      else if (info.type === 'GI_INFO_TYPE_STRUCT')
        structures.push(info.struct)
    }

    for (const struct of structures) {
      file.addStatements([
        printer.printNode(ts.EmitHint.Unspecified, createGObjectStructNode(namespace, struct), file.compilerNode)
      ])
    }
    for (const object of objects) {
      file.addStatements([
        printer.printNode(ts.EmitHint.Unspecified, createGObjectNode(namespace, object), file.compilerNode)
      ])
    }
  }
  

  await file.save();
};

