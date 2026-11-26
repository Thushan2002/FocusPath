import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transport: Transporter | undefined;

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  transport ??= nodemailer.createTransport({ host: env().SMTP_HOST, port: env().SMTP_PORT, secure: false });
  await transport.sendMail({ from: env().SMTP_FROM, to, subject, text, html });
}
