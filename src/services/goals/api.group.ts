import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { GoalFields, GoalId } from "./schema";

const success = [
  Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/html" })),
  Schema.String.pipe(
    HttpApiSchema.asText({ contentType: "text/event-stream" }),
  ),
  HttpApiSchema.Empty(303),
];
const payload = GoalFields.pipe(HttpApiSchema.asFormUrlEncoded());

export const GoalsApiGroup = HttpApiGroup.make("goals")
  .add(
    HttpApiEndpoint.get("form", "/goals/new", {
      query: GoalFields,
      success,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("create", "/goals", { payload, success }).annotate(
      OpenApi.Exclude,
      true,
    ),
  )
  .add(
    HttpApiEndpoint.post("update", "/goals/:id", {
      params: GoalId,
      payload,
      success,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("delete", "/goals/:id/delete", {
      params: GoalId,
      payload,
      success,
    }).annotate(OpenApi.Exclude, true),
  );
