# @lukekaalim/act

A react-like library for build UI components.

## Usage

Install via npm:

```
npm i @lukekaalim/act
```

This lets you write components. Import
renderers to use specific elements.

```
npm i @lukekaalim/act-{web,three,terminal,gtk}
```

```ts
import { Component } from '@lukekaalim/act';
import { hs } from '@lukekaalim/act-spider';

const MyComponent: Component<{ name: string }> = ({ name }) => {
  return hs('p', {}, `Hello, ${name}!`);
};
```

Render your application on a web page by connecting
your renderers to a reconciler.
```
npm i @lukekaalim/act-{recon,backstage}
```

```ts
import { multi } from '@lukekaalim/act-backstage';
import { h } from '@lukekaalim/act';
import { createReconciler } from '@lukekaalim/act-recon';
import { spider } from '@lukekaalim/act-spider';
import { finale } from '@lukekaalim/act-finale';


createReconciler(
  h(MyComponent, { name: 'Luke!' }),
  multi([spider(), finale()])
);
```

## Features

Completed tasks and todos.

  - [x] core
    - [x] id
    - [x] hooks
  - [x] recon
    - [x] state
    - [x] context
    - [x] effects
    - [x] element
    - [ ] suspense
  - [ ] renderers
    - [x] HTML
    - [ ] SVG
    - [x] threejs
    - [ ] plastic
    - [ ] GTK
    - [ ] QT
    - [ ] Android
    - [ ] iOS
  - [x] extras
    - [ ] markdown
      - [x] GFM
      - [ ] Frontmatter
      - [ ] TOC
      - [ ] Code Highlighting
    - [ ] doctor