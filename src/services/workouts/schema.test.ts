import { describe, expect, it } from "bun:test";
import { Schema } from "effect";

import { Workout, WorkoutListQuery, WorkoutPayload } from "./schema";

describe("workout schemas", () => {
  it("rejects invalid manual workout values before persistence", () => {
    const valid = {
      activityType: "Running",
      status: "planned",
      startDate: "2026-09-20T09:00:00Z",
      durationMinutes: 45,
    };
    const decode = Schema.decodeUnknownSync(WorkoutPayload);
    for (const changes of [
      { activityType: "   " },
      { startDate: "not a date" },
      { durationMinutes: -1 },
      { durationMinutes: Infinity },
      { distanceKilometres: -1 },
    ]) {
      expect(() => decode({ ...valid, ...changes })).toThrow();
    }
    expect(decode({ ...valid, durationMinutes: 45.5 })).toMatchObject({
      durationMinutes: 45.5,
    });
  });
  it("decodes typed API query input", () => {
    expect(
      Schema.decodeUnknownSync(WorkoutListQuery)({
        limit: 4,
        activityType: "Running",
      }),
    ).toEqual({ limit: 4, activityType: "Running" });
  });

  it("accepts a compact imported workout", () => {
    expect(
      Schema.decodeUnknownSync(Workout)({
        id: "workout-1",
        activityType: "Running",
        status: "completed",
        startDate: "2026-07-22T09:00:00-04:00",
        endDate: "2026-07-22T09:30:00-04:00",
        durationMinutes: 30,
        sourceName: "Apple Watch",
        indoor: false,
        distanceKilometres: 5,
      }),
    ).toMatchObject({ activityType: "Running", distanceKilometres: 5 });
  });
});
