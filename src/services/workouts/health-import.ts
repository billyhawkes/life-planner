import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { file } from "bun";
import { Effect, Schema } from "effect";
import { parseWorkout, workoutBlocks } from "./health-xml";
import { WorkoutDataError, WorkoutIndex, type Workout } from "./schema";

export const readHealthArchive = Effect.fn("Workouts.readHealthArchive")(
  function* ({ path }: { readonly path: string }) {
    const reader = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new ZipReader(new BlobReader(file(path)), {
            useWebWorkers: false,
          }),
      ),
      (reader) => Effect.promise(() => reader.close()),
    );
    const entries = yield* Effect.tryPromise({
      try: () => reader.getEntries(),
      catch: (cause) =>
        new WorkoutDataError({ message: "Could not read ZIP entries", cause }),
    });
    const entry = entries.find(
      (entry) =>
        !entry.directory && entry.filename === "apple_health_export/export.xml",
    );
    if (!entry || entry.directory)
      return yield* new WorkoutDataError({
        message:
          "Choose an Apple Health ZIP containing apple_health_export/export.xml.",
      });
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
    yield* Effect.tryPromise({
      try: (signal) =>
        entry.getData(
          new WritableStream<Uint8Array>({
            // Await parsing before accepting another chunk: never buffer the full XML.
            write: (chunk) =>
              Effect.runPromise(
                consume(decoder.decode(chunk, { stream: true })),
                { signal },
              ),
          }),
          { signal, checkSignature: true },
        ),
      catch: (cause) =>
        new WorkoutDataError({
          message: "Could not extract Apple Health XML",
          cause,
        }),
    });
    yield* consume(decoder.decode(), true);
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
