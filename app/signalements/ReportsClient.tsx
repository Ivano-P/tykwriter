'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bug, Lightbulb, HelpCircle, Plus, Trash2, X } from 'lucide-react';
import {
  REPORT_TYPES,
  type ReportItem,
  type ReportStatus,
  type ReportType,
} from '@/services/reportTypes';
import {
  createReportAction,
  deleteMyReportAction,
} from '@/actions/reports.action';
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

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending' || !title.trim() || !description.trim()) return;
    setState('sending');
    try {
      const created = await createReportAction({ type, title, description });
      setReports((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setType('bug');
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
