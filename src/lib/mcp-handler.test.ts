import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { McpServer } from "effect/ai";
import { HttpRouter } from "effect/http";

import { mcpLayer } from "./mcp-handler";

describe("application MCP access", () => {
  it("exposes every domain action while omitting browser-only routes", async () => {
    const tools = await Effect.runPromise(
      Effect.gen(function* () {
        const server = yield* McpServer.McpServer;
        return server.tools.map(({ tool }) => tool);
      }).pipe(Effect.provide(mcpLayer), Effect.provide(HttpRouter.layer)),
    );
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "habits_completeHabit",
      "habits_createHabit",
      "habits_deleteHabit",
      "habits_listHabits",
      "habits_updateHabit",
      "timeline_createBlock",
      "timeline_createLabel",
      "timeline_deleteBlock",
      "timeline_listBlocks",
      "timeline_listLabels",
      "timeline_startTimer",
      "timeline_stopTimer",
      "timeline_updateTimeBlock",
      "timeline_updateTimeLabel",
      "workouts_createWorkout",
      "workouts_deleteWorkout",
      "workouts_importWorkouts",
      "workouts_listWorkouts",
      "workouts_summarizeWorkouts",
      "workouts_updateWorkout",
    ]);
    expect(
      tools
        .filter((tool) => tool.annotations?.readOnlyHint === false)
        .map((tool) => tool.name)
        .sort(),
    ).toEqual([
      "habits_completeHabit",
      "habits_createHabit",
      "habits_deleteHabit",
      "habits_updateHabit",
      "timeline_createBlock",
      "timeline_createLabel",
      "timeline_deleteBlock",
      "timeline_startTimer",
      "timeline_stopTimer",
      "timeline_updateTimeBlock",
      "timeline_updateTimeLabel",
      "workouts_createWorkout",
      "workouts_deleteWorkout",
      "workouts_importWorkouts",
      "workouts_updateWorkout",
    ]);
  });
});
