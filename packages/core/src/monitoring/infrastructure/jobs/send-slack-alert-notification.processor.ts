import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

/**
 * Sends a Slack notification for triggered alerts.
 * Reads Slack webhook config from environment.
 */
export class SendSlackAlertNotificationProcessor implements JobProcessor {
  readonly jobType = 'send-slack-alert-notification';

  async process(data: JobData): Promise<JobResult> {
    const { alertId, deviceId, thresholdId, severity } = data.payload;

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    const enabled = process.env.SLACK_NOTIFICATIONS_ENABLED === 'true';

    if (!enabled || !webhookUrl) {
      console.log(
        `[SlackAlertProcessor] Slack notifications disabled, skipping alert=${alertId} severity=${severity}`
      );
      return { success: true, data: { skipped: true, reason: 'notifications_disabled' } };
    }

    try {
      const severityEmoji: Record<string, string> = {
        CRITICAL: ':red_circle:',
        HIGH: ':large_orange_circle:',
        MEDIUM: ':large_yellow_circle:',
        LOW: ':large_blue_circle:',
      };

      const payload = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${severityEmoji[severity as string] ?? ':white_circle:'} ${severity} Alert Triggered`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Alert ID:*\n${alertId}` },
              { type: 'mrkdwn', text: `*Device:*\n${deviceId}` },
              { type: 'mrkdwn', text: `*Threshold:*\n${thresholdId}` },
              { type: 'mrkdwn', text: `*Tenant:*\n${data.tenantId}` },
            ],
          },
        ],
      };

      const response = await fetch(webhookUrl as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API returned ${response.status}: ${response.statusText}`);
      }

      console.log(
        `[SlackAlertProcessor] Notification sent for alert=${alertId} severity=${severity}`
      );
      return { success: true, data: { alertId, severity } };
    } catch (error) {
      const message = (error as Error).message;
      console.error(`[SlackAlertProcessor] Failed to send notification: ${message}`);
      return { success: false, error: message };
    }
  }
}
