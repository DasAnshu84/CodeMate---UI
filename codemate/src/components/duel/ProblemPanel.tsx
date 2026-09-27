import { useState } from 'react';
import { useClipboard } from '../../hooks/useClipboard';
import styles from './ProblemPanel.module.css';

/* ── Types ── */

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemPanelProps {
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
  constraints: string[];
  examples: ProblemExample[];
  collapsed: boolean;
  onToggle: () => void;
}

/* ── Helpers & Icons ── */

const DIFF_CLASS: Record<string, string> = {
  EASY: styles.diffEasy,
  MEDIUM: styles.diffMedium,
  HARD: styles.diffHard,
};

function CopySmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ShieldAlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CodeBlocksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ExampleBlock({ example, index }: { example: ProblemExample; index: number }) {
  const { copy, copied } = useClipboard();
  const copyText = `Input: ${example.input}\nOutput: ${example.output}`;

  return (
    <div className={styles.example}>
      <div className={styles.exampleHeader}>
        <span className={styles.exampleLabel}>Example {index + 1}</span>
        <button className={styles.exampleCopyBtn} onClick={() => copy(copyText)} type="button" title="Copy example">
          {copied ? <span className={styles.copiedBadge}>Copied!</span> : <CopySmallIcon />}
        </button>
      </div>
      <div className={styles.exampleBody}>
        <div className={styles.exampleRow}>
          <span className={styles.exampleKey}>Input:</span>
          <code className={styles.exampleValue}>{example.input}</code>
        </div>
        <div className={styles.exampleRow}>
          <span className={styles.exampleKey}>Output:</span>
          <code className={styles.exampleValue}>{example.output}</code>
        </div>
        {example.explanation && (
          <p className={styles.explanation}>{example.explanation}</p>
        )}
      </div>
    </div>
  );
}

/* ── Component ── */

export function ProblemPanel({
  title,
  difficulty,
  description,
  constraints,
  examples,
  collapsed,
  onToggle,
}: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState<'problem' | 'constraints' | 'examples'>('problem');

  return (
    <>
      {/* Permanent 48px Collapsed Rail */}
      <aside className={styles.rail} id="problem-rail">
        <button
          className={styles.railToggleBtn}
          onClick={onToggle}
          type="button"
          aria-label={collapsed ? 'Expand problem drawer' : 'Collapse problem drawer'}
          title={collapsed ? 'Expand problem drawer (Alt+P)' : 'Collapse drawer'}
        >
          <ChevronIcon expanded={!collapsed} />
        </button>

        <div className={styles.railIcons}>
          <button
            className={`${styles.railIconBtn} ${activeTab === 'problem' && !collapsed ? styles.railIconActive : ''}`}
            onClick={() => {
              setActiveTab('problem');
              if (collapsed) onToggle();
            }}
            title="Problem Statement"
            type="button"
          >
            <FileTextIcon />
          </button>
          <button
            className={`${styles.railIconBtn} ${activeTab === 'constraints' && !collapsed ? styles.railIconActive : ''}`}
            onClick={() => {
              setActiveTab('constraints');
              if (collapsed) onToggle();
            }}
            title="Constraints"
            type="button"
          >
            <ShieldAlertIcon />
          </button>
          <button
            className={`${styles.railIconBtn} ${activeTab === 'examples' && !collapsed ? styles.railIconActive : ''}`}
            onClick={() => {
              setActiveTab('examples');
              if (collapsed) onToggle();
            }}
            title="Examples"
            type="button"
          >
            <CodeBlocksIcon />
          </button>
        </div>

        <div className={styles.railRotatedLabel} onClick={onToggle}>
          <span className={styles.railTitle}>{title}</span>
          <span className={`${styles.railBadge} ${DIFF_CLASS[difficulty]}`}>{difficulty}</span>
        </div>
      </aside>

      {/* Expanded Glassmorphic Overlay Drawer */}
      <div className={`${styles.drawerOverlay} ${collapsed ? styles.drawerHidden : styles.drawerVisible}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleRow}>
            <h2 className={styles.title}>{title}</h2>
            <span className={`${styles.diffBadge} ${DIFF_CLASS[difficulty]}`}>{difficulty}</span>
          </div>

          <button
            className={styles.closeBtn}
            onClick={onToggle}
            type="button"
            aria-label="Close problem drawer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'problem' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('problem')}
            type="button"
          >
            Problem
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'constraints' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('constraints')}
            type="button"
          >
            Constraints ({constraints.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'examples' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('examples')}
            type="button"
          >
            Examples ({examples.length})
          </button>
        </div>

        <div className={styles.contentScroll}>
          {activeTab === 'problem' && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Description</span>
              <p className={styles.description}>{description}</p>
            </div>
          )}

          {activeTab === 'constraints' && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Constraints</span>
              <ul className={styles.constraintsList}>
                {constraints.map((c, i) => (
                  <li key={i} className={styles.constraintItem}>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionLabel}>Test Cases & Examples</span>
              <div className={styles.examplesList}>
                {examples.map((ex, i) => (
                  <ExampleBlock key={i} example={ex} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Show full view if not strictly single tab or scrollable overview */}
          {activeTab === 'problem' && (
            <>
              {constraints.length > 0 && (
                <div className={styles.sectionBlock} style={{ marginTop: 20 }}>
                  <span className={styles.sectionLabel}>Constraints</span>
                  <ul className={styles.constraintsList}>
                    {constraints.map((c, i) => (
                      <li key={i} className={styles.constraintItem}>
                        <code>{c}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {examples.length > 0 && (
                <div className={styles.sectionBlock} style={{ marginTop: 20 }}>
                  <span className={styles.sectionLabel}>Examples</span>
                  <div className={styles.examplesList}>
                    {examples.map((ex, i) => (
                      <ExampleBlock key={i} example={ex} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
