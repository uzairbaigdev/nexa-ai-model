import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import './App.css';

// Initialize SDK using Vite's environment variable
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Draft a professional email',
  'Plan a 3-day trip to Kyoto',
  'Help me debug a React error',
];

/* ---------------- Icons ---------------- */

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12L20 4L14 20L11 13L4 12Z" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12L9 17L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 12a9 9 0 1 1 3 6.7M3 12v5h5M3 12V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4v14M6 12l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Lightweight markdown renderer ---------------- */

function renderInline(text, keyPrefix) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, i) => {
    const key = `${keyPrefix}-${i}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code className="inline-code" key={key}>{token.slice(1, -1)}</code>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return <span key={key}>{token}</span>;
  });
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Non-critical.
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{lang || 'code'}</span>
        <button className="code-copy-btn" onClick={handleCopy} aria-label="Copy code">
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderMarkdown(text) {
  const parts = text.split(/```(\w*)\n?([\s\S]*?)```/g);
  const nodes = [];

  for (let i = 0; i < parts.length; i += 3) {
    const plain = parts[i];
    const lang = parts[i + 1];
    const code = parts[i + 2];

    if (plain) {
      const paragraphs = plain.split(/\n{2,}/).filter((p) => p.trim() !== '');
      paragraphs.forEach((para, pIdx) => {
        const lines = para.split('\n').filter((l) => l.trim() !== '');
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));
        const isOrdered = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));

        if (isList) {
          nodes.push(
            <ul className="md-list" key={`ul-${i}-${pIdx}`}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*[-*]\s+/, ''), `ul-${i}-${pIdx}-${li}`)}</li>
              ))}
            </ul>
          );
        } else if (isOrdered) {
          nodes.push(
            <ol className="md-list" key={`ol-${i}-${pIdx}`}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*\d+\.\s+/, ''), `ol-${i}-${pIdx}-${li}`)}</li>
              ))}
            </ol>
          );
        } else {
          nodes.push(
            <p className="md-paragraph" key={`p-${i}-${pIdx}`}>
              {renderInline(para, `p-${i}-${pIdx}`)}
            </p>
          );
        }
      });
    }

    if (code !== undefined) {
      nodes.push(<CodeBlock code={code.replace(/\n$/, '')} lang={lang} key={`code-${i}`} />);
    }
  }

  return nodes;
}

/* ---------------- Subcomponents ---------------- */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Non-critical.
    }
  };

  return (
    <button className="copy-btn" onClick={handleCopy} aria-label="Copy response">
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="message-row bot">
      <div className="avatar" aria-hidden="true">N</div>
      <div className="typing-indicator" role="status" aria-label="Nexa is responding">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }) {
  return (
    <div className="empty-state">
      <h1 className="empty-title">Hello, I'm Nexa</h1>
      <p className="empty-subtitle">Ask me anything — I can help you write, plan, learn, and debug.</p>
      <div className="suggestion-grid">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="suggestion-chip" onClick={() => onSuggestion(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const viewportRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = viewportRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 240);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: trimmed,
      });

      setMessages((prev) => [...prev, { sender: 'bot', text: response.text }]);
    } catch (error) {
      console.error('Error fetching response:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Something went wrong while processing that request.',
          isError: true,
          retryText: trimmed,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    if (loading) return;
    setMessages([]);
    setInput('');
  };

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span className="brand-name">Nexa AI</span>
        </div>
        <div className="top-bar-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <button className="new-chat-btn" onClick={handleNewChat} disabled={messages.length === 0}>
            <PlusIcon />
            <span>New chat</span>
          </button>
        </div>
      </header>

      <main className="chat-viewport" ref={viewportRef} onScroll={handleScroll}>
        <div className="chat-inner">
          {messages.length === 0 ? (
            <EmptyState onSuggestion={(s) => sendMessage(s)} />
          ) : (
            <>
              {messages.map((msg, index) =>
                msg.sender === 'user' ? (
                  <div className="message-row user enter" key={index}>
                    <div className="bubble user-bubble">{msg.text}</div>
                  </div>
                ) : (
                  <div className={`message-row bot enter${msg.isError ? ' error' : ''}`} key={index}>
                    <div className="avatar" aria-hidden="true">N</div>
                    <div className="bot-content">
                      {msg.isError ? (
                        <div className="error-box">
                          <span>{msg.text}</span>
                          <button className="retry-btn" onClick={() => sendMessage(msg.retryText)}>
                            <RetryIcon />
                            <span>Retry</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="bot-text">{renderMarkdown(msg.text)}</div>
                          <CopyButton text={msg.text} />
                        </>
                      )}
                    </div>
                  </div>
                )
              )}
              {loading && <TypingIndicator />}
            </>
          )}
        </div>

        {showScrollBtn && (
          <button className="scroll-bottom-btn" onClick={() => scrollToBottom('smooth')} aria-label="Scroll to latest message">
            <DownArrowIcon />
          </button>
        )}
      </main>

      <footer className="composer">
        <div className="composer-inner">
          <textarea
            ref={textareaRef}
            className="composer-input"
            placeholder="Message Nexa AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
        <p className="disclaimer">Nexa AI can make mistakes. Check important information.</p>
      </footer>
    </div>
  );
}

export default App;