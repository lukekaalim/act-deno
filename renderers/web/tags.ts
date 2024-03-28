export const htmlTagNames = new Set([
  "div", "span",
  "img", "picture", "canvas",
  "details", "summary", "section",
  "video", "audio",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "hl",
  'p',
  "ol", "ul", "li",
  "table", 'td', 'tr', 'th',
  "pre",

  'article', 'code', 'a',

  "form", "input", "label", "button", "select", "textarea",
] as const);
export const svgTagName = new Set([
  "svg",
  "line",
  "path",
  "polyline",
  "circle",
  "rect",
  "g",
  "text",
] as const);

type SetValue<T extends Set<string>> = T extends Set<infer X> ? X : never;

export type HTMLTagName = SetValue<typeof htmlTagNames>;
export type SVGTagName = SetValue<typeof svgTagName>;