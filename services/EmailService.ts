import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * `family` est une vraie option nodemailer (transmise à net.connect) mais
 * absente de @types/nodemailer (types v8 pour nodemailer v9) : on l'ajoute
 * localement au type plutôt que de contourner le contrôle par un cast.
 */
type SmtpOptions = SMTPTransport.Options & { family?: number };

/**
 * Envoi d'emails transactionnels via le SMTP du domaine (Hostinger).
 * Authentification avec SMTP_USER (contact@tykdev.com) mais expéditeur
 * affiché = SMTP_FROM (alias no-reply@tykdev.com).
 * Transport paresseux : rien n'est créé à l'import (build Docker sans env).
 */
export class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT ?? 465);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      if (!host || !user || !pass) {
        throw new Error('SMTP_NOT_CONFIGURED');
      }
      const options: SmtpOptions = {
        host,
        port,
        // 465 = TLS implicite ; 587 = STARTTLS.
        secure: port === 465,
        auth: { user, pass },
        // IPv4 forcé : la résolution IPv6 de smtp.hostinger.com échoue en
        // ENETUNREACH sur les machines sans route IPv6.
        family: 4,
      };
      this.transporter = nodemailer.createTransport(options);
    }
    return this.transporter;
  }

  private static from(): string {
    return `"Tykwriter" <${process.env.SMTP_FROM ?? 'no-reply@tykdev.com'}>`;
  }

  /** Email de réinitialisation de mot de passe (lien valable 1 h). */
  static async sendPasswordReset(to: string, url: string): Promise<void> {
    await this.getTransporter().sendMail({
      from: this.from(),
      to,
      subject: 'Réinitialisation de votre mot de passe Tykwriter',
      text:
        `Bonjour,\n\n` +
        `Une réinitialisation du mot de passe de votre compte Tykwriter a été demandée.\n` +
        `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n\n` +
        `${url}\n\n` +
        `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.\n\n` +
        `— Tykwriter\n\n` +
        `(English: a password reset was requested for your Tykwriter account. ` +
        `Use the link above within 1 hour, or ignore this email if you didn't request it.)`,
      html:
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">` +
        `<h2 style="color:#0F52BA">Tykwriter</h2>` +
        `<p>Bonjour,</p>` +
        `<p>Une réinitialisation du mot de passe de votre compte Tykwriter a été demandée.</p>` +
        `<p style="margin:24px 0">` +
        `<a href="${url}" style="background:#0F52BA;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">` +
        `Choisir un nouveau mot de passe</a></p>` +
        `<p style="font-size:13px;color:#6b7280">Ce lien est valable 1 heure. ` +
        `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>` +
        `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">` +
        `<p style="font-size:12px;color:#9ca3af">English: a password reset was requested for your Tykwriter account. ` +
        `Use the button above within 1 hour, or ignore this email if you didn't request it.</p>` +
        `</div>`,
    });
  }
}
