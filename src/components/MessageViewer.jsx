import { useState } from "react";

export default function MessageViewer({ activeMsg, onDelete, onReply }) {
  const [msgCopied, setMsgCopied] = useState(false);
  const [replyText, setReplyText] = useState("");

  const copyMsg = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      setMsgCopied(true);
      setTimeout(() => setMsgCopied(false), 2000);
    });
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(activeMsg.from, replyText.trim());
    setReplyText("");
  };

  if (!activeMsg) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          padding: 40,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            border: "1px solid #1e2535",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            color: "#1e2535",
          }}
        >
          ⌗
        </div>
        <p style={{ fontSize: 14, color: "#2d3748", letterSpacing: "0.1em" }}>
          select a message or send a drop
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
      {/* Message header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span
              className={`tag ${activeMsg.isCode ? "tag-code" : "tag-msg"}`}
              style={{ fontSize: 15 }}
            >
              {activeMsg.isCode ? "⌨ code" : "◎ message"}
            </span>
            <span style={{ fontSize: 11, color: "#94a4af" }}>
              {new Date(activeMsg.ts).toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: 15, color: "#a5b1c1" }}>
            from{" "}
            <span style={{ color: "#00c47a", fontWeight: 500 }}>
              {activeMsg.from}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => copyMsg(activeMsg.content)}
            style={{ fontSize: 11 }}
          >
            {msgCopied ? "✓ copied" : "copy"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => onDelete(activeMsg.id)}
            style={{ fontSize: 11, color: "#f87171" }}
          >
            delete
          </button>
        </div>
      </div>

      {/* Message content */}
      {activeMsg.isCode ? (
        <div>
          <p
            style={{
              fontSize: 10,
              color: "#3d5060",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            CODE SNIPPET
          </p>
          <div className="code-view">{activeMsg.content}</div>
        </div>
      ) : (
        <div
          style={{
            background: "#0d1115",
            border: "1px solid #1a2030",
            borderRadius: 8,
            padding: "24px",
          }}
        >
          <p className="text-view">{activeMsg.content}</p>
        </div>
      )}

      {/* Reply strip */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: "1px solid #141820",
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "#3d5060",
            letterSpacing: "0.1em",
            marginBottom: 14,
          }}
        >
          REPLY
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input-field"
            placeholder="type a quick reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
            style={{ flex: 1 }}
          />
          <button
            className="btn-send"
            style={{ whiteSpace: "nowrap" }}
            onClick={handleReply}
          >
            reply →
          </button>
        </div>
      </div>
    </div>
  );
}
