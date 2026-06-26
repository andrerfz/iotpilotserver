import { Router, Request, Response, NextFunction } from 'express';
import { authRouter } from './auth.router';
import { devicesRouter } from './devices.router';
import { monitoringRouter } from './monitoring.router';
import { adminRouter } from './admin.router';
import { usersRouter } from './users.router';
import { settingsRouter } from './settings.router';
import { iotRouter } from './iot.router';
import { notificationsRouter } from './notifications.router';
import { generateOpenApiSpec, generateClientSpec } from '@iotpilot/core/shared/infrastructure/openapi/generator';
import '../openapi/register-routes';  // side effect: populates the OpenAPI registry

export function createApiRouter(): Router {
  const router = Router();

  // Machine-readable API contract, generated from the zod schemas that validate
  // requests (see docs/openapi-autogen.md). This is the single source of truth —
  // the hand-maintained docs/openapi.yml has been retired.
  // Enveloped (accurate wire shape) for external consumers:
  router.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(generateOpenApiSpec());
  });
  // Unwrapped (envelope stripped by the HTTP interceptor) — drives the Angular client.
  router.get('/openapi-client.json', (_req: Request, res: Response) => {
    res.json(generateClientSpec());
  });

  router.use('/auth', authRouter);
  router.use('/devices', devicesRouter);
  router.use('/monitoring', monitoringRouter);
  router.use('/admin', adminRouter);
  router.use('/users', usersRouter);
  router.use('/settings', settingsRouter);
  router.use('/iot', iotRouter);
  // /api/webhook/temperature — ESP32/ESP8266 temperature sensor readings
  // (webhookUrl stored in device NVS during provisioning)
  router.use('/webhook', iotRouter);
  router.use('/notifications', notificationsRouter);

  return router;
}
