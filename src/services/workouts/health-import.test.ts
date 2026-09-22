import { describe, expect, it } from "bun:test";
import { write } from "bun";
import { BunServices } from "@effect/platform-bun";
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { Effect, FileSystem } from "effect";
import { readHealthArchive } from "./health-import";

const workout =
  '<Workout workoutActivityType="HKWorkoutActivityTypeRunning" startDate="2026-07-22 09:00:00 -0400" endDate="2026-07-22 09:30:00 -0400" duration="30" sourceName="Montréal 🏃"/>';

const archive = async (
  xml: string,
  filename = "apple_health_export/export.xml",
) => {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  await writer.add(filename, new TextReader(xml));
  return writer.close();
};

const read = (blob: Blob) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped();
      const path = `${directory}/export.zip`;
      yield* Effect.promise(() => write(path, blob));
      return yield* readHealthArchive({ path });
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
  );

describe("streaming ZIP imports", () => {
  it("extracts a workout from a large XML entry with unrelated health records", async () => {
    // Decompressed XML spans hundreds of extraction chunks; only one workout is retained.
    const records = '<Record type="ignored" value="1234567890"/>'.repeat(
      500_000,
    );
    const result = await read(
      await archive(`<HealthData>${records}${workout}${records}</HealthData>`),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sourceName: "Montréal 🏃",
      durationMinutes: 30,
      activityType: "Running",
    });
  });

  it("rejects an archive without the required entry", async () => {
    await expect(
      read(await archive(workout, "other.xml")),
    ).rejects.toMatchObject({ _tag: "WorkoutDataError" });
  });

  it("rejects invalid and truncated ZIP data", async () => {
    await expect(read(new Blob(["not a ZIP"]))).rejects.toMatchObject({
      _tag: "WorkoutDataError",
    });
    const valid = await archive(workout);
    await expect(read(valid.slice(0, valid.size / 2))).rejects.toMatchObject({
      _tag: "WorkoutDataError",
    });
  });

  it("rejects incomplete workout XML without returning partial results", async () => {
    await expect(
      read(
        await archive(
          `<HealthData>${workout}<Workout sourceName="unfinished">`,
        ),
      ),
    ).rejects.toMatchObject({ _tag: "WorkoutDataError" });
  });

  it("rejects an entry whose data does not match its checksum", async () => {
    const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
    await writer.add(
      "apple_health_export/export.xml",
      new TextReader(workout),
      { level: 0 },
    );
    const bytes = new Uint8Array(await (await writer.close()).arrayBuffer());
    const header = new DataView(bytes.buffer);
    const dataOffset =
      30 + header.getUint16(26, true) + header.getUint16(28, true);
    bytes[dataOffset] = bytes[dataOffset]! ^ 1;
    await expect(read(new Blob([bytes]))).rejects.toMatchObject({
      _tag: "WorkoutDataError",
    });
  });
});
