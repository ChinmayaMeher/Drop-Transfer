import { timeAgo } from "../utils/helpers";

export default function Inbox({ inbox, activeMsg, onSelect, onDelete }) {
  if (inbox.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#2d3748" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⊡</div>
        <p style={{ fontSize: 12, letterSpacing: "0.08em" }}>no messages yet</p>
        <p style={{ fontSize: 11, color: "#1e2535", marginTop: 6 }}>
          share your ID to receive drops
        </p>
      </div>
    );
  }

  return (
    <>
      {inbox.map((msg) => (
        <div
          key={msg.id}
          className={`msg-card ${activeMsg?.id === msg.id ? "selected" : ""}`}
          onClick={() => onSelect(msg)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#4a6070", flex: 1 }}>
              from: <span style={{ color: "#7b9aab" }}>{msg.from}</span>
            </span>
            <span className={`tag ${msg.isCode ? "tag-code" : "tag-msg"}`}>
              {msg.isCode ? "code" : "msg"}
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.5,
            }}
          >
            {msg.content.slice(0, 60)}
            {msg.content.length > 60 ? "…" : ""}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 10, color: "#2d3748" }}>
              {timeAgo(msg.ts)}
            </span>
            <button
              className="btn-secondary"
              style={{ fontSize: 10, padding: "3px 8px" }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(msg.id);
              }}
            >
              delete
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
