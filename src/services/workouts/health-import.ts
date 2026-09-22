import { Effect, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { parseWorkout, workoutBlocks } from "./health-xml";
import { WorkoutDataError, WorkoutIndex, type Workout } from "./schema";

export const readHealthArchive = Effect.fn("Workouts.readHealthArchive")(
  function* ({ path }: { readonly path: string }) {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const child = yield* spawner.spawn(
      ChildProcess.make(
        "unzip",
        ["-p", path, "apple_health_export/export.xml"],
        {
          stderr: "ignore",
        },
      ),
    );
    const workouts: Array<Workout> = [];
    const decoder = new TextDecoder();
    const blocks = workoutBlocks();
    const consume = Effect.fn("Workouts.consumeHealthXml")(function* (
      chunk: string,
      final = false,
    ) {
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
    if ((yield* child.exitCode) !== ChildProcessSpawner.ExitCode(0))
      return yield* new WorkoutDataError({
        message:
          "Choose an Apple Health ZIP containing apple_health_export/export.xml.",
      });
    return yield* Schema.decodeUnknownEffect(WorkoutIndex)(workouts);
  },
  Effect.scoped,
  Effect.mapError(
    (cause) =>
      new WorkoutDataError({
        message:
          "Could not read the Apple Health archive. Choose a valid export ZIP and try again.",
        cause,
      }),
  ),
);
