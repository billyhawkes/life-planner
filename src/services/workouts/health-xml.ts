import { Effect, Schema } from "effect";
import { WorkoutDataError, type Workout } from "./schema";

const Attribute = Schema.Record(Schema.String, Schema.String).annotate({
  identifier: "HealthXmlAttributes",
});
const Children = Schema.optional(
  Schema.Union([Attribute, Schema.Array(Attribute)]),
);
const WorkoutXml = Schema.Struct({
  Workout: Schema.Struct({
    "@workoutActivityType": Schema.String,
    "@startDate": Schema.String,
    "@endDate": Schema.String,
    "@duration": Schema.String,
    "@sourceName": Schema.String,
    MetadataEntry: Children,
    WorkoutStatistics: Children,
  }),
}).annotate({ identifier: "HealthWorkoutXml" });

const appleDateToIso = (value: string) => {
  const match =
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(value);
  return match
    ? `${match[1]}T${match[2]}${match[3]}:${match[4]}`
    : new Date(value).toISOString();
};
const finiteNumber = (value: string | undefined) =>
  value !== undefined && Number.isFinite(Number(value))
    ? Number(value)
    : undefined;
const children = (value: typeof Children.Type) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export const parseWorkout = (xml: string) =>
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => Bun.XML.parse(xml),
      catch: (cause) =>
        new WorkoutDataError({ message: "Invalid Apple Health XML", cause }),
    });
    const { Workout: entry } =
      yield* Schema.decodeUnknownEffect(WorkoutXml)(parsed);
    const activityType = entry["@workoutActivityType"].replace(
      /^HKWorkoutActivityType/,
      "",
    );
    const [startDate, endDate] = yield* Effect.try({
      try: () => [
        appleDateToIso(entry["@startDate"]),
        appleDateToIso(entry["@endDate"]),
      ],
      catch: (cause) =>
        new WorkoutDataError({
          message: "Invalid workout date in Apple Health export",
          cause,
        }),
    });
    const sourceName = entry["@sourceName"];
    let distanceKilometres: number | undefined;
    let activeEnergyKilocalories: number | undefined;
    let heartRate: Workout["heartRate"];
    for (const attributes of children(entry.WorkoutStatistics)) {
      if (
        [
          "HKQuantityTypeIdentifierDistanceWalkingRunning",
          "HKQuantityTypeIdentifierDistanceCycling",
          "HKQuantityTypeIdentifierDistanceSwimming",
        ].includes(attributes["@type"])
      ) {
        const sum = finiteNumber(attributes["@sum"]);
        if (sum !== undefined)
          distanceKilometres =
            attributes["@unit"] === "mi"
              ? sum * 1.609344
              : attributes["@unit"] === "m"
                ? sum / 1000
                : sum;
      }
      if (attributes["@type"] === "HKQuantityTypeIdentifierActiveEnergyBurned")
        activeEnergyKilocalories = finiteNumber(attributes["@sum"]);
      if (attributes["@type"] === "HKQuantityTypeIdentifierHeartRate") {
        const average = finiteNumber(attributes["@average"]);
        const minimum = finiteNumber(attributes["@minimum"]);
        const maximum = finiteNumber(attributes["@maximum"]);
        if (
          average !== undefined &&
          minimum !== undefined &&
          maximum !== undefined
        )
          heartRate = { average, minimum, maximum };
      }
    }
    return {
      id: ["health", startDate, endDate, activityType, sourceName].join(":"),
      activityType,
      startDate,
      endDate,
      sourceName,
      status: "completed",
      durationMinutes: Number(entry["@duration"]),
      indoor: children(entry.MetadataEntry).some(
        (attributes) =>
          attributes["@key"] === "HKIndoorWorkout" &&
          attributes["@value"] === "1",
      ),
      ...(distanceKilometres === undefined ? {} : { distanceKilometres }),
      ...(activeEnergyKilocalories === undefined
        ? {}
        : { activeEnergyKilocalories }),
      ...(heartRate === undefined ? {} : { heartRate }),
    } satisfies Workout;
  });

// Frame only Workout elements from Apple's export. Bun.XML handles their XML syntax,
// entities, and attributes. Unrelated records are discarded as each chunk arrives.
export const workoutBlocks = () => {
  let pending = "";
  return (chunk: string, final = false): ReadonlyArray<string> => {
    pending += chunk;
    const blocks: Array<string> = [];
    while (true) {
      const start = /<Workout(?=[\s/>])/.exec(pending);
      if (!start) {
        pending = pending.slice(-9);
        break;
      }
      pending = pending.slice(start.index);
      const opening = /^<Workout(?:[^>"']|"[^"]*"|'[^']*')*>/.exec(pending);
      if (!opening) break;
      const closing = pending.indexOf("</Workout>");
      const selfClosing = opening[0].endsWith("/>");
      if (!selfClosing && closing === -1) break;
      const end = selfClosing
        ? opening[0].length
        : closing + "</Workout>".length;
      blocks.push(pending.slice(0, end));
      pending = pending.slice(end);
    }
    if (final && /<Workout(?=[\s/>])/.test(pending))
      throw new Error("Incomplete Workout element in Apple Health export");
    return blocks;
  };
};
