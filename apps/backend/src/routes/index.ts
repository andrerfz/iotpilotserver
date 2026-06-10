import { Router, Request, Response, NextFunction } from 'express';
import { authRouter } from './auth.router';
import { devicesRouter } from './devices.router';
import { monitoringRouter } from './monitoring.router';
import { adminRouter } from './admin.router';
import { usersRouter } from './users.router';
import { settingsRouter } from './settings.router';
import { iotRouter } from './iot.router';
import { notificationsRouter } from './notifications.router';

export function createApiRouter(): Router {
  const router = Router();

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
