import nodemailer from "nodemailer";

export interface Mailer {
  sendRevisionReminder(to: string, name: string, items: { title: string; minutes: number; reason: string }[]): Promise<void>;
}

export function createMailer(opts: { host: string; port: number; from: string; appUrl: string }): Mailer {
  const transport = nodemailer.createTransport({ host: opts.host, port: opts.port, secure: false });
  return {
    async sendRevisionReminder(to, name, items) {
      const total = items.reduce((s, i) => s + i.minutes, 0);
      const lines = items.map((i) => `• ${i.title} (${i.minutes} min) — ${i.reason}`).join("\n");
      await transport.sendMail({
        from: opts.from,
        to,
        subject: `${items.length} quick revision${items.length > 1 ? "s" : ""} due · about ${total} min`,
        text: `Hi ${name.split(" ")[0]},\n\nA short recall now is the cheapest way to keep what you've learned:\n\n${lines}\n\nOpen FocusPath: ${opts.appUrl}/today\n`,
      });
    },
  };
}
