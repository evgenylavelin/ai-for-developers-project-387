import Fastify from "fastify";

import { InMemoryBookingRepository } from "./repositories/inMemoryBookingRepository.js";
import { InMemoryEventTypeRepository } from "./repositories/inMemoryEventTypeRepository.js";
import { InMemoryScheduleRepository } from "./repositories/inMemoryScheduleRepository.js";
import { registerBookingRoutes } from "./routes/bookingRoutes.js";
import { registerEventTypeRoutes } from "./routes/eventTypeRoutes.js";
import { registerScheduleRoutes } from "./routes/scheduleRoutes.js";
import { BookingService } from "./services/bookingService.js";
import { EventTypeService } from "./services/eventTypeService.js";
import { ScheduleService } from "./services/scheduleService.js";

export function createApp() {
  const app = Fastify({ logger: false });
  const scheduleRepository = new InMemoryScheduleRepository();
  const eventTypeRepository = new InMemoryEventTypeRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const scheduleService = new ScheduleService(scheduleRepository);
  const eventTypeService = new EventTypeService(eventTypeRepository, bookingRepository);
  const bookingService = new BookingService(bookingRepository, eventTypeRepository, scheduleRepository);

  registerScheduleRoutes(app, scheduleService);
  registerEventTypeRoutes(app, eventTypeService);
  registerBookingRoutes(app, bookingService);

  return app;
}
