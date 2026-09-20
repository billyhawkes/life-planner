import { describe, expect, it } from "bun:test";
import { html, patchElements } from "./datastar";

describe("HTML and Datastar boundary", () => {
  it("escapes user content while preserving nested templates", () => {
    const result = html`<main>
      ${[html`<p>${"<script>\"x\" & 'y'</script>"}</p>`]}${false}${null}${0}
    </main>`;
    expect(result.value).toContain(
      "<p>&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;</p>0",
    );
  });

  it("frames multiline HTML without letting user data inject SSE events", () => {
    const result = patchElements(
      html`<section id="result">
        ${"line one\r\n\nevent: fake\ndata: payload"}
      </section>`,
    );
    expect(result).toContain("data: elements event: fake\n");
    expect(result.match(/^event:/gm)).toHaveLength(1);
    expect(result.endsWith("\n\n")).toBe(true);
  });
});
