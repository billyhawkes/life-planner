import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiMcp } from "@krak-stack/registry/httpapi/mcp";

import { AppApi } from "@/api";

export const mcpLayer = HttpApiMcp.layerHttp({
  api: AppApi,
  path: "/api/mcp",
  baseUrl:
    process.env.SITE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  methods: ["get"],
  toolMetaKey: "training-ledger/httpapi",
}).pipe(Layer.provide(FetchHttpClient.layer));
