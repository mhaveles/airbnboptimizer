import { Resend } from 'resend';

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

function buildEmailHtml(description: string): string {
  // Escape HTML entities in the description
  const safeDescription = description
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Premium Airbnb Description</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#FF5A5F;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">
                Airbnb<span style="font-weight:400;">Optimizer</span>
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#222222;font-size:24px;font-weight:700;">
                Your listing, upgraded.
              </h2>
              <p style="margin:0 0 24px;color:#717171;font-size:16px;line-height:1.5;">
                Here&rsquo;s your professionally written Airbnb description. Copy and paste it directly into your listing.
              </p>
              <!-- Description Box -->
              <div style="background-color:#f7f7f7;border:1px solid #ebebeb;border-radius:8px;padding:24px;margin-bottom:24px;">
                <p style="margin:0;color:#222222;font-size:15px;line-height:1.7;">
                  ${safeDescription}
                </p>
              </div>
              <p style="margin:0 0 24px;color:#717171;font-size:14px;line-height:1.5;">
                <strong>How to use:</strong> Log into Airbnb &rarr; Go to your listing &rarr; Edit &rarr; Description &rarr; Paste the text above &rarr; Save.
              </p>
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://airbnboptimizer.com" style="display:inline-block;background-color:#FF5A5F;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Optimize Another Listing
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #ebebeb;">
              <p style="margin:0;color:#b0b0b0;font-size:12px;text-align:center;line-height:1.5;">
                &copy; AirbnbOptimizer.com &mdash; Small changes, big $$$
                <br>
                Questions? Reply to this email or reach us at airbnboptimizerr@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send the paid description email to the user.
 */
export async function sendDescriptionEmail(
  to: string,
  description: string
): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: 'Arthur <arthur@hello.airbnboptimizer.com>',
    to,
    subject: 'Your Listing, upgraded.',
    html: buildEmailHtml(description),
  });
}
