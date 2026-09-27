import { useState } from 'react';
import type { ActiveSubmissionState } from '../../hooks/useDuel';
import { Spinner } from '../ui/Spinner';
import styles from './TestResults.module.css';

interface TestResultsProps {
  submission: ActiveSubmissionState;
}

export function TestResults({ submission }: TestResultsProps) {
  const [open, setOpen] = useState(true);

  const { totalTestCases, completedTestCases, isEvaluating, testCases, finalResult } = submission;
  const isComplete = !isEvaluating && finalResult !== null;
  const allPassed = finalResult ? finalResult.passedTestCases === finalResult.totalTestCases : false;

  return (
    <div className={styles.container} id="test-results">
      {/* Header — clickable to toggle */}
      <div className={styles.header} onClick={() => setOpen((v) => !v)} role="button" tabIndex={0}>
        <div className={styles.headerLeft}>
          <span className={styles.headerLabel}>Results</span>
          
          {isEvaluating ? (
            <span className={styles.summaryPartial} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Spinner size="sm" />
              Evaluating ({completedTestCases}/{totalTestCases})
            </span>
          ) : isComplete ? (
            <span className={allPassed ? styles.summaryPass : styles.summaryPartial}>
              {finalResult.passedTestCases}/{finalResult.totalTestCases} passed
            </span>
          ) : null}

          {finalResult && (
            <>
              <span className={styles.scorePill}>Score: {finalResult.score}</span>
              {finalResult.executionTimeMs != null && (
                <span className={styles.timePill}>{finalResult.executionTimeMs.toFixed(1)} ms</span>
              )}
              {finalResult.memoryUsedKb != null && (
                <span className={styles.timePill}>{(finalResult.memoryUsedKb / 1024).toFixed(1)} MB</span>
              )}
            </>
          )}
        </div>

        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </div>

      {/* Test case list */}
      {open && (
        <div className={styles.testList}>
          {Array.from({ length: totalTestCases }, (_, i) => i + 1).map((idx) => {
            const tc = testCases[idx];
            const status = tc ? tc.status : 'PENDING';
            const isAccepted = status === 'ACCEPTED';
            const isPending = status === 'PENDING';

            let rowClass = styles.testPending;
            if (!isPending) {
              rowClass = isAccepted ? styles.testPass : styles.testFail;
            }

            return (
              <div key={idx} className={`${styles.testRow} ${rowClass}`}>
                <span className={styles.testIcon}>
                  {isPending ? (
                    <Spinner size="sm" />
                  ) : isAccepted ? (
                    '✓'
                  ) : (
                    '✗'
                  )}
                </span>
                <span className={styles.testName}>
                  Test {idx}
                  {tc?.isHidden && <span className={styles.hiddenTag} style={{ marginLeft: 6 }}>Hidden</span>}
                </span>

                <span className={styles.statusTag}>
                  {isPending ? 'Queued...' : status}
                </span>

                {tc && (tc.executionTimeMs != null || tc.memoryUsedKb != null) && (
                  <span className={styles.metrics}>
                    {tc.executionTimeMs != null ? `${tc.executionTimeMs.toFixed(1)}ms` : ''}
                    {tc.executionTimeMs != null && tc.memoryUsedKb != null ? ' • ' : ''}
                    {tc.memoryUsedKb != null ? `${tc.memoryUsedKb.toFixed(0)}KB` : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

