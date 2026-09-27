import { useCallback, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { Spinner } from '../ui/Spinner';
import styles from './CodeEditor.module.css';

/* ── Types ── */

export type DuelLanguage = 'PYTHON' | 'JAVASCRIPT' | 'CPP' | 'JAVA';

interface CodeEditorProps {
  language: DuelLanguage;
  onLanguageChange: (lang: DuelLanguage) => void;
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
  triggerPulse?: boolean;
}

/* ── Language mapping ── */

const LANG_OPTIONS: { value: DuelLanguage; label: string; monacoId: string }[] = [
  { value: 'PYTHON', label: 'Python 3.10', monacoId: 'python' },
  { value: 'JAVASCRIPT', label: 'JavaScript (ES6)', monacoId: 'javascript' },
  { value: 'CPP', label: 'C++ 17', monacoId: 'cpp' },
  { value: 'JAVA', label: 'Java 17', monacoId: 'java' },
];

function getMonacoId(lang: DuelLanguage): string {
  return LANG_OPTIONS.find((l) => l.value === lang)?.monacoId ?? 'python';
}

const STARTER_CODE: Record<DuelLanguage, string> = {
  PYTHON: '# Write your solution here\n\ndef solve():\n    pass\n',
  JAVASCRIPT: '// Write your solution here\n\nfunction solve() {\n  \n}\n',
  CPP: '// Write your solution here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
  JAVA: '// Write your solution here\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
};

/* ── Component ── */

export function CodeEditor({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onSubmit,
  submitting,
  disabled,
  triggerPulse = false,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    // Ctrl+Enter / Cmd+Enter → submit
    editor.addAction({
      id: 'submit-code',
      label: 'Submit Code',
      keybindings: [
        2048 | 3, // CtrlCmd + Enter
      ],
      run: () => {
        onSubmit();
      },
    });

    editor.focus();
  }, [onSubmit]);

  const handleChange = useCallback((value: string | undefined) => {
    onCodeChange(value ?? '');
  }, [onCodeChange]);

  const handleLangChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as DuelLanguage;
    onLanguageChange(newLang);
    const currentCode = editorRef.current?.getValue() ?? '';
    const isStarter = Object.values(STARTER_CODE).some((s) => currentCode.trim() === s.trim());
    if (!currentCode.trim() || isStarter) {
      onCodeChange(STARTER_CODE[newLang]);
    }
  }, [onLanguageChange, onCodeChange]);

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

  return (
    <div className={`${styles.wrapper} ${triggerPulse ? styles.borderPulseBlue : ''}`}>
      {/* Top Identity Line */}
      <div className={styles.identityBar} />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.playerHeader}>
          <span className={styles.playerTag}>YOUR IDE</span>
          <span className={styles.statusDot} title="Status: Active Editor" />
        </div>

        <select
          className={styles.langSelect}
          value={language}
          onChange={handleLangChange}
          id="language-selector"
          disabled={disabled}
        >
          {LANG_OPTIONS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <span className={styles.toolbarSpacer} />

        <span className={styles.shortcutHint}>
          <kbd className={styles.kbd}>{isMac ? '⌘' : 'Ctrl'}</kbd>
          <span>+</span>
          <kbd className={styles.kbd}>Enter</kbd>
        </span>

        {/* Action CTAs */}
        <button
          className={styles.runBtn}
          onClick={onSubmit}
          disabled={disabled || submitting}
          type="button"
          title="Run solution tests"
        >
          Run Tests
        </button>

        <button
          className={styles.submitBtn}
          onClick={onSubmit}
          disabled={disabled || submitting}
          type="button"
          id="submit-code-btn"
        >
          {submitting ? (
            <>
              <Spinner size="sm" />
              <span>Evaluating…</span>
            </>
          ) : (
            <>
              <span>Submit</span>
              <span className={styles.submitIcon}>🚀</span>
            </>
          )}
        </button>
      </div>

      {/* Monaco Editor */}
      <div className={styles.editorContainer}>
        <Editor
          height="100%"
          language={getMonacoId(language)}
          value={code}
          onChange={handleChange}
          onMount={handleMount}
          theme="vs-dark"
          loading={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Spinner size="md" />
            </div>
          }
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            tabSize: 4,
            wordWrap: 'on',
            readOnly: disabled,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
