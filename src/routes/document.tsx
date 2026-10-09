import { html, type Html } from "@/lib/datastar";
import { stylesUrl, timelineUrl } from "@/lib/static-assets";

export const renderDocument = (body: Html) =>
  html`<!doctype html>${(
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#15803d" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="Life Planner" />
          <title>Life Planner</title>
          <link
            rel="icon"
            type="image/png"
            sizes="192x192"
            href="/icon-192.png"
          />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="icon" type="image/svg+xml" href="/icon.svg" />
          <link rel="apple-touch-icon" href="/icon-180.png" />
          <link rel="stylesheet" href="/open-props-1.7.23.min.css" />
          <link rel="stylesheet" href={stylesUrl} />
          <script type="module" src="/dialogs.js" />
          <script type="module" src="/charts.js" />
          <script type="module" src={timelineUrl} />
          <script type="module" src="/datastar.js" />
          {process.env.NODE_ENV === "production" ? (
            <script type="module" src="/pwa.js" />
          ) : null}
        </head>
        <body>{body}</body>
      </html>
    )}`;
