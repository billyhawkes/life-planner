import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Console, Effect, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { Workouts } from "@/services/workouts";
import {
  WorkoutDataError,
  WorkoutIndex,
  type Workout,
} from "@/services/workouts/schema";
import { parseWorkout, workoutBlocks } from "./health-xml";

const archivePath = process.argv[2] ?? "export.zip";
const exportEntry = "apple_health_export/export.xml";
const importWorkouts = Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const child = yield* spawner.spawn(
    ChildProcess.make("unzip", ["-p", archivePath, exportEntry]),
  );
  const workouts: Array<Workout> = [];
  const decoder = new TextDecoder();
  const blocks = workoutBlocks();
  const consume = (chunk: string, final = false) =>
    Effect.gen(function* () {
      const extracted = yield* Effect.try({
        try: () => blocks(chunk, final),
        catch: (cause) =>
          new WorkoutDataError({
            message: "Incomplete Apple Health export",
            cause,
          }),
      });
      for (const xml of extracted) workouts.push(yield* parseWorkout(xml));
    });
  yield* child.stdout.pipe(
    Stream.runForEach((chunk) =>
      consume(decoder.decode(chunk, { stream: true })),
    ),
  );
  yield* consume(decoder.decode(), true);
  const exitCode = yield* child.exitCode;
  if (exitCode !== ChildProcessSpawner.ExitCode(0))
    return yield* new WorkoutDataError({
      message: `Could not read ${exportEntry} from ${archivePath}`,
    });
  const validated = yield* Schema.decodeUnknownEffect(WorkoutIndex)(workouts);
  const service = yield* Workouts;
  const imported = yield* service.import(validated);
  yield* Console.log(`Imported ${imported} workouts into the local database`);
}).pipe(
  Effect.scoped,
  Effect.provide(Workouts.layer),
  Effect.provide(BunServices.layer),
);

BunRuntime.runMain(importWorkouts);
