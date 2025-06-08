import { PreferenceCategory } from '@prisma/client';
import { tenantPrisma } from '@/lib/tenant-middleware';

// Helper function to get default preferences for a category
function getDefaultPreferences(category: PreferenceCategory): Record<string, string> {
  switch (category) {
    case 'PROFILE':
      return {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY'
      };
    case 'NOTIFICATIONS':
      return {
        emailNotifications: 'true',
        pushNotifications: 'false',
        alertNotifications: 'true',
        deviceOfflineNotifications: 'true'
      };
    case 'SECURITY':
      return {
        twoFactorAuth: 'false',
        sessionTimeout: '30', // minutes
        loginNotifications: 'true'
      };
    case 'SYSTEM':
      return {
        theme: 'light',
        dashboardLayout: 'default',
        itemsPerPage: '10'
      };
    case 'APPEARANCE':
      return {
        theme: 'light',
        fontSize: 'medium',
        colorScheme: 'default'
      };
    case 'ACCESSIBILITY':
      return {
        highContrast: 'false',
        reducedMotion: 'false',
        largeText: 'false'
      };
    default:
      return {};
  }
}

// Helper function to get or create user preferences
export async function getUserPreferences(
  userId: string,
  category: PreferenceCategory
): Promise<Record<string, string>> {
  // Get existing preferences
  const preferences = await tenantPrisma.client.userPreference.findMany({
    where: {
      userId,
      category
    }
  });

  // Convert to key-value object
  const existingPrefs = preferences.reduce((acc, pref) => {
    acc[pref.key] = pref.value;
    return acc;
  }, {} as Record<string, string>);

  // Get default preferences
  const defaultPrefs = getDefaultPreferences(category);

  // Merge defaults with existing preferences
  const mergedPrefs = { ...defaultPrefs, ...existingPrefs };

  // Create any missing preferences
  const missingKeys = Object.keys(defaultPrefs).filter(key => !existingPrefs[key]);

  if (missingKeys.length > 0) {
    await tenantPrisma.client.userPreference.createMany({
      data: missingKeys.map(key => ({
        userId,
        category,
        key,
        value: defaultPrefs[key]
      })),
      skipDuplicates: true
    });
  }

  return mergedPrefs;
}