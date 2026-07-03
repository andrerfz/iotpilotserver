/**
 * Shared branded wrapper for all outgoing HTML emails so every message is
 * instantly recognisable as IoT Pilot. Uses a text wordmark (not an image) —
 * email clients (Gmail/Outlook) routinely block or strip <img>, whereas styled
 * text always renders. All styles are inline, as email clients require.
 *
 * Pass the inner content HTML; get back a full, centred, branded card.
 */
const BRAND = '#0054e9'; // --ion-color-primary

export function renderEmailLayout(contentHtml: string, footerNote?: string): string {
  const footer = footerNote ?? 'Automated message from IoT Pilot.';
  return `
<div style="background:#f2f3f5;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">
    <div style="padding:16px 24px;border-bottom:1px solid #eee;">
      <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${BRAND};">IoT<span style="color:#1a1a1a;">Pilot</span></span>
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
