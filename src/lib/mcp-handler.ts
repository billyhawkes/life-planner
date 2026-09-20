import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { AppApi } from "@/api";
import { ApiClient } from "@/lib/httpapi-client";
import {
  HttpApiMcp,
  httpApiMcpServerLayer,
  httpApiMcpToolsLayer,
} from "@/lib/httpapi-mcp";
import { HttpApiSpec } from "@/lib/httpapi-helpers";

const httpApiLayer = Layer.mergeAll(
  HttpApiSpec.layer({ api: AppApi, methods: ["get"] }),
  ApiClient.layer({
    api: AppApi,
    baseUrl:
      process.env.SITE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  }).pipe(Layer.provide(FetchHttpClient.layer)),
);

const toolsLayer = httpApiMcpToolsLayer.pipe(
  Layer.provide(HttpApiMcp.layer({ toolMetaKey: "training-ledger/httpapi" })),
);

export const mcpLayer = toolsLayer.pipe(
  Layer.provideMerge(httpApiMcpServerLayer("/api/mcp")),
  Layer.provide(httpApiLayer),
);
