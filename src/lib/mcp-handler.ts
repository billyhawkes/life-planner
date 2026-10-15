import { Effect, Layer } from "effect";
import { McpProtocol, McpServer } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { HttpApiAdapter } from "@krak-stack/registry/httpapi/adapter";
import { makeHttpApiToolkit } from "@krak-stack/registry/httpapi/toolkit";

import { AppApi } from "@/api";

const adapterLayer = HttpApiAdapter.layer({
  api: AppApi,
  baseUrl:
    process.env.SITE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  methods: ["get", "post", "put", "patch", "delete"],
}).pipe(Layer.provide(FetchHttpClient.layer));

export const mcpLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const { toolkit, handlers } = yield* makeHttpApiToolkit({
      toolMetaKey: "training-ledger/httpapi",
    });
    yield* McpServer.registerToolkit(toolkit).pipe(Effect.provide(handlers));
  }),
).pipe(
  Layer.provideMerge(
    McpServer.layerHttp({
      name: "training-ledger",
      version: "1.0.0",
      path: "/api/mcp",
      protocols: [McpProtocol.v2025_11_25],
    }),
  ),
  Layer.provide(adapterLayer),
);
