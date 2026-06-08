import { Router, Response } from 'express';
import { z } from 'zod';
import { validator } from '@iotpilot/core/shared/infrastructure/validation/validation-helper';
import { tenantPrisma } from '@iotpilot/core/tenant-middleware';
import { getUserPreferences } from '@iotpilot/core/user-preferences';
import { prisma } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { send } from '../http/response.util';

function isoTimestamp(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const v = validator();

// Profile settings schema
const profileSettingsSchema = v.object({
  language: v.string({ min: 2, max: 5 }),
  timezone: v.string({ min: 1 }),
  dateFormat: v.string({ min: 1 }),
  firstName: v.optional(v.string({ max: 100 })),
  lastName: v.optional(v.string({ max: 100 })),
  phoneNumber: v.optional(v.string({ max: 30 })),
});

// Security settings schema
const regexNumericString = z.string().regex(/^\d+$/);
const securitySettingsSchema = v.object({
  twoFactorAuth: v.enum(['true', 'false'] as const),
  sessionTimeout: (v as any).fromZodSchema(regexNumericString), // numeric string
  loginNotifications: v.enum(['true', 'false'] as const),
});

// System settings schemas
const regexStringSchema = z.string().regex(/^\d+$/);
const systemSettingsSchemaZod = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  dashboardLayout: z.enum(['default', 'compact', 'expanded']),
  itemsPerPage: regexStringSchema, // numeric string
});
const systemSettingsSchema = (v as any).fromZodSchema(systemSettingsSchemaZod);

const adminSystemSettingsSchemaZod = systemSettingsSchemaZod.extend({
  enableAdvancedMetrics: z.enum(['true', 'false']),
  enableBetaFeatures: z.enum(['true', 'false']),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
});
const adminSystemSettingsSchema = (v as any).fromZodSchema(adminSystemSettingsSchemaZod);

// Notifications settings schema
const notificationsSettingsSchema = v.object({
  emailNotifications: v.enum(['true', 'false'] as const),
  pushNotifications: v.enum(['true', 'false'] as const),
  alertNotifications: v.enum(['true', 'false'] as const),
  deviceOfflineNotifications: v.enum(['true', 'false'] as const),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const settingsRouter = Router();

// ---------------------------------------------------------------------------
// GET /settings — Get all user settings (grouped by category)
// ---------------------------------------------------------------------------
settingsRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const preferences = await tenantPrisma.client.userPreference.findMany({
      where: { userId: user.id },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    const groupedPreferences = preferences.reduce(
      (acc: Record<string, Record<string, string>>, pref: { category: string; key: string; value: string }) => {
        if (!acc[pref.category]) {
          acc[pref.category] = {};
        }
        acc[pref.category][pref.key] = pref.value;
        return acc;
      },
      {} as Record<string, Record<string, string>>,
    );

    send.ok(res, groupedPreferences);
    return;
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// GET /settings/profile — Return display prefs + personal info
// ---------------------------------------------------------------------------
settingsRouter.get('/profile', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const [preferences, userRow] = await Promise.all([
      getUserPreferences(user.id, 'PROFILE'),
      prisma.getClient().user.findUnique({
        where: { id: user.id },
        select: { email: true, username: true, firstName: true, lastName: true, phoneNumber: true },
      }),
    ]);

    send.ok(res, {
      ...preferences,
      firstName: userRow?.firstName ?? '',
      lastName: userRow?.lastName ?? '',
      email: userRow?.email ?? '',
      username: userRow?.username ?? '',
      phoneNumber: userRow?.phoneNumber ?? '',
    });
    return;
  } catch (err) {
    console.error('Failed to fetch profile settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// PUT /settings/profile — Save display prefs + optional personal info
// ---------------------------------------------------------------------------
settingsRouter.put('/profile', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const body = req.body;

    let validatedData: {
      language: string;
      timezone: string;
      dateFormat: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
    };
    try {
      validatedData = profileSettingsSchema.parse(body) as typeof validatedData;
    } catch (e) {
      if (e instanceof z.ZodError) {
        send.badRequest(
          res,
          'Invalid input',
          e.errors.map((err) => ({ path: err.path.join('.'), message: err.message })),
        );
        return;
      }
      throw e;
    }

    const { firstName, lastName, phoneNumber, ...prefData } = validatedData;

    // Save display preferences
    await Promise.all(
      Object.entries(prefData).map(([key, value]) =>
        tenantPrisma.client.userPreference.upsert({
          where: { userId_category_key: { userId: user.id, category: 'PROFILE', key } },
          update: { value: String(value) },
          create: { userId: user.id, category: 'PROFILE', key, value: String(value) },
        }),
      ),
    );

    // Update personal info on user record if provided
    const personalUpdates: Record<string, string | null> = {};
    if (firstName !== undefined) personalUpdates.firstName = firstName || null;
    if (lastName !== undefined) personalUpdates.lastName = lastName || null;
    if (phoneNumber !== undefined) personalUpdates.phoneNumber = phoneNumber || null;

    if (Object.keys(personalUpdates).length > 0) {
      await prisma.getClient().user.update({
        where: { id: user.id },
        data: { ...personalUpdates, updatedAt: new Date() },
      });
    }

    send.ok(res, { message: 'Profile updated successfully', settings: validatedData });
    return;
  } catch (err) {
    console.error('Failed to update profile settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// GET /settings/security — Get security settings
// ---------------------------------------------------------------------------
settingsRouter.get('/security', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const preferences = await getUserPreferences(user.id, 'SECURITY');

    send.ok(res, preferences);
    return;
  } catch (err) {
    console.error('Failed to fetch security settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// PUT /settings/security — Update security settings
// ---------------------------------------------------------------------------
settingsRouter.put('/security', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const body = req.body;

    let validatedData: { twoFactorAuth: string; sessionTimeout: string; loginNotifications: string };
    try {
      validatedData = securitySettingsSchema.parse(body) as typeof validatedData;
    } catch (e) {
      if (e instanceof z.ZodError) {
        send.badRequest(
          res,
          'Invalid input',
          e.errors.map((err) => ({ path: err.path.join('.'), message: err.message })),
        );
        return;
      }
      throw e;
    }

    // Additional validation for sessionTimeout
    const sessionTimeout = parseInt(validatedData.sessionTimeout as string);
    if (isNaN(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 1440) {
      send.badRequest(res, 'Session timeout must be between 5 and 1440 minutes');
      return;
    }

    // Update each preference
    const updatePromises = Object.entries(validatedData).map(([key, value]) =>
      tenantPrisma.client.userPreference.upsert({
        where: {
          userId_category_key: {
            userId: user.id,
            category: 'SECURITY',
            key,
          },
        },
        update: { value: String(value) },
        create: {
          userId: user.id,
          category: 'SECURITY',
          key,
          value: String(value),
        },
      }),
    );

    await Promise.all(updatePromises);

    // Sync twoFactorEnabled to User record (source of truth for login gate)
    if (validatedData.twoFactorAuth !== undefined) {
      const enabled = validatedData.twoFactorAuth === 'true';
      await tenantPrisma.client.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: enabled },
      });

      if (enabled) {
        try {
          const { ServiceContainer } = await import(
            '@iotpilot/core/shared/infrastructure/container/service-container'
          );
          const serviceContainer = ServiceContainer.getInstance();
          const commandBus = serviceContainer.getCommandBus();
          const { SendVerificationCodeCommand } = await import(
            '@iotpilot/core/user/application/commands/send-verification-code/send-verification-code.command'
          );
          await commandBus.execute(
            SendVerificationCodeCommand.create(user.id, user.email, 'TWO_FACTOR'),
          );
          console.log(`[Security] 2FA enabled for user ${user.id}, test code sent`);
        } catch (err) {
          console.warn('Failed to send test verification code:', (err as Error).message);
        }
      } else {
        // Invalidate all sessions so the next login goes through fresh auth
        // without 2FA — avoids sessions that were created under 2FA bypass
        await tenantPrisma.client.session.updateMany({
          where: { userId: user.id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        console.log(`[Security] 2FA disabled for user ${user.id}; all sessions invalidated`);
      }
    }

    send.ok(res, {
      message: 'Security settings updated successfully',
      settings: validatedData,
    });
    return;
  } catch (err) {
    console.error('Failed to update security settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// GET /settings/system — Get system settings
// ---------------------------------------------------------------------------
settingsRouter.get('/system', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const preferences = await getUserPreferences(user.id, 'SYSTEM');

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    if (isAdmin) {
      const systemConfig = await tenantPrisma.client.systemConfig.findMany({
        where: { category: 'system' },
      });

      const adminSettings = systemConfig.reduce(
        (acc: Record<string, string>, config: { key: string; value: string }) => {
          acc[config.key] = config.value;
          return acc;
        },
        {} as Record<string, string>,
      );

      // Add default admin settings if not present
      if (!adminSettings.enableAdvancedMetrics) {
        adminSettings.enableAdvancedMetrics = 'false';
      }
      if (!adminSettings.enableBetaFeatures) {
        adminSettings.enableBetaFeatures = 'false';
      }
      if (!adminSettings.logLevel) {
        adminSettings.logLevel = 'info';
      }

      send.ok(res, {
        ...preferences,
        ...adminSettings,
        isAdmin: 'true',
      });
      return;
    }

    send.ok(res, preferences);
    return;
  } catch (err) {
    console.error('Failed to fetch system settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// PUT /settings/system — Update system settings
// ---------------------------------------------------------------------------
settingsRouter.put('/system', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const body = req.body;

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

    let validatedData: Record<string, string>;
    try {
      if (isAdmin) {
        validatedData = adminSystemSettingsSchema.parse(body) as Record<string, string>;
      } else {
        validatedData = systemSettingsSchema.parse(body) as Record<string, string>;
      }
    } catch (e) {
      if (e instanceof z.ZodError) {
        send.badRequest(
          res,
          'Invalid input',
          (e as z.ZodError).errors.map((err: z.ZodIssue) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        );
        return;
      }
      throw e;
    }

    // Additional validation for itemsPerPage
    const itemsPerPage = parseInt(validatedData.itemsPerPage);
    if (isNaN(itemsPerPage) || itemsPerPage < 5 || itemsPerPage > 100) {
      send.badRequest(res, 'Items per page must be between 5 and 100');
      return;
    }

    // Separate user preferences from system config settings
    const userPrefs: Record<string, string> = {};
    const systemConfigSettings: Record<string, string> = {};

    Object.entries(validatedData).forEach(([key, value]: [string, any]) => {
      if (isAdmin && ['enableAdvancedMetrics', 'enableBetaFeatures', 'logLevel'].includes(key)) {
        systemConfigSettings[key] = String(value);
      } else {
        userPrefs[key] = String(value);
      }
    });

    // Update user preferences
    const updatePromises = Object.entries(userPrefs).map(([key, value]: [string, string]) =>
      tenantPrisma.client.userPreference.upsert({
        where: {
          userId_category_key: {
            userId: user.id,
            category: 'SYSTEM',
            key,
          },
        },
        update: { value },
        create: {
          userId: user.id,
          category: 'SYSTEM',
          key,
          value,
        },
      }),
    );

    await Promise.all(updatePromises);

    // If admin, update system config settings
    if (isAdmin && Object.keys(systemConfigSettings).length > 0) {
      const systemConfigPromises = Object.entries(systemConfigSettings).map(
        ([key, value]: [string, string]) =>
          tenantPrisma.client.systemConfig.upsert({
            where: { key },
            update: {
              value,
              category: 'system',
              updatedAt: new Date(),
            },
            create: {
              key,
              value,
              category: 'system',
              updatedAt: new Date(),
            },
          }),
      );

      await Promise.all(systemConfigPromises);
    }

    send.ok(res, {
      message: 'System settings updated successfully',
      settings: validatedData,
    });
    return;
  } catch (err) {
    console.error('Failed to update system settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// GET /settings/notifications — Get notifications settings
// ---------------------------------------------------------------------------
settingsRouter.get('/notifications', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const preferences = await getUserPreferences(user.id, 'NOTIFICATIONS');

    send.ok(res, preferences);
    return;
  } catch (err) {
    console.error('Failed to fetch notifications settings:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// PUT /settings/notifications — Update notifications settings
// ---------------------------------------------------------------------------
settingsRouter.put('/notifications', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    const body = req.body;

    let validatedData: {
      emailNotifications: string;
      pushNotifications: string;
      alertNotifications: string;
      deviceOfflineNotifications: string;
    };
    try {
      validatedData = notificationsSettingsSchema.parse(body) as typeof validatedData;
    } catch (e) {
      if (e instanceof z.ZodError) {
        send.badRequest(
          res,
          'Invalid input',
          e.errors.map((err) => ({ path: err.path.join('.'), message: err.message })),
        );
        return;
      }
      throw e;
    }

    const updatePromises = Object.entries(validatedData).map(([key, value]) =>
      tenantPrisma.client.userPreference.upsert({
        where: {
          userId_category_key: {
            userId: user.id,
            category: 'NOTIFICATIONS',
            key,
          },
        },
        update: { value: String(value) },
        create: {
          userId: user.id,
          category: 'NOTIFICATIONS',
          key,
          value: String(value),
        },
      }),
    );

    await Promise.all(updatePromises);

    send.ok(res, {
      message: 'Notifications settings updated successfully',
      settings: validatedData,
    });
    return;
  } catch (err) {
    console.error('Failed to update notifications settings:', err);
    send.fromError(res, err);
  }
});
