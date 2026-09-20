import { html, type Html, type HtmlValue } from "@/lib/datastar";

type Attributes = { readonly [name: string]: HtmlValue };

export namespace JSX {
  export type Element = Html;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicAttributes {
    key?: string | number;
  }
  export interface IntrinsicElements {
    [tag: string]: Attributes;
  }
}

const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const booleanAttributes = new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
]);

export const Fragment = ({
  children,
}: {
  readonly children?: HtmlValue;
}): Html => html`${children}`;

// Bun compiles TSX directly to these calls; elements are HTML, not a client-side tree.
export const jsx = <P extends object>(
  tag: string | ((props: P) => Html),
  props: P,
): Html => {
  if (typeof tag === "function") return tag(props);
  if (!/^[a-zA-Z][a-zA-Z0-9:-]*$/.test(tag))
    throw new TypeError("Invalid HTML tag");
  const attributes: Array<Html> = [];
  let children: HtmlValue;
  for (const [name, value] of Object.entries(props)) {
    if (name === "children") {
      children = value;
      continue;
    }
    if (name === "key" || value === null || value === undefined) continue;
    if (!/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(name))
      throw new TypeError("Invalid HTML attribute");
    if (booleanAttributes.has(name)) {
      if (value) attributes.push(html` ${name}`);
    } else if (["string", "number", "boolean"].includes(typeof value)) {
      attributes.push(html` ${name}="${String(value)}"`);
    } else {
      throw new TypeError(`HTML attribute ${name} must be a scalar value`);
    }
  }
  return voidElements.has(tag)
    ? html`<${tag}${attributes}>`
    : html`<${tag}${attributes}>${children}</${tag}>`;
};

export const jsxs = jsx;
