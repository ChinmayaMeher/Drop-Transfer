export default function SendForm({
  toId,
  setToId,
  message,
  setMessage,
  isCode,
  setIsCode,
  sending,
  sendStatus,
  onSend,
  compact,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <p
          style={{
            fontSize: 12,
            color: "#3d5060",
            letterSpacing: "0.1em",
            marginBottom: 6,
          }}
        >
          RECIPIENT ID
        </p>
        <input
          className="input-field"
          placeholder="e.g. ABCD-1234"
          value={toId}
          onChange={(e) => setToId(e.target.value.toUpperCase())}
          maxLength={9}
        />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <p style={{ fontSize: 14, color: "#c7d1da", letterSpacing: "0.1em" }}>
            {isCode ? "CODE" : "MESSAGE"}
          </p>
          <div className="toggle-wrap">
            <span style={{ fontSize: 14 }}>code mode</span>
            <button
              className={`toggle ${isCode ? "on" : ""}`}
              onClick={() => setIsCode(!isCode)}
              aria-label="toggle code mode"
            />
          </div>
        </div>
        <textarea
          className="textarea-field"
          style={compact ? { height: 100 } : { height: 140 }}
          placeholder={isCode ? "// paste your code here…" : "type a message…"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="btn-send"
          onClick={onSend}
          disabled={sending || !toId.trim() || !message.trim()}
        >
          {sending ? "sending…" : "send drop →"}
        </button>
        {sendStatus === "sent" && (
          <span className="status-sent">✓ delivered</span>
        )}
        {sendStatus === "error" && (
          <span className="status-error">✗ failed to send</span>
        )}
      </div>
    </div>
  );
}
