import { html, type Html } from "@/lib/datastar";

export const renderDocument = (body: Html) =>
  html`<!doctype html>${(
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Life Planner</title>
          <link rel="stylesheet" href="/open-props-1.7.23.min.css" />
          <link rel="stylesheet" href="/styles.css" />
          <script type="module" src="/dialogs.js" />
          <script type="module" src="/charts.js" />
          <script type="module" src="/datastar.js" />
        </head>
        <body>{body}</body>
      </html>
    )}`;
