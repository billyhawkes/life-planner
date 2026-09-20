import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Config, Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { AppLive } from "@/app";

const ServerLive = Layer.unwrap(
  Config.port("PORT").pipe(
    Config.withDefault(3000),
    Effect.map((port) =>
      HttpRouter.serve(AppLive).pipe(
        Layer.provide(BunHttpServer.layer({ port })),
      ),
    ),
  ),
);
Layer.launch(ServerLive).pipe(BunRuntime.runMain);
