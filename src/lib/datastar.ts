const htmlType = Symbol("Html");
export type Html = { readonly [htmlType]: true; readonly value: string };
export type HtmlValue =
  | Html
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<HtmlValue>;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const renderValue = (value: HtmlValue): string => {
  if (Array.isArray(value)) return value.map(renderValue).join("");
  if (value === null || value === undefined || typeof value === "boolean")
    return "";
  if (typeof value === "object" && htmlType in value) return value.value;
  return escapeHtml(String(value));
};
export const html = (
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<HtmlValue>
): Html => ({
  [htmlType]: true,
  value: strings.reduce(
    (output, part, index) => output + part + renderValue(values[index]),
    "",
  ),
});
export const patchElements = (
  elements: Html,
  mode: "outer" | "replace" = "outer",
) =>
  `event: datastar-patch-elements\ndata: mode ${mode}\n${elements.value
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => `data: elements ${line}\n`)
    .join("")}\n`;
