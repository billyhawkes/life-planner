import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiScalar } from "effect/unstable/httpapi";
import { SqlClient } from "effect/unstable/sql";

import { AppApi } from "@/api";
import { DatabaseLive } from "@/db";
import { mcpLayer } from "@/lib/mcp-handler";
import { Workouts } from "@/services/workouts";
import { workoutsHandler } from "@/services/workouts/api.builder";
import styles from "../public/styles.css" with { type: "text" };
import datastar from "../public/datastar.js" with { type: "text" };

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
    Layer.provide(workoutsHandler),
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
  HttpRouter.add("GET", "/api/health", ready),
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
    Workouts.baseLayer.pipe(Layer.provideMerge(DatabaseLive)),
  ),
);
