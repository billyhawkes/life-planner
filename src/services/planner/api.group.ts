import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

const query = Schema.Record(Schema.String, Schema.String).annotate({
  identifier: "PlannerQuery",
});
const success = [
  Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/html" })),
  Schema.String.pipe(
    HttpApiSchema.asText({ contentType: "text/event-stream" }),
  ),
];
export const PlannerApiGroup = HttpApiGroup.make("planner")
  .add(
    HttpApiEndpoint.get("dashboard", "/", { query, success }).annotate(
      OpenApi.Exclude,
      true,
    ),
  )
  .add(
    HttpApiEndpoint.get("today", "/today", { query, success }).annotate(
      OpenApi.Exclude,
      true,
    ),
  )
  .add(
    HttpApiEndpoint.get("week", "/week", { query, success }).annotate(
      OpenApi.Exclude,
      true,
    ),
  )
  .add(
    HttpApiEndpoint.get("calendar", "/calendar", { query, success }).annotate(
      OpenApi.Exclude,
      true,
    ),
  )
  .add(
    HttpApiEndpoint.get("stats", "/stats", { query, success }).annotate(
      OpenApi.Exclude,
      true,
    ),
  )
  .add(
    HttpApiEndpoint.get("menu", "/menu", { query, success }).annotate(
      OpenApi.Exclude,
      true,
    ),
  );
