import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { AppLive } from "@/app";

process.env.TZ ??= "America/New_York";

const ServerLive = Layer.unwrap(
  Config.Port("PORT").pipe(
    Config.withDefault(3000),
    Effect.map((port) =>
      HttpRouter.serve(AppLive).pipe(
        Layer.provide(
          BunHttpServer.layer({
            port,
            maxRequestBodySize: 2 * 1024 ** 3 + 1024 ** 2,
            idleTimeout: 0,
          }),
        ),
      ),
    ),
  ),
);
Layer.launch(ServerLive).pipe(BunRuntime.runMain);
