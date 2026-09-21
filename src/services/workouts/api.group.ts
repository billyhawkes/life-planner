import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";

import {
  Workout,
  WorkoutIdParams,
  WorkoutListQuery,
  WorkoutPayload,
  WorkoutSummary,
  WorkoutSummaryQuery,
  WorkoutFormFields,
  WorkoutViewQuery,
} from "./schema";

const HtmlResponse = Schema.String.pipe(
  HttpApiSchema.asText({ contentType: "text/html" }),
);
const EventStreamResponse = Schema.String.pipe(
  HttpApiSchema.asText({ contentType: "text/event-stream" }),
);
const BrowserResponse = [
  HtmlResponse,
  EventStreamResponse,
  HttpApiSchema.Empty(303),
];

export const WorkoutsApiGroup = HttpApiGroup.make("workouts")
  .add(
    HttpApiEndpoint.delete("deleteWorkout", "/api/workouts/:id", {
      params: WorkoutIdParams,
      success: HttpApiSchema.Empty(204),
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Delete a workout"),
  )
  .add(
    HttpApiEndpoint.post("delete", "/workouts/:id/delete", {
      params: WorkoutIdParams,
      payload: WorkoutFormFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: BrowserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.get("listWorkouts", "/api/workouts", {
      query: WorkoutListQuery,
      success: Schema.Array(Workout),
      error: HttpApiError.InternalServerError,
    })
      .annotate(OpenApi.Summary, "List Apple Health workouts")
      .annotate(
        OpenApi.Description,
        "Returns recent workouts from the local Apple Health export index, with optional activity and date filters.",
      ),
  )
  .add(
    HttpApiEndpoint.post("createWorkout", "/api/workouts", {
      payload: WorkoutPayload,
      success: Workout,
      error: HttpApiError.InternalServerError,
    }).annotate(OpenApi.Summary, "Create a workout or planned session"),
  )
  .add(
    HttpApiEndpoint.patch("updateWorkout", "/api/workouts/:id", {
      params: WorkoutIdParams,
      payload: WorkoutPayload,
      success: Workout,
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Update a workout or planned session"),
  )
  .add(
    HttpApiEndpoint.get("summarizeWorkouts", "/api/workouts/summary", {
      query: WorkoutSummaryQuery,
      success: WorkoutSummary,
      error: HttpApiError.InternalServerError,
    })
      .annotate(OpenApi.Summary, "Summarize Apple Health workouts")
      .annotate(
        OpenApi.Description,
        "Aggregates workout count, duration, distance, active energy, and activity types over a requested number of days.",
      ),
  )
  // Browser endpoints share this group but are omitted from JSON API/MCP docs.
  .add(
    HttpApiEndpoint.get("home", "/", {
      success: HttpApiSchema.Empty(303),
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.get("page", "/workouts", {
      query: WorkoutViewQuery,
      success: BrowserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("create", "/workouts", {
      payload: WorkoutFormFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: BrowserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("update", "/workouts/:id", {
      params: WorkoutIdParams,
      payload: WorkoutFormFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: BrowserResponse,
    }).annotate(OpenApi.Exclude, true),
  );
