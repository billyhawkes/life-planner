import {
  healthHandler,
  HealthService,
} from "@krak-stack/registry/service-health";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppApi } from "@/api";
import { mcpLayer } from "@/lib/mcp-handler";
import { workoutsHandler } from "@/services/workouts/api.builder";
import { WorkoutsLive } from "@/services/workouts";
import { DB } from "@/services/database";

const healthLayer = HttpApiBuilder.group(AppApi, "health", healthHandler);

const servicesLayer = Layer.mergeAll(
  WorkoutsLive,
  HealthService.layerWith({
    checks: {
      ready: [
        {
          name: "database",
          check: Effect.gen(function* () {
            const db = yield* DB;
            yield* db.$client`SELECT 1`;
            return HealthService.up();
          }).pipe(Effect.timeout("2 seconds")),
        },
      ],
    },
  }),
).pipe(Layer.provide(DB.layer));

const apiLayer = HttpApiBuilder.layer(AppApi, {
  openapiPath: "/api/openapi.json",
}).pipe(
  Layer.provide(workoutsHandler),
  Layer.provide(healthLayer),
  Layer.provideMerge(servicesLayer),
);

const routes = Layer.mergeAll(apiLayer, mcpLayer).pipe(
  Layer.provide(HttpServer.layerServices),
);

export const { handler: apiHandler } = HttpRouter.toWebHandler(routes, {
  disableLogger: true,
});
