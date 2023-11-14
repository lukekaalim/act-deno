export class MagicError extends Error {
  constructor() {
    super(`Additional magic is needed to be able to run this function`);
  }
}


const unsetHookText =
`
A hook was run, but it didnt have any implementations set up for it.

This error might be caused by manually calling a component function
(or a hook directly) outside of act, or by multiple copies of
Act in a project at once!

The renderer is supposed to set up implementation for each hook before
it runs the component.

Check the location of this error, and which version of act your
renderer uses internaly. You might get this error if those are two
different packages!
`.trim();

export class UnsetHookImplementation extends Error {
  constructor() {
    super(unsetHookText);
  }
}


const unknownElementText =
`
Encountered an object that is not any of the expected node types, like
string, number, boolean, array, null, or the result of a call to createElement.

Maybe something was accidentally returned from a Component, or was passed
as a child to an element?
`.trim();
export class UnknownElementType extends Error {
  constructor() {
    super(unknownElementText)
  }
}