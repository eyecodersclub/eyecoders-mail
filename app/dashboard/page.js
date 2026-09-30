"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
      }}
    >
      Loading editor…
    </div>
  ),
});

import "react-quill-new/dist/quill.snow.css";

// ───────── CSV Parser Utility ─────────
function parseCSVEmails(text) {
  // Parse CSV content and extract email-like values
  const emails = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // Split by comma, semicolon, tab, or pipe
    const cells = line.split(/[,;\t|]+/);
    for (const cell of cells) {
      const trimmed = cell.trim().replace(/^["']|["']$/g, ""); // Remove quotes
      if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        emails.push(trimmed);
      } else if (trimmed && /^[a-zA-Z0-9._-]+$/.test(trimmed)) {
        // Looks like a username without domain — add it raw, user will add domain via shortcut
        emails.push(trimmed);
      }
    }
  }
  return emails.filter(Boolean);
}

// ───────── Email Chip Input Component ─────────
function EmailChipsInput({ label, emails, setEmails, placeholder }) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addEmailsRaw = (list) => {
    const unique = list.filter(
      (e) => e && !emails.includes(e)
    );
    if (unique.length > 0) {
      setEmails([...emails, ...unique]);
    }
  };

  const addEmails = (raw) => {
    const newEmails = raw
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    addEmailsRaw(newEmails);
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    const val = inputValue.trim();

    // Enter → @charusat.edu.in
    if (e.key === "Enter") {
      e.preventDefault();
      if (!val) return;

      if (val.includes("@")) {
        // Already has domain, add as-is
        addEmailsRaw([val]);
      } else {
        // Auto-append @charusat.edu.in
        addEmailsRaw([`${val}@charusat.edu.in`]);
      }
      setInputValue("");
      return;
    }

    // Tab → @charusat.ac.in
    if (e.key === "Tab") {
      if (!val) return; // Allow normal tab when empty
      e.preventDefault();

      if (val.includes("@")) {
        addEmailsRaw([val]);
      } else {
        // Auto-append @charusat.ac.in
        addEmailsRaw([`${val}@charusat.ac.in`]);
      }
      setInputValue("");
      return;
    }

    // Comma → add as typed
    if (e.key === ",") {
      e.preventDefault();
      if (val) {
        addEmails(val);
      }
      return;
    }

    // Backspace → remove last chip
    if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    addEmails(pasted);
  };

  const removeEmail = (index) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  // CSV file upload handler
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === "string") {
        const parsed = parseCSVEmails(text);
        addEmailsRaw(parsed);
      }
    };
    reader.readAsText(file);

    // Reset file input so same file can be re-uploaded
    e.target.value = "";
  };

  const clearAll = () => {
    setEmails([]);
    setInputValue("");
  };

  return (
    <div className="email-field">
      <span className="email-field-label">{label}</span>
      <div className="email-field-body">
        <div
          className="email-chips-wrapper"
          onClick={() => inputRef.current?.focus()}
        >
          {emails.map((email, i) => (
            <span
              key={i}
              className={`email-chip ${
                !isValidEmail(email) ? "email-chip-invalid" : ""
              }`}
            >
              {email}
              <button
                type="button"
                className="email-chip-remove"
                onClick={() => removeEmail(i)}
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            className="email-chips-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              emails.length === 0 ? placeholder : "Add more…"
            }
          />
        </div>
        <div className="email-field-actions">
          <button
            type="button"
            className="email-action-btn"
            title="Upload CSV file with emails"
            onClick={() => fileInputRef.current?.click()}
          >
            📄 CSV
          </button>
          {emails.length > 0 && (
            <button
              type="button"
              className="email-action-btn email-action-btn--danger"
              title="Clear all"
              onClick={clearAll}
            >
              🗑️ {emails.length}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            style={{ display: "none" }}
            onChange={handleCSVUpload}
          />
        </div>
      </div>
      <div className="email-field-hints">
        <span className="email-hint">
          <kbd>Enter</kbd> → @charusat.edu.in
        </span>
        <span className="email-hint">
          <kbd>Tab</kbd> → @charusat.ac.in
        </span>
        <span className="email-hint">
          <kbd>,</kbd> → add as typed
        </span>
      </div>
    </div>
  );
}

// ───────── Toast Component ─────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-overlay">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast-icon">
            {toast.type === "success" ? "✅" : "❌"}
          </span>
          <div className="toast-body">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ───────── Quill Modules Config ─────────
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["link", "image"],
    ["blockquote", "code-block"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "indent",
  "align",
  "link",
  "image",
  "blockquote",
  "code-block",
];

// ───────── Mail History Detail Modal ─────────
function HistoryMailModal({ mail, onClose, onReuse }) {
  if (!mail) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <div className="history-modal-title">
            <span
              className={`sent-log-status sent-log-status--${
                mail.success ? "success" : "error"
              }`}
            />
            <h3>{mail.subject || "(No Subject)"}</h3>
          </div>
          <button className="history-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="history-modal-meta">
          <div className="meta-row">
            <span className="meta-label">To:</span>
            <span className="meta-value">{mail.to?.join(", ") || "None"}</span>
          </div>
          {mail.cc && mail.cc.length > 0 && (
            <div className="meta-row">
              <span className="meta-label">CC:</span>
              <span className="meta-value">{mail.cc.join(", ")}</span>
            </div>
          )}
          <div className="meta-row">
            <span className="meta-label">Sent At:</span>
            <span className="meta-value">
              {new Date(mail.time).toLocaleString()}
            </span>
          </div>
          {mail.error && (
            <div className="meta-row meta-row--error">
              <span className="meta-label">Error:</span>
              <span className="meta-value">{mail.error}</span>
            </div>
          )}
        </div>

        <div className="history-modal-body">
          <div className="history-modal-body-label">Email Body Content:</div>
          <div className="history-modal-iframe-wrapper">
            <iframe
              className="history-modal-iframe"
              srcDoc={
                mail.html ||
                `<!DOCTYPE html><html><body><p><em>(Empty content)</em></p></body></html>`
              }
              title="History Email Content"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        <div className="history-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary-small" onClick={() => onReuse(mail)}>
            ✏️ Load & Edit in Composer
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Main Dashboard Page ─────────
export default function DashboardPage() {
  const router = useRouter();

  // Form state
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [subject, setSubject] = useState("");
  const [editorMode, setEditorMode] = useState("wysiwyg"); // "wysiwyg" | "html"
  const [htmlContent, setHtmlContent] = useState("");
  const [rawHtml, setRawHtml] = useState("");
  const [sending, setSending] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState([]);

  // Sent mail log & preview modal state
  const [sentLog, setSentLog] = useState([]);
  const [selectedHistoryMail, setSelectedHistoryMail] = useState(null);

  // Load sent history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("eyecoders_sent_log");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSentLog(parsed);
      }
    } catch (e) {
      console.error("Failed to load sent history", e);
    }
  }, []);

  const saveToSentLog = (logItem) => {
    setSentLog((prev) => {
      const updated = [logItem, ...prev];
      try {
        localStorage.setItem("eyecoders_sent_log", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save sent history", e);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setSentLog([]);
    try {
      localStorage.removeItem("eyecoders_sent_log");
    } catch (e) {}
    addToast("success", "History Cleared", "Sent mail history has been reset.");
  };

  const handleReuseInComposer = (item) => {
    setToEmails(item.to || []);
    setCcEmails(item.cc || []);
    setSubject(item.subject || "");
    const mode = item.editorMode || "wysiwyg";
    setEditorMode(mode);
    if (mode === "wysiwyg") {
      setHtmlContent(item.html || "");
      setRawHtml("");
    } else {
      setRawHtml(item.html || "");
      setHtmlContent("");
    }
    setSelectedHistoryMail(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast(
      "success",
      "Loaded into Composer ✏️",
      "Email content has been loaded. You can now edit and resend it."
    );
  };

  const addToast = useCallback((type, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Switch editor mode — CLEAR old content on switch
  const handleEditorModeChange = (mode) => {
    if (mode === editorMode) return;

    if (mode === "html") {
      // Switching TO html: carry over wysiwyg content, then clear wysiwyg
      setRawHtml(htmlContent);
      setHtmlContent("");
    } else {
      // Switching TO wysiwyg: carry over raw html content, then clear raw
      setHtmlContent(rawHtml);
      setRawHtml("");
    }
    setEditorMode(mode);
  };

  // Get the current HTML content based on active editor
  const getCurrentHtml = () => {
    return editorMode === "wysiwyg" ? htmlContent : rawHtml;
  };

  // Logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  // Send email
  const handleSend = async () => {
    // Validate
    if (toEmails.length === 0) {
      addToast(
        "error",
        "Missing Recipients",
        "Add at least one email in the To field."
      );
      return;
    }
    if (!subject.trim()) {
      addToast("error", "Missing Subject", "Please enter an email subject.");
      return;
    }

    const body = getCurrentHtml();
    if (!body.trim() || body === "<p><br></p>") {
      addToast("error", "Empty Body", "Write some content in the email body.");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toEmails,
          cc: ccEmails,
          subject: subject.trim(),
          html: body,
          text: "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(
          "error",
          "Send Failed",
          data.error || "Something went wrong."
        );
        saveToSentLog({
          id: Date.now(),
          success: false,
          subject: subject.trim(),
          to: [...toEmails],
          cc: [...ccEmails],
          html: body,
          editorMode: editorMode,
          error: data.error,
          time: new Date().toISOString(),
        });
      } else {
        addToast(
          "success",
          "Email Sent! 🎉",
          `Delivered to ${toEmails.join(", ")}`
        );
        saveToSentLog({
          id: Date.now(),
          success: true,
          subject: subject.trim(),
          to: [...toEmails],
          cc: [...ccEmails],
          html: body,
          editorMode: editorMode,
          time: new Date().toISOString(),
        });

        // Reset form
        setToEmails([]);
        setCcEmails([]);
        setSubject("");
        setHtmlContent("");
        setRawHtml("");
      }
    } catch (err) {
      addToast("error", "Network Error", "Could not reach the server.");
    } finally {
      setSending(false);
    }
  };

  // Live preview is always shown
  const liveHtml = getCurrentHtml();
  const hasContent = liveHtml && liveHtml.trim() && liveHtml !== "<p><br></p>";

  return (
    <div className="dashboard">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">✉️</div>
          <span className="dashboard-brand-name">EyeCoders Mail</span>
        </div>
        <div className="dashboard-user">
          <div className="dashboard-user-info">
            <div className="dashboard-user-avatar">A</div>
            <span className="dashboard-user-name">Admin</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Compose */}
      <main className="compose-wrapper">
        <div className="compose-container">
          <h1 className="compose-title">Compose Email</h1>
          <p className="compose-desc">
            Create and send emails with rich HTML support
          </p>

          <div className="compose-card">
            {/* To */}
            <div className="compose-section">
              <EmailChipsInput
                label="To"
                emails={toEmails}
                setEmails={setToEmails}
                placeholder="e.g. 23cs042 + Enter → 23cs042@charusat.edu.in"
              />
            </div>

            {/* CC */}
            <div className="compose-section">
              <EmailChipsInput
                label="CC"
                emails={ccEmails}
                setEmails={setCcEmails}
                placeholder="e.g. faculty + Tab → faculty@charusat.ac.in"
              />
            </div>

            {/* Subject */}
            <div className="compose-section">
              <input
                id="compose-subject"
                className="subject-input"
                type="text"
                placeholder="Email subject…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Editor Toolbar */}
            <div className="editor-toolbar">
              <div className="editor-mode-toggle">
                <button
                  className={`editor-mode-btn ${
                    editorMode === "wysiwyg" ? "active" : ""
                  }`}
                  onClick={() => handleEditorModeChange("wysiwyg")}
                >
                  ✏️ Visual Editor
                </button>
                <button
                  className={`editor-mode-btn ${
                    editorMode === "html" ? "active" : ""
                  }`}
                  onClick={() => handleEditorModeChange("html")}
                >
                  {"<>"} HTML Code
                </button>
              </div>
              <div className="editor-toolbar-info">
                <span className="editor-toolbar-hint">
                  {editorMode === "wysiwyg"
                    ? "Rich text — formatting toolbar below"
                    : "Raw HTML — live preview updates as you type"}
                </span>
              </div>
            </div>

            {/* Editor Body + Live Preview Side by Side (for HTML mode) */}
            <div
              className={`editor-split ${
                editorMode === "html" ? "editor-split--dual" : ""
              }`}
            >
              {/* Editor Panel */}
              <div className="editor-panel">
                {editorMode === "wysiwyg" ? (
                  <div className="editor-wysiwyg-wrapper">
                    <ReactQuill
                      theme="snow"
                      value={htmlContent}
                      onChange={setHtmlContent}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Start writing your email…"
                    />
                  </div>
                ) : (
                  <div className="editor-code-wrapper">
                    <textarea
                      className="editor-code-textarea"
                      value={rawHtml}
                      onChange={(e) => setRawHtml(e.target.value)}
                      placeholder={`<html>\n  <body>\n    <h1>Hello!</h1>\n    <p>Write your HTML email here…</p>\n  </body>\n</html>`}
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>

              {/* Live Preview Panel (always visible in HTML mode, toggle in WYSIWYG) */}
              {editorMode === "html" && (
                <div className="editor-preview-panel">
                  <div className="editor-preview-header">
                    <span className="editor-preview-label">
                      👁️ Live Preview
                    </span>
                  </div>
                  <div className="editor-preview-frame">
                    {hasContent ? (
                      <iframe
                        className="editor-preview-iframe"
                        srcDoc={rawHtml}
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <p className="editor-preview-empty">
                        Start typing HTML to see a live preview here…
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Full-width preview for WYSIWYG mode */}
            {editorMode === "wysiwyg" && hasContent && (
              <div className="editor-preview-full">
                <div className="editor-preview-header">
                  <span className="editor-preview-label">
                    📧 Email Preview
                  </span>
                </div>
                <div className="editor-preview-frame">
                  <iframe
                    className="editor-preview-iframe"
                    srcDoc={`<!DOCTYPE html><html><head><style>body{font-family:'Inter',sans-serif;padding:16px;color:#1a1a1a;line-height:1.6;}</style></head><body>${htmlContent}</body></html>`}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}

            {/* Send Bar */}
            <div className="compose-send-bar">
              <div className="send-info">
                <div className="send-info-item">
                  <span className="send-info-dot" />
                  {toEmails.length} recipient
                  {toEmails.length !== 1 ? "s" : ""}
                </div>
                {ccEmails.length > 0 && (
                  <div className="send-info-item">{ccEmails.length} CC</div>
                )}
                <div className="send-info-item">
                  Mode: {editorMode === "wysiwyg" ? "Visual" : "HTML"}
                </div>
              </div>
              <button
                id="compose-send"
                className="btn-send"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <span className="btn-loader" />
                    Sending…
                  </>
                ) : (
                  <>🚀 Send Email</>
                )}
              </button>
            </div>
          </div>

          {/* Sent Log */}
          <div className="sent-log">
            <div className="sent-log-header">
              <div className="sent-log-title">
                📬 Sent History
                {sentLog.length > 0 && (
                  <span className="sent-log-badge">{sentLog.length}</span>
                )}
              </div>
              {sentLog.length > 0 && (
                <button
                  type="button"
                  className="sent-log-clear-btn"
                  onClick={handleClearHistory}
                >
                  Clear History
                </button>
              )}
            </div>

            {sentLog.length === 0 ? (
              <div className="sent-log-empty">
                No emails sent yet. Sent emails will appear here for you to view, edit, and resend.
              </div>
            ) : (
              <div className="sent-log-list">
                {sentLog.map((item) => (
                  <div key={item.id} className="sent-log-item">
                    <div
                      className={`sent-log-status sent-log-status--${
                        item.success ? "success" : "error"
                      }`}
                    />
                    <div
                      className="sent-log-content"
                      onClick={() => setSelectedHistoryMail(item)}
                    >
                      <div className="sent-log-subject">
                        {item.subject || "(No Subject)"}
                      </div>
                      <div className="sent-log-recipients">
                        To: {item.to ? item.to.join(", ") : "None"}
                        {item.cc && item.cc.length > 0
                          ? ` | CC: ${item.cc.join(", ")}`
                          : ""}
                        {item.error ? ` — Error: ${item.error}` : ""}
                      </div>
                    </div>
                    <div className="sent-log-actions">
                      <button
                        type="button"
                        className="sent-action-btn"
                        title="View Email Details & Content"
                        onClick={() => setSelectedHistoryMail(item)}
                      >
                        👁️ View
                      </button>
                      <button
                        type="button"
                        className="sent-action-btn sent-action-btn--primary"
                        title="Load into Composer to Edit & Resend"
                        onClick={() => handleReuseInComposer(item)}
                      >
                        ✏️ Edit & Resend
                      </button>
                      <div className="sent-log-time">
                        {new Date(item.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Detail Modal */}
      {selectedHistoryMail && (
        <HistoryMailModal
          mail={selectedHistoryMail}
          onClose={() => setSelectedHistoryMail(null)}
          onReuse={handleReuseInComposer}
        />
      )}
    </div>
  );
}
