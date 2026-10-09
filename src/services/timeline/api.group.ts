import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  BlockPayload,
  LabelPayload,
  StartTimerPayload,
  TimeBlock,
  TimeLabel,
  TimelineError,
  TimeFields,
  TimeId,
} from "./schema";

const response = [
  Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/html" })),
  Schema.String.pipe(
    HttpApiSchema.asText({ contentType: "text/event-stream" }),
  ),
  HttpApiSchema.Empty(303),
];
const form = TimeFields.pipe(HttpApiSchema.asFormUrlEncoded());
const mutationErrors = [
  TimelineError.pipe(HttpApiSchema.status(400)),
  HttpApiError.InternalServerError,
];
export const TimelineApiGroup = HttpApiGroup.make("timeline")
  .add(
    HttpApiEndpoint.post("createLabel", "/api/timeline/labels", {
      payload: LabelPayload,
      success: HttpApiSchema.Empty(204),
      error: mutationErrors,
    }).annotate(
      OpenApi.Summary,
      "Create a time tracking label and its daily and weekly goals",
    ),
  )
  .add(
    HttpApiEndpoint.patch("updateTimeLabel", "/api/timeline/labels/:id", {
      params: TimeId,
      payload: LabelPayload,
      success: HttpApiSchema.Empty(204),
      error: mutationErrors,
    }).annotate(
      OpenApi.Summary,
      "Update a time tracking label and its daily and weekly goals",
    ),
  )
  .add(
    HttpApiEndpoint.delete("deleteBlock", "/api/timeline/blocks/:id", {
      params: TimeId,
      success: HttpApiSchema.Empty(204),
      error: mutationErrors,
    }).annotate(OpenApi.Summary, "Delete a recorded time block"),
  )
  .add(
    HttpApiEndpoint.post("startTimer", "/api/timeline/timer", {
      payload: StartTimerPayload,
      success: HttpApiSchema.Empty(204),
      error: mutationErrors,
    }).annotate(
      OpenApi.Summary,
      "Start tracking time under a label, stopping any currently running timer",
    ),
  )
  .add(
    HttpApiEndpoint.post("stopTimer", "/api/timeline/blocks/:id/stop", {
      params: TimeId,
      success: HttpApiSchema.Empty(204),
      error: mutationErrors,
    }).annotate(OpenApi.Summary, "Stop a running time block"),
  )
  .add(
    HttpApiEndpoint.get("listLabels", "/api/timeline/labels", {
      success: Schema.Array(TimeLabel),
      error: HttpApiError.InternalServerError,
    }).annotate(OpenApi.Summary, "List time tracking labels and goals"),
  )
  .add(
    HttpApiEndpoint.get("listBlocks", "/api/timeline/blocks", {
      success: Schema.Array(TimeBlock),
      error: HttpApiError.InternalServerError,
    }).annotate(
      OpenApi.Summary,
      "List recorded time blocks with their label IDs and UTC timestamps",
    ),
  )
  .add(
    HttpApiEndpoint.post("createBlock", "/api/timeline/blocks", {
      payload: BlockPayload,
      success: HttpApiSchema.Empty(204),
      error: mutationErrors,
    })
      .annotate(
        OpenApi.Summary,
        "Create a time block under an existing label; overlapping blocks are rejected",
      )
      .annotate(
        OpenApi.Description,
        "Use timestamps with an explicit timezone offset. Read existing labels and blocks first to choose the label and avoid duplicates or overlaps.",
      ),
  )
  .add(
    HttpApiEndpoint.patch("updateTimeBlock", "/api/timeline/blocks/:id", {
      params: TimeId,
      payload: BlockPayload,
      success: HttpApiSchema.Empty(204),
      error: mutationErrors,
    })
      .annotate(
        OpenApi.Summary,
        "Update an existing time block; overlapping blocks are rejected",
      )
      .annotate(
        OpenApi.Description,
        "Supply all block fields and timestamps with an explicit timezone offset. Read the existing block before editing.",
      ),
  )
  .add(
    HttpApiEndpoint.get("blockForm", "/timeline/blocks/new", {
      query: TimeFields,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.get("goalForm", "/timeline/goals/new", {
      query: TimeFields,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.get("page", "/timeline", {
      query: TimeFields,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("label", "/timeline/labels", {
      payload: form,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("updateLabel", "/timeline/labels/:id", {
      params: TimeId,
      payload: form,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("block", "/timeline/blocks", {
      payload: form,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("updateBlock", "/timeline/blocks/:id", {
      params: TimeId,
      payload: form,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("start", "/timeline/start", {
      payload: form,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("stop", "/timeline/blocks/:id/stop", {
      params: TimeId,
      payload: form,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  )
  .add(
    HttpApiEndpoint.post("delete", "/timeline/blocks/:id/delete", {
      params: TimeId,
      payload: form,
      success: response,
    }).annotate(OpenApi.Exclude, true),
  );
