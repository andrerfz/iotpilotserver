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

/**
 * Brand icon — an image-free reproduction of the app favicon (favicon.svg):
 * a dark rounded tile with the "IP" monogram in the brand magenta→cyan.
 * Email clients don't support gradient text (background-clip:text is stripped),
 * so the gradient is approximated by colouring "I" magenta and "P" cyan — same
 * left→right feel, guaranteed to render. Only solid bg + text, no images.
 */
const BRAND_MARK = `
<span style="display:inline-block;vertical-align:middle;width:32px;height:32px;border-radius:6px;background:#1a1a2e;text-align:center;line-height:32px;margin-right:10px;font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:15px;letter-spacing:-0.5px;"><span style="color:#e040fb;">I</span><span style="color:#00bcd4;">P</span></span>`.trim();

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
