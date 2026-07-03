/**
 * Shared branded wrapper for all outgoing HTML emails so every message is
 * instantly recognisable as IoT Pilot. The brand mark and wordmark are drawn
 * with pure HTML/CSS — no <img> — because email clients (Gmail/Outlook)
 * routinely block or strip images, whereas styled text/boxes always render.
 * The icon avoids position/transform/gradients-only tricks that Gmail/Outlook
 * drop: it's a rounded tile (solid colour fallback + gradient enhancement)
 * holding white signal bars, so it reads as an IoT/monitoring mark everywhere.
 * All styles are inline, as email clients require.
 *
 * Pass the inner content HTML; get back a full, centred, branded card.
 */
const BRAND = '#0054e9'; // --ion-color-primary

/** Brand icon: a rounded gradient tile with white signal bars (image-free). */
const BRAND_MARK = `
<span style="display:inline-block;vertical-align:middle;width:32px;height:32px;border-radius:8px;background:${BRAND};background:linear-gradient(135deg,${BRAND} 0%,#17c8c0 100%);text-align:center;line-height:32px;margin-right:10px;">
  <span style="display:inline-block;vertical-align:middle;line-height:0;">
    <span style="display:inline-block;width:3px;height:7px;background:#ffffff;border-radius:1px;margin:0 1px;vertical-align:bottom;"></span><span style="display:inline-block;width:3px;height:11px;background:#ffffff;border-radius:1px;margin:0 1px;vertical-align:bottom;"></span><span style="display:inline-block;width:3px;height:15px;background:#ffffff;border-radius:1px;margin:0 1px;vertical-align:bottom;"></span>
  </span>
</span>`.trim();

export function renderEmailLayout(contentHtml: string, footerNote?: string): string {
  const footer = footerNote ?? 'Automated message from IoT Pilot.';
  return `
<div style="background:#f2f3f5;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">
    <div style="padding:14px 24px;border-bottom:1px solid #eee;">
      ${BRAND_MARK}<span style="display:inline-block;vertical-align:middle;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${BRAND};">IoT<span style="color:#1a1a1a;">Pilot</span></span>
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
