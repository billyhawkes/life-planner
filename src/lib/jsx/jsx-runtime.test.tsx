import { describe, expect, it } from "bun:test";
import type { HtmlValue } from "@/lib/datastar";
import { jsx } from "./jsx-runtime";

describe("server-side TSX", () => {
  it("escapes text and attribute values through components and nested fragments", () => {
    const Panel = ({ children }: { readonly children?: HtmlValue }) => (
      <section>{children}</section>
    );
    const hostile = "<script>\"x\" & 'y'</script>";
    const result = (
      <Panel>
        <>
          <input value={hostile} />
          {[[hostile], false, null, undefined, true, 0]}
        </>
      </Panel>
    );
    expect(result.value).toBe(
      '<section><input value="&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;">&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;0</section>',
    );
  });

  it("keeps HTML booleans distinct from Datastar and ARIA values", () => {
    const result = (
      <input
        required
        disabled={false}
        selected={undefined}
        aria-invalid={false}
        data-show={true}
        data-indicator:saving=""
        data-on:click="@get('/workouts')"
      />
    );
    expect(result.value).toBe(
      '<input required aria-invalid="false" data-show="true" data-indicator:saving="" data-on:click="@get(&#39;/workouts&#39;)">',
    );
  });

  it("preserves SVG names and closes non-void elements", () => {
    const result = (
      <>
        <svg viewBox="0 0 10 10">
          <line stroke-width={2} />
        </svg>
        <script src="/datastar.js" />
      </>
    );
    expect(result.value).toBe(
      '<svg viewBox="0 0 10 10"><line stroke-width="2"></line></svg><script src="/datastar.js"></script>',
    );
  });

  it("rejects malformed spread attributes and unsupported client event handlers", () => {
    expect(() => jsx("div", { 'title" onclick="bad': "value" })).toThrow(
      "Invalid HTML attribute",
    );
    expect(() => jsx("div", { onclick: () => undefined })).toThrow(
      "must be a scalar",
    );
    expect(() => jsx("div><script", {})).toThrow("Invalid HTML tag");
  });
});
