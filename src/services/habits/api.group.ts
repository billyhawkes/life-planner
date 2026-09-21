import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  Habit,
  HabitCompletion,
  HabitFields,
  HabitIdParams,
  HabitPayload,
} from "./schema";

const browserResponse = [
  Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/html" })),
  Schema.String.pipe(
    HttpApiSchema.asText({ contentType: "text/event-stream" }),
  ),
  HttpApiSchema.Empty(303),
];

export const HabitsApiGroup = HttpApiGroup.make("habits")
  .add(
    HttpApiEndpoint.delete("deleteHabit", "/api/habits/:id", {
      params: HabitIdParams,
      success: HttpApiSchema.Empty(204),
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Delete a habit and its completion history"),
  )
  .add(
    HttpApiEndpoint.post("delete", "/habits/:id/delete", {
      params: HabitIdParams,
      payload: HabitFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.get("listHabits", "/api/habits", {
      success: Schema.Array(Habit),
      error: HttpApiError.InternalServerError,
    }).annotate(OpenApi.Summary, "List daily habits"),
  )
  .add(
    HttpApiEndpoint.post("createHabit", "/api/habits", {
      payload: HabitPayload,
      success: Habit,
      error: HttpApiError.InternalServerError,
    }).annotate(OpenApi.Summary, "Create a daily habit"),
  )
  .add(
    HttpApiEndpoint.put("completeHabit", "/api/habits/:id/completion", {
      params: HabitIdParams,
      payload: HabitCompletion,
      success: HabitCompletion,
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Set a habit's completion for a day"),
  )
  .add(
    HttpApiEndpoint.get("new", "/habits/new", {
      query: HabitFields,
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("create", "/habits", {
      payload: HabitFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("complete", "/habits/:id/completion", {
      params: HabitIdParams,
      payload: HabitFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  );
