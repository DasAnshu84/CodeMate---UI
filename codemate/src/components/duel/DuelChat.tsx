import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import type { ChatMessage } from '../../lib/duel';
import styles from './DuelChat.module.css';

interface DuelChatProps {
  messages: ChatMessage[];
  ownUserId: string | null;
  onSend: (message: string) => void;
  onClose: () => void;
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function DuelChat({ messages, ownUserId, onSend, onClose }: DuelChatProps) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSend, onClose]);

  return (
    <div className={styles.panel} id="duel-chat">
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Chat</h3>
        <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close chat">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <span className={styles.empty}>No messages yet. Say hello!</span>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={styles.message}>
            <div className={styles.messageMeta}>
              <span className={styles.messageUser}>
                {msg.userId === ownUserId ? 'You' : msg.userId}
              </span>
              <span className={styles.messageTime}>{formatTimestamp(msg.timestamp)}</span>
            </div>
            <span className={styles.messageText}>{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          id="chat-input"
        />
        <button className={styles.sendBtn} onClick={handleSend} type="button" aria-label="Send message">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
