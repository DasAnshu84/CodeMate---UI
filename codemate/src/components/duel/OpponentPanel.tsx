import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { OpponentActivity, OpponentSubmission } from '../../lib/duel';
import { Spinner } from '../ui/Spinner';
import styles from './OpponentPanel.module.css';

interface OpponentPanelProps {
  activity: OpponentActivity | null;
  submission: OpponentSubmission | null;
  triggerPulse?: boolean;
}

// Pseudo line widths fallback for when code string is not provided
const GHOST_LINE_WIDTHS = [45, 70, 85, 30, 60, 90, 40, 75, 50, 65, 35, 80];

function getMonacoLang(lang?: string): string {
  if (!lang) return 'python';
  const l = lang.toLowerCase();
  if (l.includes('py')) return 'python';
  if (l.includes('js') || l.includes('javascript')) return 'javascript';
  if (l.includes('c++') || l.includes('cpp')) return 'cpp';
  if (l.includes('java')) return 'java';
  return 'python';
}

function getExt(lang?: string): string {
  if (!lang) return 'py';
  const l = lang.toLowerCase();
  if (l.includes('py')) return 'py';
  if (l.includes('js') || l.includes('javascript')) return 'js';
  if (l.includes('c++') || l.includes('cpp')) return 'cpp';
  if (l.includes('java')) return 'java';
  return 'py';
}

export function OpponentPanel({ activity, submission, triggerPulse = false }: OpponentPanelProps) {
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [idleSeconds, setIdleSeconds] = useState<number>(0);

  // Update last active timestamp when activity arrives
  useEffect(() => {
    if (activity) {
      setLastActiveTime(Date.now());
      setIdleSeconds(0);
    }
  }, [activity]);

  // Tick idle seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastActiveTime) / 1000);
      setIdleSeconds(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastActiveTime]);

  const isTyping = idleSeconds < 3 && activity != null;
  const isEvaluating = submission?.status === 'EVALUATING' || (submission?.completed != null && submission.completed < submission.total);
  const evalProgressPct = submission?.total ? Math.round(((submission.completed ?? 0) / submission.total) * 100) : 0;
  const codeLength = activity?.code ? activity.code.length : (activity ? activity.codeLength : 0);

  // Active line calculation for fallback visualizer
  const activeLineIndex = Math.min(Math.floor(codeLength / 25), GHOST_LINE_WIDTHS.length - 1);

  return (
    <aside className={`${styles.panel} ${triggerPulse ? styles.borderPulseRed : ''}`} id="opponent-panel">
      {/* Crimson Identity Bar */}
      <div className={styles.identityBar} />

      {/* Top Header Row */}
      <div className={styles.panelHeader}>
        <div className={styles.playerTagGroup}>
          <span className={styles.playerTag}>OPPONENT IDE</span>
          <div className={styles.statusDotGroup}>
            <span className={`${styles.statusDot} ${isEvaluating ? styles.dotAmber : isTyping ? styles.dotCrimson : styles.dotIdle}`} />
            <span className={styles.statusText}>
              {isEvaluating ? 'Compiling…' : isTyping ? 'Typing…' : `Idle for ${idleSeconds}s`}
            </span>
          </div>
        </div>

        {activity?.language && (
          <span className={styles.langPill}>{activity.language}</span>
        )}
      </div>

      {/* Live Evaluation Progress Banner */}
      {isEvaluating && submission && (
        <div className={styles.evaluatingBlock}>
          <div className={styles.evaluatingHeader}>
            <span className={styles.evalLabel}>
              <Spinner size="sm" />
              <span>Opponent Submission Evaluation</span>
            </span>
            <span className={styles.evalCount}>{submission.completed ?? 0}/{submission.total}</span>
          </div>
          <div className={styles.evalTrack}>
            <div className={styles.evalFill} style={{ width: `${evalProgressPct}%` }} />
          </div>
        </div>
      )}

      {/* Live Opponent Code Container */}
      <div className={styles.ghostEditorContainer}>
        <div className={styles.ghostHeader}>
          <span className={styles.ghostDotRed} />
          <span className={styles.ghostDotYellow} />
          <span className={styles.ghostDotGreen} />
          <span className={styles.ghostFileName}>
            opponent_solution.{getExt(activity?.language)}
          </span>
          <span className={styles.readOnlyBadge}>READ ONLY</span>
        </div>

        {activity?.code !== undefined ? (
          <div className={styles.monacoWrapper}>
            <Editor
              height="100%"
              language={getMonacoLang(activity.language)}
              value={activity.code}
              theme="vs-dark"
              loading={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Spinner size="md" />
                </div>
              }
              options={{
                readOnly: true,
                domReadOnly: true,
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbersMinChars: 3,
                padding: { top: 8, bottom: 8 },
                renderLineHighlight: 'none',
                cursorBlinking: 'solid',
                smoothScrolling: true,
                tabSize: 4,
                wordWrap: 'on',
                automaticLayout: true,
                glyphMargin: false,
                folding: true,
                contextmenu: false,
                quickSuggestions: false,
                selectionHighlight: false,
                occurrencesHighlight: 'off',
              }}
            />
          </div>
        ) : (
          <div className={styles.ghostLines}>
            {GHOST_LINE_WIDTHS.map((width, idx) => {
              const isActive = isTyping && idx === activeLineIndex;
              const isFilled = idx <= activeLineIndex && codeLength > 0;
              return (
                <div key={idx} className={styles.ghostLineRow}>
                  <span className={styles.ghostLineNum}>{idx + 1}</span>
                  <div
                    className={`${styles.ghostLineBar} ${isActive ? styles.ghostLineActive : isFilled ? styles.ghostLineFilled : ''}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Telemetry & Metrics Bar */}
      <div className={styles.telemetryCard}>
        <div className={styles.telemetryHeader}>
          <span className={styles.telemetryLabel}>Telemetry Data</span>
          <span className={styles.telemetryLiveBadge}>
            <span className={styles.liveDot} /> LIVE FEED
          </span>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>{codeLength}</span>
            <span className={styles.metricSub}>Characters</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>{activity?.code ? activity.code.split('\n').length : 0}</span>
            <span className={styles.metricSub}>Lines</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>{isTyping ? Math.round(codeLength / Math.max(idleSeconds + 1, 1) * 6) : 0}</span>
            <span className={styles.metricSub}>Est. KPM</span>
          </div>
        </div>

        {/* Typing Cadence Visualizer Bar */}
        <div className={styles.cadenceTrack}>
          <div
            className={styles.cadenceFill}
            style={{ width: `${Math.min((codeLength / 600) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Opponent Last Submission Result */}
      {submission && !isEvaluating && (
        <div className={styles.submissionCard}>
          <div className={styles.subCardHeader}>
            <span className={styles.subCardTitle}>Last Submission Outcome</span>
            <span className={styles.subCardScore}>
              {submission.passed ?? 0}/{submission.total} Passed
            </span>
          </div>
          <p className={styles.subCardMessage}>{submission.message}</p>
        </div>
      )}
    </aside>
  );
}
