import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { parseWorkout, workoutBlocks } from "./health-xml";

describe("streaming Apple Health workout framing", () => {
  it("parses real XML attributes, entities, statistics and metadata using Bun", async () => {
    const result = await Effect.runPromise(
      parseWorkout(
        `<Workout workoutActivityType="HKWorkoutActivityTypeRunning" startDate="2026-07-22 09:00:00 -0400" endDate="2026-07-22 09:30:00 -0400" duration="30" sourceName="A &amp; B"><MetadataEntry key="HKIndoorWorkout" value="1"/><WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" sum="3" unit="mi"/><WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="140" minimum="100" maximum="170"/></Workout>`,
      ),
    );
    expect(result).toMatchObject({
      activityType: "Running",
      sourceName: "A & B",
      indoor: true,
      durationMinutes: 30,
      startDate: "2026-07-22T09:00:00-04:00",
      distanceKilometres: 3 * 1.609344,
      heartRate: { average: 140, minimum: 100, maximum: 170 },
    });
    expect(result.id).toBe(
      "health:2026-07-22T09:00:00-04:00:2026-07-22T09:30:00-04:00:Running:A & B",
    );
  });
  it("handles arbitrary chunk boundaries, unrelated records, and self-closing workouts", () => {
    const first =
      '<Workout sourceName="A > B"><WorkoutStatistics sum="5"/></Workout>';
    const second = '<Workout duration="20" />';
    const xml = `<HealthData><Record value="ignore"/>${first}<WorkoutRoute/>${second}</HealthData>`;
    for (let size = 1; size <= xml.length; size++) {
      const blocks = workoutBlocks();
      const result: Array<string> = [];
      for (let offset = 0; offset < xml.length; offset += size)
        result.push(...blocks(xml.slice(offset, offset + size)));
      result.push(...blocks("", true));
      expect(result).toEqual([first, second]);
    }
  });

  it("rejects a truncated workout rather than importing partial data", () => {
    const blocks = workoutBlocks();
    blocks('<HealthData><Workout sourceName="Watch">');
    expect(() => blocks("", true)).toThrow("Incomplete Workout");
  });
});
