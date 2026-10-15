/** Email abstraction — wire SMTP later. Preview logs only. */
export async function sendEmail(opts: { to: string; subject: string; text: string }) {
  console.info("[nigoto-email]", opts.to, opts.subject, opts.text.slice(0, 180));
  return { ok: true as const };
}
