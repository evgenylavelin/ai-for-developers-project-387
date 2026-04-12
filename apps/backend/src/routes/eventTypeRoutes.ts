import type { FastifyInstance } from "fastify";

import { AppError } from "../lib/errors.js";
import { EventTypeService } from "../services/eventTypeService.js";

export function registerEventTypeRoutes(app: FastifyInstance, eventTypeService: EventTypeService) {
  app.get("/event-types", async () => eventTypeService.listGuestEventTypes());

  app.get("/owner/event-types", async () => eventTypeService.listOwnerEventTypes());

  app.post("/owner/event-types", async (request, reply) => {
    try {
      const created = eventTypeService.createEventType(request.body);
      return reply.code(201).send(created);
    } catch (error) {
      return handleAppError(reply, error);
    }
  });

  app.patch("/owner/event-types/:eventTypeId", async (request, reply) => {
    try {
      const { eventTypeId } = request.params as { eventTypeId: string };
      return eventTypeService.updateEventType(eventTypeId, request.body);
    } catch (error) {
      return handleAppError(reply, error);
    }
  });

  app.post("/owner/event-types/:eventTypeId([^:]+)::archive", async (request, reply) => {
    try {
      const { eventTypeId: rawEventTypeId } = request.params as { eventTypeId: string };
      const eventTypeId = rawEventTypeId.endsWith(":archive") ? rawEventTypeId.slice(0, -8) : rawEventTypeId;
      return eventTypeService.archiveEventType(eventTypeId);
    } catch (error) {
      return handleAppError(reply, error);
    }
  });

  app.delete("/owner/event-types/:eventTypeId", async (request, reply) => {
    try {
      const { eventTypeId } = request.params as { eventTypeId: string };
      eventTypeService.deleteEventType(eventTypeId);
      return reply.code(204).send();
    } catch (error) {
      return handleAppError(reply, error);
    }
  });
}

function handleAppError(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: unknown) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({ code: error.code, message: error.message });
  }

  throw error;
}