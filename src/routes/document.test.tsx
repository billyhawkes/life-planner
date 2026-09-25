import { describe, expect, it } from "bun:test";

import { html } from "@/lib/datastar";
import { stylesUrl } from "@/lib/static-assets";
import { renderDocument } from "./document";

describe("renderDocument", () => {
  it("fingerprints the application stylesheet", () => {
    const document = renderDocument(html`<main>Planner</main>`).value;

    expect(stylesUrl).toMatch(/^\/styles\.css\?v=[a-z0-9]+$/);
    expect(document).toContain(`href="${stylesUrl}"`);
  });
});
