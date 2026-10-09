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
declare module "*charts.js" {
  const content: string;
  export default content;
}
declare module "*timeline.js" {
  const content: string;
  export default content;
}
declare module "*pwa.js" {
  const content: string;
  export default content;
}
declare module "*service-worker.js" {
  const content: string;
  export default content;
}
declare module "*.webmanifest" {
  const content: string;
  export default content;
}
declare module "*.png" {
  const content: string;
  export default content;
}
declare module "*.svg" {
  const content: string;
  export default content;
}
