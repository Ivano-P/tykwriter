'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Bug,
  Download,
  HelpCircle,
  ImagePlus,
  Lightbulb,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  MAX_REPORT_ATTACHMENTS,
  REPORT_TYPES,
  type ReportAttachment,
  type ReportItem,
  type ReportStatus,
  type ReportType,
} from '@/services/reportTypes';
import {
  createReportAction,
  deleteMyReportAction,
} from '@/actions/reports.action';
import {
  createReportImageUploadAction,
  deleteReportImageAction,
} from '@/actions/storage.action';
import styles from './signalements.module.css';

interface Props {
  initialReports: ReportItem[];
}

const TYPE_ICON: Record<ReportType, typeof Bug> = {
  bug: Bug,
  suggestion: Lightbulb,
  question: HelpCircle,
};

/** Espace signalements de l'utilisateur : création + suivi (façon issues). */
export function ReportsClient({ initialReports }: Props) {
  const t = useTranslations('reports');
  const locale = useLocale();

  const [reports, setReports] = useState(initialReports);
  const [isFormOpen, setIsFormOpen] = useState(initialReports.length === 0);
  const [type, setType] = useState<ReportType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  /** Captures déjà envoyées sur R2, en attente d'être liées au signalement. */
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>(
    'idle',
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: File[]) => {
    const room = MAX_REPORT_ATTACHMENTS - attachments.length;
    if (room <= 0) return;
    setUploadState('uploading');
    let failed = false;
    for (const file of files.slice(0, room)) {
      try {
        const ticket = await createReportImageUploadAction(
          file.type,
          file.size,
        );
        const res = await fetch(ticket.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!res.ok) throw new Error('UPLOAD_FAILED');
        setAttachments((prev) => [
          ...prev,
          { url: ticket.publicUrl, key: ticket.key, name: file.name },
        ]);
      } catch {
        failed = true;
      }
    }
    setUploadState(failed ? 'error' : 'idle');
  };

  const removeAttachment = async (key: string) => {
    setAttachments((prev) => prev.filter((a) => a.key !== key));
    try {
      // Suppression immédiate sur R2 : sans cela le fichier resterait orphelin,
      // aucun signalement ne le référençant jamais.
      await deleteReportImageAction(key);
    } catch {
      // Best effort : un orphelin coûte quelques Ko, on ne bloque pas l'UI.
    }
  };

  /** Téléchargement forcé : le bucket est sur un autre domaine, l'attribut
   *  `download` y est ignoré — on passe par un blob. */
  const downloadAttachment = async (attachment: ReportAttachment) => {
    try {
      const res = await fetch(attachment.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(attachment.url, '_blank', 'noopener');
    }
  };

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending' || !title.trim() || !description.trim()) return;
    setState('sending');
    try {
      const created = await createReportAction({
        type,
        title,
        description,
        attachmentsJson:
          attachments.length > 0 ? JSON.stringify(attachments) : undefined,
      });
      setReports((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setType('bug');
      setAttachments([]);
      setIsFormOpen(false);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteMyReportAction(id);
    } catch {
      // Échec : la ligne réapparaîtra au prochain chargement.
    }
  };

  const statusLabel = (status: ReportStatus) => t(`status_${status}`);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>
        <button
          className={styles.newButton}
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          {isFormOpen ? <X size={16} /> : <Plus size={16} />}
          <span>{isFormOpen ? t('cancel') : t('newReport')}</span>
        </button>
      </header>

      {isFormOpen && (
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.typeRow}>
            {REPORT_TYPES.map((value) => {
              const Icon = TYPE_ICON[value];
              return (
                <button
                  key={value}
                  type="button"
                  className={`${styles.typeChip} ${type === value ? styles.typeChipActive : ''}`}
                  onClick={() => setType(value)}
                >
                  <Icon size={14} />
                  <span>{t(`type_${value}`)}</span>
                </button>
              );
            })}
          </div>

          <label className={styles.field}>
            <span className={styles.label}>{t('titleLabel')}</span>
            <input
              className={styles.input}
              type="text"
              value={title}
              placeholder={t('titlePlaceholder')}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('descriptionLabel')}</span>
            <textarea
              className={styles.textarea}
              value={description}
              placeholder={t('descriptionPlaceholder')}
              rows={6}
              maxLength={5000}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>

          {/* Captures d'écran (Cloudflare R2, comme les images des notes) */}
          <div className={styles.field}>
            <span className={styles.label}>
              {t('attachmentsLabel', { max: String(MAX_REPORT_ATTACHMENTS) })}
            </span>

            {attachments.length > 0 && (
              <div className={styles.thumbGrid}>
                {attachments.map((attachment) => (
                  <div key={attachment.key} className={styles.thumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className={styles.thumbImage}
                    />
                    <button
                      type="button"
                      className={styles.thumbRemove}
                      onClick={() => removeAttachment(attachment.key)}
                      aria-label={t('attachmentRemove')}
                      title={t('attachmentRemove')}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className={styles.attachButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={
                uploadState === 'uploading' ||
                attachments.length >= MAX_REPORT_ATTACHMENTS
              }
            >
              <ImagePlus size={15} />
              <span>
                {uploadState === 'uploading'
                  ? t('attachmentUploading')
                  : t('attachmentAdd')}
              </span>
            </button>
            {uploadState === 'error' && (
              <p className={styles.error}>{t('attachmentError')}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length > 0) void uploadFiles(files);
              }}
            />
          </div>

          {state === 'error' && <p className={styles.error}>{t('sendError')}</p>}

          <button
            className={styles.submit}
            type="submit"
            disabled={state === 'sending'}
          >
            {state === 'sending' ? t('sending') : t('submit')}
          </button>
        </form>
      )}

      <section className={styles.list}>
        {reports.length === 0 ? (
          <p className={styles.empty}>{t('empty')}</p>
        ) : (
          reports.map((item) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={`${styles.typeBadge} ${styles[`type_${item.type}`]}`}>
                    <Icon size={13} />
                    {t(`type_${item.type}`)}
                  </span>
                  <span
                    className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                  <span className={styles.date}>
                    {dateFormatter.format(new Date(item.createdAt))}
                  </span>
                  <button
                    className={styles.deleteButton}
                    onClick={() => remove(item.id)}
                    aria-label={t('delete')}
                    title={t('delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardDescription}>{item.description}</p>

                {item.attachments.length > 0 && (
                  <div className={styles.thumbGrid}>
                    {item.attachments.map((attachment) => (
                      <div key={attachment.key} className={styles.thumb}>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={attachment.name}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className={styles.thumbImage}
                          />
                        </a>
                        <button
                          type="button"
                          className={styles.thumbDownload}
                          onClick={() => downloadAttachment(attachment)}
                          aria-label={t('attachmentDownload')}
                          title={t('attachmentDownload')}
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {item.adminReply && (
                  <div className={styles.reply}>
                    <span className={styles.replyLabel}>{t('adminReply')}</span>
                    <p className={styles.replyText}>{item.adminReply}</p>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
