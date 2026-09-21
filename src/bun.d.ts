// Bun 1.4 exposes XML before the published bun-types package includes it.
declare namespace Bun {
  namespace XML {
    function parse(input: string): unknown;
  }
}

declare module "*.css" {
  const content: string;
  export default content;
}
declare module "*datastar.js" {
  const content: string;
  export default content;
}
declare module "*dialogs.js" {
  const content: string;
  export default content;
}
