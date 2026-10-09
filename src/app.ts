import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api";
import { SqlClient } from "effect/sql";
import { readFile } from "node:fs/promises";

import { AppApi } from "@/api";
import { DatabaseLive } from "@/db";
import { mcpLayer } from "@/lib/mcp-handler";
import { styles, timeline as timelineScript } from "@/lib/static-assets";
import { Workouts } from "@/services/workouts";
import { workoutsHandler } from "@/services/workouts/api.builder";
import { Habits } from "@/services/habits";
import { habitsHandler } from "@/services/habits/api.builder";
import { Timeline } from "@/services/timeline";
import { timelineHandler } from "@/services/timeline/api.builder";
import datastar from "../public/datastar.js" with { type: "text" };
import openProps from "../public/open-props-1.7.23.min.css" with { type: "text" };
import dialogs from "../public/dialogs.js" with { type: "text" };
import charts from "../public/charts.js" with { type: "text" };
import icon180 from "../public/icon-180.png" with { type: "file" };
import icon192 from "../public/icon-192.png" with { type: "file" };
import icon512 from "../public/icon-512.png" with { type: "file" };
import manifest from "../public/manifest.webmanifest" with { type: "text" };
import pwa from "../public/pwa.js" with { type: "text" };
import serviceWorker from "../public/service-worker.js" with { type: "text" };

const [icon180Bytes, icon192Bytes, icon512Bytes] = await Promise.all(
  [icon180, icon192, icon512].map((path) =>
    readFile(new URL(path, import.meta.url)),
  ),
);

const ready = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`SELECT 1`;
  return HttpServerResponse.jsonUnsafe({ status: "up" });
}).pipe(
  Effect.timeout("2 seconds"),
  Effect.catch(() =>
    Effect.succeed(
      HttpServerResponse.jsonUnsafe({ status: "down" }, { status: 503 }),
    ),
  ),
);

export const applicationRoutes = Layer.mergeAll(
  HttpApiBuilder.layer(AppApi, { openapiPath: "/api/openapi.json" }).pipe(
    Layer.provide(
      Layer.mergeAll(workoutsHandler, habitsHandler, timelineHandler),
    ),
  ),
  HttpApiScalar.layer(AppApi, { path: "/api/docs" }),
  mcpLayer,
  HttpRouter.add(
    "GET",
    "/styles.css",
    HttpServerResponse.text(styles, {
      contentType: "text/css",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }),
  ),
  HttpRouter.add(
    "GET",
    "/datastar.js",
    HttpServerResponse.text(datastar, { contentType: "text/javascript" }),
  ),
  HttpRouter.add(
    "GET",
    "/open-props-1.7.23.min.css",
    HttpServerResponse.text(openProps, { contentType: "text/css" }),
  ),
  HttpRouter.add(
    "GET",
    "/dialogs.js",
    HttpServerResponse.text(dialogs, { contentType: "text/javascript" }),
  ),
  HttpRouter.add("GET", "/api/health", ready),
  HttpRouter.add(
    "GET",
    "/timeline.js",
    HttpServerResponse.text(timelineScript, { contentType: "text/javascript" }),
  ),
  HttpRouter.add(
    "GET",
    "/charts.js",
    HttpServerResponse.text(charts, { contentType: "text/javascript" }),
  ),
  HttpRouter.add(
    "GET",
    "/manifest.webmanifest",
    HttpServerResponse.text(manifest, {
      contentType: "application/manifest+json",
      headers: { "Cache-Control": "public, max-age=3600" },
    }),
  ),
  HttpRouter.add(
    "GET",
    "/pwa.js",
    HttpServerResponse.text(pwa, { contentType: "text/javascript" }),
  ),
  HttpRouter.add(
    "GET",
    "/service-worker.js",
    HttpServerResponse.text(serviceWorker, {
      contentType: "text/javascript",
      headers: {
        "Cache-Control": "no-cache",
        "Service-Worker-Allowed": "/",
      },
    }),
  ),
  HttpRouter.add(
    "GET",
    "/icon-180.png",
    HttpServerResponse.uint8Array(icon180Bytes, {
      contentType: "image/png",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }),
  ),
  HttpRouter.add(
    "GET",
    "/icon-192.png",
    HttpServerResponse.uint8Array(icon192Bytes, {
      contentType: "image/png",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }),
  ),
  HttpRouter.add(
    "GET",
    "/icon-512.png",
    HttpServerResponse.uint8Array(icon512Bytes, {
      contentType: "image/png",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }),
  ),
  HttpRouter.add("GET", "/api/health/ready", ready),
  HttpRouter.add(
    "GET",
    "/api/health/live",
    HttpServerResponse.jsonUnsafe({ status: "up" }),
  ),
  HttpRouter.add(
    "GET",
    "/api/health/startup",
    HttpServerResponse.jsonUnsafe({ status: "up" }),
  ),
);

export const AppLive = applicationRoutes.pipe(
  HttpRouter.provideRequest(
    Layer.mergeAll(
      Workouts.baseLayer,
      Habits.baseLayer,
      Timeline.baseLayer,
    ).pipe(Layer.provideMerge(DatabaseLive)),
  ),
);
