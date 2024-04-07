import { ClassDeclaration, ConstructorDeclarationStructure, Project, SourceFile, StringLiteral, StructureKind, VariableDeclaration, VariableDeclarationKind } from 'ts-morph';
import { BaseInfo, FieldInfo, NamespaceInfo, StructInfo, TypeInfo, writeNamespace } from './write';
import { baseInfoType, baseInfoTypes, gi, gi_function_info_flag_masks, gi_function_info_flags, gi_type_tag_name, repo } from './lib';
import ts from 'typescript';
import { createFFILibraryNode } from './generation/ffiLibrary';
import { createGObjectStructNode } from './generation/gobjectStruct';
import { createGObjectNode } from './generation/gobjectObject';
import { NamespaceLookup, NamespaceMap, createNamespaceTypeProvider } from './infos/namespace';
import { createFunctionNode } from './generation/gFunction';

export const generate = async (namespace: string, namespaceMap: NamespaceMap) => {
  console.log(`Start ${namespace}`)
  const project = new Project();
  const printer = ts.createPrinter();
  const namespaceInfo = namespaceMap.get(namespace) as NamespaceLookup;

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

  console.log('Writing Imports');
  for (const [name, info] of namespaceMap) {
    if (info.name !== namespaceInfo.name)
      file.addImportDeclaration({
        kind: StructureKind.ImportDeclaration,
        moduleSpecifier: `./${name}.ts`,
        namespaceImport: name,
      });
  }

  const types = createNamespaceTypeProvider(namespaceMap)
  const libraryNode = createFFILibraryNode(namespaceInfo, types);

  if (libraryNode) {
    console.log("Writing Library");
    file.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [{
        name: namespace,
        initializer: printer.printNode(ts.EmitHint.Expression, libraryNode, file.compilerNode),
      }]
    })

    console.log(`Writing ${namespaceInfo.structs.length} Structs`);
    for (const struct of namespaceInfo.structs) {
      file.addStatements([
        printer.printNode(ts.EmitHint.Unspecified, createGObjectStructNode(namespace, struct, types), file.compilerNode)
      ])
    }
    file.appendWhitespace('\n\n');
    console.log(`Writing ${namespaceInfo.objects.length} Objects`);
    const unWrittenObjects = new Set(namespaceInfo.objects);
    const writtenObjects = new Set<string>();

    while (unWrittenObjects.size > 0) {
      const writableObjects = [...unWrittenObjects].filter(o => {
        if (!o.parent)
          return true;
        if (o.parent.namespace !== namespace)
          return true;
        return writtenObjects.has(o.parent.name)
      })
      for (const object of writableObjects) {
        unWrittenObjects.delete(object);
        file.addStatements([
          printer.printNode(ts.EmitHint.Unspecified, createGObjectNode(namespace, object, types), file.compilerNode)
        ])
        writtenObjects.add(object.name);
      }
    }
    
    file.appendWhitespace('\n\n');
    console.log(`Writing ${namespaceInfo.functions.length} Functions`);
    for (const functionInfo of namespaceInfo.functions) {
      file.addStatements([
        printer.printNode(ts.EmitHint.Unspecified, createFunctionNode(namespace, functionInfo, types), file.compilerNode)
      ])
    }
  }
  

  await file.save();
  console.log('Done');
};

