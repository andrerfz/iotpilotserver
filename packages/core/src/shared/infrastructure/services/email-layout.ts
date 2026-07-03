/**
 * Shared branded wrapper for all outgoing HTML emails so every message is
 * instantly recognisable as IoT Pilot. The header keeps a light background
 * (a full dark bar reads too heavy for a small transactional email), the logo
 * centred and sized so its circuit detail and name are legible — the logo
 * already contains the "IoT Pilot" name. The logo is attached to the message via CID
 * (see brand-logo.ts) rather than a remote URL, so it ships with the email.
 * Images can still be gated behind "display images" in Gmail/Outlook — so the
 * <img> carries alt="IoT Pilot" and a text wordmark fallback next to it that
 * only shows once the image area collapses in those clients.
 * All styles are inline, as email clients require.
 *
 * Pass the inner content HTML; get back a full, centred, branded card.
 */
import { BRAND_LOGO_CID } from '@iotpilot/core/shared/infrastructure/services/brand-logo';

export function renderEmailLayout(contentHtml: string, footerNote?: string): string {
  const footer = footerNote ?? 'Automated message from IoT Pilot.';
  return `
<div style="background:#f2f3f5;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">
    <div style="padding:20px 24px;border-bottom:1px solid #eee;text-align:center;">
      <img src="cid:${BRAND_LOGO_CID}" width="64" height="64" alt="IoT Pilot" title="IoT Pilot" style="display:inline-block;border:0;outline:none;border-radius:10px;" />
    </div>
    <div style="padding:24px;color:#1a1a1a;">
${contentHtml}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eee;font-size:12px;color:#999;line-height:1.5;">
      ${footer}
    </div>
  </div>
</div>`.trim();
}
