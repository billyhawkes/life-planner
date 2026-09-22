import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
import { SqlClient } from "effect/unstable/sql";

import { AppApi } from "@/api";
import { DatabaseLive } from "@/db";
import { mcpLayer } from "@/lib/mcp-handler";
import { Workouts } from "@/services/workouts";
import { workoutsHandler } from "@/services/workouts/api.builder";
import { Habits } from "@/services/habits";
import { habitsHandler } from "@/services/habits/api.builder";
import styles from "../public/styles.css" with { type: "text" };
import datastar from "../public/datastar.js" with { type: "text" };
import openProps from "../public/open-props-1.7.23.min.css" with { type: "text" };
import dialogs from "../public/dialogs.js" with { type: "text" };
import charts from "../public/charts.js" with { type: "text" };

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
    Layer.provide(Layer.merge(workoutsHandler, habitsHandler)),
  ),
  HttpApiScalar.layer(AppApi, { path: "/api/docs" }),
  mcpLayer,
  HttpRouter.add(
    "GET",
    "/styles.css",
    HttpServerResponse.text(styles, { contentType: "text/css" }),
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
    "/charts.js",
    HttpServerResponse.text(charts, { contentType: "text/javascript" }),
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
    Layer.merge(Workouts.baseLayer, Habits.baseLayer).pipe(
      Layer.provideMerge(DatabaseLive),
    ),
  ),
);
