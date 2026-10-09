import { describe, expect, it } from "bun:test";

import { html } from "@/lib/datastar";
import { stylesUrl, timelineUrl } from "@/lib/static-assets";
import { renderDocument } from "./document";

describe("renderDocument", () => {
  it("preloads the self-hosted Open Sans font", () => {
    expect(renderDocument(html`<main>Planner</main>`).value).toContain(
      'rel="preload" href="/open-sans-latin.woff2" as="font" type="font/woff2" crossorigin="anonymous"',
    );
  });
  it("loads fingerprinted calendar drag interactions", () => {
    expect(timelineUrl).toMatch(/^\/timeline\.js\?v=[a-z0-9]+$/);
    expect(renderDocument(html`<main>Planner</main>`).value).toContain(
      `src="${timelineUrl}"`,
    );
  });
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
  });

  it("uses the existing app icon as the favicon", () => {
    expect(renderDocument(html`<main>Planner</main>`).value).toContain(
      'rel="icon" type="image/svg+xml" href="/icon.svg"',
    );
    expect(renderDocument(html`<main>Planner</main>`).value).toContain(
      'rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"',
    );
  });

  it("registers the service worker only in production", () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "development";
      expect(renderDocument(html`<main>Planner</main>`).value).not.toContain(
        'src="/pwa.js"',
      );

      process.env.NODE_ENV = "production";
      expect(renderDocument(html`<main>Planner</main>`).value).toContain(
        'src="/pwa.js"',
      );
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});
