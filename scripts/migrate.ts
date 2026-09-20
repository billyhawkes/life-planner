import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";
import { DatabaseLive } from "@/db";

Effect.log("Database migrations complete").pipe(
  Effect.provide(DatabaseLive),
  BunRuntime.runMain,
);
