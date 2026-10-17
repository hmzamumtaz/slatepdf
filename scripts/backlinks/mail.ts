/**
 * Sending through your own mailbox (SMTP) and reading replies from it (IMAP).
 * Outreach goes out one at a time, from a real address, with an opt-out line
 * and postal address, which is what CAN-SPAM and GDPR-style rules expect.
 */
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config } from './config';
import type { Prospect, State } from './store';
import { log, save } from './store';

const transport = () => nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

const footer = () =>
  `\n\n--\n${config.sender.name}, ${config.site.name} (${config.site.url})\n${config.sender.postalAddress}\n` +
  `Not interested? Reply "no thanks" and you won't hear from us again.`;

/** Sends (or, when not live, records a dry-run draft) and threads it under the previous message. */
export async function send(p: Prospect, subject: string, body: string): Promise<void> {
  const to = p.contactEmail!;
  const full = body.trim() + footer();
  const prev = [...p.emails].reverse().find(e => e.messageId);
  const at = new Date().toISOString();

  if (!config.live) {
    p.emails.push({ direction: 'out', at, subject, body: full, dryRun: true });
    log(`[dry run] would email ${to}: "${subject}"`);
    return;
  }

  const info = await transport().sendMail({
    from: `"${config.sender.name}" <${config.sender.email}>`,
    to,
    subject,
    text: full,
    headers: {
      'List-Unsubscribe': `<mailto:${config.sender.email}?subject=unsubscribe>`,
      ...(prev?.messageId ? { 'In-Reply-To': prev.messageId, References: prev.messageId } : {}),
    },
  });
  p.emails.push({ direction: 'out', at, subject, body: full, messageId: info.messageId });
  log(`emailed ${to}: "${subject}"`);
}

const stripQuoted = (text: string) => text
  .split(/\n(?:On .+wrote:|-{2,} ?Original Message|From: .+)\n/)[0]
  .split('\n').filter(l => !l.startsWith('>')).join('\n').trim();

/**
 * Pulls new replies from the inbox and attaches each one to its prospect,
 * matched by thread headers first, then by sender address. Returns prospects that got mail.
 */
export async function collectReplies(state: State): Promise<Prospect[]> {
  if (!config.live) return [];
  const active = state.prospects.filter(p => p.contactEmail && p.emails.some(e => e.direction === 'out'));
  if (!active.length) return [];

  const byMessageId = new Map<string, Prospect>();
  for (const p of active) for (const e of p.emails) if (e.messageId) byMessageId.set(e.messageId, p);
  const byAddress = new Map(active.map(p => [p.contactEmail!.toLowerCase(), p]));

  const since = new Date(Math.min(...active.map(p => new Date(p.emails.find(e => e.direction === 'out')!.at).getTime())));
  const client = new ImapFlow({
    host: config.imap.host, port: config.imap.port, secure: true,
    auth: { user: config.imap.user, pass: config.imap.pass }, logger: false,
  });
  const touched = new Set<Prospect>();
  const recorded: number[] = [];

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    for await (const msg of client.fetch({ since, seen: false }, { uid: true, source: true })) {
      if (!msg.source) continue;
      const mail = await simpleParser(msg.source);
      const refs = [mail.inReplyTo, ...(Array.isArray(mail.references) ? mail.references : [mail.references])].filter(Boolean) as string[];
      const from = mail.from?.value[0]?.address?.toLowerCase() ?? '';
      const p = refs.map(r => byMessageId.get(r)).find(Boolean) ?? byAddress.get(from);
      if (!p || p.emails.some(e => e.messageId && e.messageId === mail.messageId)) continue;

      p.emails.push({
        direction: 'in',
        at: (mail.date ?? new Date()).toISOString(),
        subject: mail.subject ?? '',
        body: stripQuoted(mail.text ?? '').slice(0, 6000),
        messageId: mail.messageId,
      });
      touched.add(p);
      recorded.push(msg.uid);
    }
    // Mark read only once the replies are saved, so a crash re-reads them next run.
    if (recorded.length) {
      save(state);
      await client.messageFlagsAdd(recorded.join(','), ['\\Seen'], { uid: true });
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return [...touched];
}
