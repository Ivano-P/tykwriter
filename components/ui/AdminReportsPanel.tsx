'use client';

import { useState } from 'react';
import { Bug, HelpCircle, Lightbulb, Trash2 } from 'lucide-react';
import {
  REPORT_STATUSES,
  type AdminReportItem,
  type ReportCounts,
  type ReportStatus,
  type ReportType,
} from '@/services/reportTypes';
import {
  adminDeleteReportAction,
  adminUpdateReportAction,
} from '@/actions/reports.action';
import styles from './AdminReportsPanel.module.css';

interface Props {
  initialReports: AdminReportItem[];
  counts: ReportCounts;
}

const TYPE_ICON: Record<ReportType, typeof Bug> = {
  bug: Bug,
  suggestion: Lightbulb,
  question: HelpCircle,
};

const TYPE_LABEL: Record<ReportType, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  question: 'Question',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
};

type Filter = 'all' | ReportStatus;

/**
 * Panneau admin des signalements : filtre par statut, changement de statut,
 * réponse visible par l'auteur, suppression.
 * Page admin volontairement non localisée (usage interne, FR).
 */
export function AdminReportsPanel({ initialReports, counts }: Props) {
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<Filter>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const visible =
    filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  const liveCounts: ReportCounts = {
    open: reports.filter((r) => r.status === 'open').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    closed: reports.filter((r) => r.status === 'closed').length,
  };
  const displayCounts = reports.length > 0 ? liveCounts : counts;

  const changeStatus = async (id: string, status: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    setBusyId(id);
    try {
      await adminUpdateReportAction(id, { status });
    } finally {
      setBusyId(null);
    }
  };

  const saveReply = async (id: string) => {
    const reply = replyDrafts[id] ?? '';
    setBusyId(id);
    try {
      await adminUpdateReportAction(id, { adminReply: reply });
      setReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, adminReply: reply.trim() || null } : r,
        ),
      );
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2500);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer définitivement ce signalement ?')) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
    try {
      await adminDeleteReportAction(id);
    } catch {
      // Échec : la ligne réapparaîtra au prochain chargement de la page.
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.filters}>
        <button
          className={`${styles.filterChip} ${filter === 'all' ? styles.filterChipActive : ''}`}
          onClick={() => setFilter('all')}
        >
          Tous <span className={styles.count}>{reports.length}</span>
        </button>
        {REPORT_STATUSES.map((status) => (
          <button
            key={status}
            className={`${styles.filterChip} ${filter === status ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(status)}
          >
            {STATUS_LABEL[status]}{' '}
            <span className={styles.count}>{displayCounts[status]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>Aucun signalement.</p>
      ) : (
        <div className={styles.list}>
          {visible.map((item) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span
                    className={`${styles.typeBadge} ${styles[`type_${item.type}`]}`}
                  >
                    <Icon size={13} />
                    {TYPE_LABEL[item.type]}
                  </span>
                  <span className={styles.author}>
                    {item.authorName} · {item.authorEmail}
                  </span>
                  <span className={styles.date}>
                    {dateFormatter.format(new Date(item.createdAt))}
                  </span>
                  <button
                    className={styles.deleteButton}
                    onClick={() => remove(item.id)}
                    aria-label="Supprimer le signalement"
                    title="Supprimer le signalement"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDescription}>{item.description}</p>

                <div className={styles.actions}>
                  <label className={styles.statusLabel}>
                    Statut
                    <select
                      className={styles.statusSelect}
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(e) =>
                        changeStatus(item.id, e.target.value as ReportStatus)
                      }
                    >
                      {REPORT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.replyBlock}>
                  <label className={styles.statusLabel}>
                    Réponse (visible par l&apos;auteur)
                    <textarea
                      className={styles.replyInput}
                      rows={2}
                      value={replyDrafts[item.id] ?? item.adminReply ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className={styles.replyButton}
                    onClick={() => saveReply(item.id)}
                    disabled={busyId === item.id}
                  >
                    {savedId === item.id ? 'Enregistré ✓' : 'Enregistrer la réponse'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
