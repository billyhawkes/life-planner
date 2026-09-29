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

  it("includes progressive web app metadata", () => {
    const document = renderDocument(html`<main>Planner</main>`).value;

    expect(document).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(document).toContain('rel="apple-touch-icon" href="/icon-180.png"');
    expect(document).toContain('name="theme-color" content="#15803d"');
    expect(document).toContain('src="/pwa.js"');
  });
});
