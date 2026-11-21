import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  Task,
  TaskCompletion,
  TaskFields,
  TaskIdParams,
  TaskPayload,
} from "./schema";

const browserResponse = [
  Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/html" })),
  Schema.String.pipe(
    HttpApiSchema.asText({ contentType: "text/event-stream" }),
  ),
  HttpApiSchema.Empty(303),
];
export const TasksApiGroup = HttpApiGroup.make("tasks")
  .add(
    HttpApiEndpoint.get("listTasks", "/api/tasks", {
      success: Schema.Array(Task),
      error: HttpApiError.InternalServerError,
    }).annotate(OpenApi.Summary, "List tasks, including the undated inbox"),
  )
  .add(
    HttpApiEndpoint.post("createTask", "/api/tasks", {
      payload: TaskPayload,
      success: Task,
      error: HttpApiError.InternalServerError,
    }).annotate(OpenApi.Summary, "Create a task"),
  )
  .add(
    HttpApiEndpoint.patch("updateTask", "/api/tasks/:id", {
      params: TaskIdParams,
      payload: TaskPayload,
      success: Task,
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Edit or schedule a task"),
  )
  .add(
    HttpApiEndpoint.put("completeTask", "/api/tasks/:id/completion", {
      params: TaskIdParams,
      payload: TaskCompletion,
      success: Task,
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Complete or reopen a task"),
  )
  .add(
    HttpApiEndpoint.delete("deleteTask", "/api/tasks/:id", {
      params: TaskIdParams,
      success: HttpApiSchema.Empty(204),
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Delete a task"),
  )
  .add(
    HttpApiEndpoint.get("new", "/tasks/new", {
      query: TaskFields,
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("create", "/tasks", {
      payload: TaskFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("update", "/tasks/:id", {
      params: TaskIdParams,
      payload: TaskFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("complete", "/tasks/:id/completion", {
      params: TaskIdParams,
      payload: TaskFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("delete", "/tasks/:id/delete", {
      params: TaskIdParams,
      payload: TaskFields.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: browserResponse,
    }).annotate(OpenApi.Exclude, true),
  );
