import { describe, expect, it } from "bun:test";
import { Effect, Layer, Stream } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { AppApi } from "@/api";
import { ApiClient } from "./httpapi-client";
import { HttpApiSpec } from "./httpapi-helpers";
import { HttpApiToolkit, HttpApiToolkitLayer } from "./httpapi-toolkit";

describe("MCP toolkit typed query inputs", () => {
  for (const { name, input, expectedQuery, response } of [
    {
      name: "workouts_summarizeWorkouts",
      input: { query: { days: 7 } },
      expectedQuery: "?days=7",
      response: {
        days: 7,
        workoutCount: 0,
        totalDurationMinutes: 0,
        totalDistanceKilometres: 0,
        totalActiveEnergyKilocalories: 0,
        byActivityType: {},
      },
    },
    {
      name: "workouts_listWorkouts",
      input: { query: { limit: 5, activityType: "Running" } },
      expectedQuery: "?limit=5&activityType=Running",
      response: [],
    },
    {
      name: "workouts_listWorkouts",
      input: {},
      expectedQuery: "",
      response: [],
    },
  ]) {
    it(`transports ${name} with ${JSON.stringify(input)}`, async () => {
      const urls: URL[] = [];
      const http = HttpClient.make((request, url) => {
        urls.push(url);
        return Effect.succeed(
          HttpClientResponse.fromWeb(request, Response.json(response)),
        );
      });
      const specLayer = HttpApiSpec.layer({ api: AppApi, methods: ["get"] });
      const handlers = HttpApiToolkitLayer({}).pipe(
        Layer.provide(specLayer),
        Layer.provide(
          ApiClient.layer({ api: AppApi, baseUrl: "http://localhost" }).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
          ),
        ),
      );
      const results = await Effect.runPromise(
        Effect.gen(function* () {
          const definition = yield* HttpApiToolkit({});
          const toolkit = yield* definition.pipe(Effect.provide(handlers));
          const stream = yield* toolkit.handle(name, input);
          return Array.from(yield* Stream.runCollect(stream));
        }).pipe(Effect.provide(specLayer)),
      );
      expect(results[0]).toMatchObject({ isFailure: false, result: response });
      expect(urls).toHaveLength(1);
      expect(urls[0]?.search).toBe(expectedQuery);
    });
  }
});
