import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { decodeWorkoutForm } from "./schema";

describe("workout form boundary", () => {
  it("converts form values without losing seconds or optional fields", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* decodeWorkoutForm({
          activityType: " Running ",
          status: "planned",
          startDate: "2026-09-20T09:00:00Z",
          minutes: "30",
          seconds: "45",
          distance: "5.2",
          notes: " Intervals ",
          indoor: "true",
        });
        expect(result).toMatchObject({
          activityType: "Running",
          durationMinutes: 30.75,
          distanceKilometres: 5.2,
          notes: "Intervals",
          indoor: true,
        });
      }),
    ));

  it("rejects malformed date and duration fields", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const values = {
          activityType: "Running",
          status: "planned",
          startDate: "2026-09-20T09:00:00Z",
          minutes: "30",
          seconds: "0",
        };
        for (const changes of [
          { minutes: "" },
          { minutes: "-1" },
          { seconds: "60" },
          { startDate: "invalid" },
        ]) {
          const result = yield* decodeWorkoutForm({
            ...values,
            ...changes,
          }).pipe(Effect.result);
          expect(result._tag).toBe("Failure");
        }
      }),
    ));
});
