import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { TimeFields, TimeId } from "./schema";

const response = [
  Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/html" })),
  Schema.String.pipe(
    HttpApiSchema.asText({ contentType: "text/event-stream" }),
  ),
  HttpApiSchema.Empty(303),
];
const form = TimeFields.pipe(HttpApiSchema.asFormUrlEncoded());
export const TimelineApiGroup = HttpApiGroup.make("timeline")
  .add(
    HttpApiEndpoint.get("blockForm", "/timeline/blocks/new", {
      query: TimeFields,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.get("goalForm", "/timeline/goals/new", {
      query: TimeFields,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.get("page", "/timeline", {
      query: TimeFields,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.post("label", "/timeline/labels", {
      payload: form,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.post("updateLabel", "/timeline/labels/:id", {
      params: TimeId,
      payload: form,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.post("block", "/timeline/blocks", {
      payload: form,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.post("updateBlock", "/timeline/blocks/:id", {
      params: TimeId,
      payload: form,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.post("start", "/timeline/start", {
      payload: form,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.post("stop", "/timeline/blocks/:id/stop", {
      params: TimeId,
      payload: form,
      success: response,
    }),
  )
  .add(
    HttpApiEndpoint.post("delete", "/timeline/blocks/:id/delete", {
      params: TimeId,
      payload: form,
      success: response,
    }),
  )
  .annotate(OpenApi.Exclude, true);
