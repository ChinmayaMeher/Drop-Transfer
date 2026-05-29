import { useState, useEffect, useRef, useCallback } from "react";
import { generateId } from "./utils/helpers";
import SendForm from "./components/SendForm";
import Inbox from "./components/Inbox";
import MessageViewer from "./components/MessageViewer";
import "./styles/globals.css";
import {
  ref,
  set,
  push,
  onValue,
  onDisconnect,
  remove,
  get,
} from "firebase/database";
import { db } from "./firebase";

export default function App() {
  const [myId] = useState(() => {
    // Check if a Drop ID already exists for this tab session
    const savedId = sessionStorage.getItem("drop_id");
    if (savedId) {
      return savedId;
    }

    // If it's a completely new visit, generate a new one and save it to the session
    const newId = generateId();
    sessionStorage.setItem("drop_id", newId);
    return newId;
  });
  const [inbox, setInbox] = useState([]);
  const [toId, setToId] = useState("");
  const [message, setMessage] = useState("");
  const [isCode, setIsCode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeMsg, setActiveMsg] = useState(null);
  const [tab, setTab] = useState("inbox");
  const pollRef = useRef(null);

  // --- NEW LIVE CHAT STATES ---
  const [chatMessages, setChatMessages] = useState([]);
  const [chatRoomId, setChatRoomId] = useState("");

  const loadInbox = useCallback(async () => {
    try {
      const dbRef = ref(db, `inboxes/${myId}`);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const msgs = snapshot.val();
        setInbox(Object.values(msgs).sort((a, b) => b.ts - a.ts));
      } else {
        setInbox([]);
      }
    } catch (_) {}
  }, [myId]);

  useEffect(() => {
    loadInbox();
    pollRef.current = setInterval(loadInbox, 3000);
    return () => clearInterval(pollRef.current);
  }, [loadInbox]);

  // --- NEW LIVE CHAT CLEANUP EFFECT ---
  useEffect(() => {
    const handleUnload = () => {
      // If the user is the owner of the room, delete it when they leave
      const myRoomRef = ref(db, `live_chats/${myId}`);
      remove(myRoomRef);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload(); // Clean up when component unmounts
    };
  }, [myId]);

  const send = async (overrideToId, overrideMessage, overrideIsCode) => {
    const target = (overrideToId ?? toId)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
    const content = (overrideMessage ?? message).trim();
    const codeFlag = overrideIsCode ?? isCode;

    if (!target || !content) return;

    setSending(true);
    setSendStatus(null);

    // try {
    //   let existing = [];
    //   try {
    //     const r = localStorage.getItem(`inbox:${target}`);
    //     if (r) existing = JSON.parse(r);
    //   } catch (_) {}

    //   const newMsg = {
    //     id: Math.random().toString(36).slice(2),
    //     from: myId,
    //     content,
    //     isCode: codeFlag,
    //     ts: Date.now(),
    //   };

    //   existing.unshift(newMsg);
    //   if (existing.length > 50) existing = existing.slice(0, 50);

    //   localStorage.setItem(`inbox:${target}`, JSON.stringify(existing));

    //   setSendStatus("sent");
    //   if (!overrideToId) {
    //     setMessage("");
    //     setToId("");
    //     setIsCode(false);
    //   }
    //   setTimeout(() => setSendStatus(null), 3000);
    // } catch (e) {
    //   setSendStatus("error");
    //   setTimeout(() => setSendStatus(null), 3000);
    // }
    try {
      const dbRef = ref(db, `inboxes/${target}`);
      const snapshot = await get(dbRef);

      let existing = [];
      if (snapshot.exists()) {
        existing = snapshot.val();
      }

      const newMsg = {
        id: Math.random().toString(36).slice(2),
        from: myId,
        content,
        isCode: codeFlag,
        ts: Date.now(),
      };

      // Convert from object back to array if needed before unshifting
      const existingArray = Array.isArray(existing)
        ? existing
        : Object.values(existing);

      existingArray.unshift(newMsg);
      if (existingArray.length > 50) existingArray.length = 50;

      // Save back to Firebase
      await set(dbRef, existingArray);

      setSendStatus("sent");
      if (!overrideToId) {
        setMessage("");
        setToId("");
        setIsCode(false);
      }
      setTimeout(() => setSendStatus(null), 3000);
    } catch (e) {
      setSendStatus("error");
      setTimeout(() => setSendStatus(null), 3000);
    }

    setSending(false);
  };

  const copyId = () => {
    navigator.clipboard.writeText(myId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const deleteMsg = async (id) => {
    const updated = inbox.filter((m) => m.id !== id);
    setInbox(updated);
    if (activeMsg?.id === id) setActiveMsg(null);

    // Update Firebase with the deleted list
    const dbRef = ref(db, `inboxes/${myId}`);
    await set(dbRef, updated);
  };

  const handleSelectMsg = (msg) => {
    setActiveMsg(msg);
    if (window.innerWidth < 700) setTab("view");
  };

  const handleReply = (recipientId, content) => {
    send(recipientId, content, false);
  };

  // --- NEW LIVE CHAT FUNCTIONS ---
  const joinLiveChat = (targetId) => {
    // 1. Define where this specific chat room lives in the database
    const roomRef = ref(db, `live_chats/${targetId}`);

    // 2. THE MAGIC TRICK: Tell Firebase to delete this room if the creator closes their tab!
    if (targetId === myId) {
      onDisconnect(roomRef).remove();
    }

    // 3. Listen for new messages instantly (Live updating)
    onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Convert the Firebase object into an array and sort by time
        const msgs = Object.values(data).sort((a, b) => a.ts - b.ts);
        setChatMessages(msgs);
      } else {
        setChatMessages([]); // Room was deleted or is empty
      }
    });

    setChatRoomId(targetId);
  };

  const sendChatMessage = async (text) => {
    if (!chatRoomId || !text) return;

    const roomRef = ref(db, `live_chats/${chatRoomId}`);

    // push() automatically generates a unique ID for the message
    const newMessageRef = push(roomRef);

    await set(newMessageRef, {
      sender: myId,
      text: text,
      ts: Date.now(),
    });
  };

  const unread = inbox.length;

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        background: "#0d0f14",
        minHeight: "100vh",
        color: "#e2e8f0",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, #00e5a040, #00e5a0, #00e5a040, transparent)",
          pointerEvents: "none",
          zIndex: 100,
        }}
      />

      <div className="grid-layout">
        {/* ── LEFT PANEL ── */}
        <div
          style={{
            background: "#0a0c12",
            borderRight: "1px solid #141820",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "20px 20px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <span className="pulse-dot" />
              <span
                style={{
                  fontSize: 25,
                  color: "#00e5a0",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                }}
              >
                DROP.TRANSFER
              </span>
            </div>

            {/* ID Card */}
            <div
              className="glow"
              style={{
                background: "#0d1520",
                border: "1px solid #00e5a030",
                borderRadius: 10,
                padding: "16px",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "#4a6070",
                  letterSpacing: "0.12em",
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                YOUR DROP ID
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    color: "#00e5a0",
                    flex: 1,
                  }}
                >
                  {myId}
                </span>
                <button
                  className="btn-secondary"
                  onClick={copyId}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copied ? "✓ copied" : "copy"}
                </button>
              </div>
              <p style={{ fontSize: 10, color: "#3d5060", marginTop: 8 }}>
                Share this ID to receive messages &amp; code
              </p>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #141820",
                marginBottom: 16,
              }}
            >
              <button
                className={`tab ${tab === "inbox" ? "active" : ""}`}
                onClick={() => setTab("inbox")}
              >
                inbox{" "}
                {unread > 0 && (
                  <span
                    style={{
                      background: "#00e5a020",
                      color: "#00e5a0",
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 10,
                      marginLeft: 4,
                    }}
                  >
                    {unread}
                  </span>
                )}
              </button>
              <button
                className={`tab ${tab === "send" ? "active" : ""}`}
                onClick={() => setTab("send")}
              >
                send
              </button>
            </div>
          </div>

          {/* Tab: Inbox */}
          {tab === "inbox" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
              <Inbox
                inbox={inbox}
                activeMsg={activeMsg}
                onSelect={handleSelectMsg}
                onDelete={deleteMsg}
              />
            </div>
          )}

          {/* Tab: Send (mobile only; desktop shows right panel) */}
          {tab === "send" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
              <SendForm
                toId={toId}
                setToId={setToId}
                message={message}
                setMessage={setMessage}
                isCode={isCode}
                setIsCode={setIsCode}
                sending={sending}
                sendStatus={sendStatus}
                onSend={() => send()}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="right-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          <MessageViewer
            activeMsg={activeMsg}
            onDelete={deleteMsg}
            onReply={handleReply}
          />

          {/* Send section at bottom */}
          <div
            style={{
              borderTop: "1px solid #141820",
              padding: "24px 40px",
              background: "#0a0c12",
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: "#bfcdd9",
                letterSpacing: "0.12em",
                marginBottom: 14,
              }}
            >
              SEND A DROP
            </p>
            <SendForm
              toId={toId}
              setToId={setToId}
              message={message}
              setMessage={setMessage}
              isCode={isCode}
              setIsCode={setIsCode}
              sending={sending}
              sendStatus={sendStatus}
              onSend={() => send()}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}
