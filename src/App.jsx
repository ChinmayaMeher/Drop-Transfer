import { useState, useEffect, useRef, useCallback } from "react";
import { generateId, timeAgo } from "./utils/helpers";
import SendForm from "./components/SendForm";
import Inbox from "./components/Inbox";
import MessageViewer from "./components/MessageViewer";
import EmojiPicker from "./components/EmojiPicker";
import "./styles/globals.css";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "./firebase";
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
  // ── Identity & Persistence ───────────────────────────────────────────────
  const [myId] = useState(() => {
    const saved = localStorage.getItem("drop_id");
    if (saved) return saved;
    const fresh = generateId();
    localStorage.setItem("drop_id", fresh);
    return fresh;
  });

  // ── Main Dashboard Tabs ──────────────────────────────────────────────────
  // tabs: "chats" | "inbox" | "send"
  const [tab, setTab] = useState("chats");
  const [copied, setCopied] = useState(false);

  // ── Legacy Inbox Drops State ─────────────────────────────────────────────
  const [inbox, setInbox] = useState([]);
  const [activeMsg, setActiveMsg] = useState(null);
  const pollRef = useRef(null);

  // ── Legacy Send Drop Form State ──────────────────────────────────────────
  const [toId, setToId] = useState("");
  const [message, setMessage] = useState("");
  const [isCode, setIsCode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // "sent" | "error" | null

  // ── WhatsApp 1-to-1 Chat State ────────────────────────────────────────────
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [activeChats, setActiveChats] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isCodeChat, setIsCodeChat] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [friendOnline, setFriendOnline] = useState(false);
  const [friendLastSeen, setFriendLastSeen] = useState(null);
  const [searchFriendId, setSearchFriendId] = useState("");
  const [activeReactionMenu, setActiveReactionMenu] = useState(null);

  // Unsubscribe refs to avoid memory leaks
  const chatUnsubRef = useRef(null);
  const onlineUnsubRef = useRef(null);
  const lastSeenUnsubRef = useRef(null);
  const chatEndRef = useRef(null);

  // ── Device Responsiveness ─────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Real-time Online/Presence Sync ─────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const myOnlineRef = ref(db, `users/${myId}/online`);
    const myLastSeenRef = ref(db, `users/${myId}/lastSeen`);

    set(myOnlineRef, true);
    onDisconnect(myOnlineRef).set(false);
    onDisconnect(myLastSeenRef).set(Date.now());

    return () => {
      set(myOnlineRef, false);
      set(myLastSeenRef, Date.now());
    };
  }, [myId]);

  // Listen to active friend online status
  useEffect(() => {
    if (onlineUnsubRef.current) onlineUnsubRef.current();
    if (lastSeenUnsubRef.current) lastSeenUnsubRef.current();

    if (!activeFriendId) {
      setFriendOnline(false);
      setFriendLastSeen(null);
      return;
    }

    const friendOnlineRef = ref(db, `users/${activeFriendId}/online`);
    const friendLastSeenRef = ref(db, `users/${activeFriendId}/lastSeen`);

    onlineUnsubRef.current = onValue(friendOnlineRef, (snap) => {
      setFriendOnline(snap.exists() ? snap.val() : false);
    });

    lastSeenUnsubRef.current = onValue(friendLastSeenRef, (snap) => {
      setFriendLastSeen(snap.exists() ? snap.val() : null);
    });

    return () => {
      if (onlineUnsubRef.current) onlineUnsubRef.current();
      if (lastSeenUnsubRef.current) lastSeenUnsubRef.current();
    };
  }, [activeFriendId]);

  // ── Load User Chats List (Sidebar threads) ──────────────────────────────
  useEffect(() => {
    const userChatsRef = ref(db, `users/${myId}/chats`);
    return onValue(userChatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const chats = Object.values(snapshot.val()).sort((a, b) => b.ts - a.ts);
        setActiveChats(chats);
      } else {
        setActiveChats([]);
      }
    });
  }, [myId]);

  // ── Load Inbox Drops Polling ──────────────────────────────────────────────
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
    } catch (_) {
      // silently ignore network errors during polling
    }
  }, [myId]);

  useEffect(() => {
    loadInbox();
    pollRef.current = setInterval(loadInbox, 3000);
    return () => clearInterval(pollRef.current);
  }, [loadInbox]);

  // ── Listen to Active 1-to-1 Chat Messages ────────────────────────────────
  useEffect(() => {
    if (chatUnsubRef.current) {
      chatUnsubRef.current();
      chatUnsubRef.current = null;
    }

    if (!activeFriendId) {
      setChatMessages([]);
      return;
    }

    const roomID = [myId, activeFriendId].sort().join("_");
    const roomRef = ref(db, `chats/${roomID}`);

    chatUnsubRef.current = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const msgs = Object.values(snapshot.val()).sort((a, b) => a.ts - b.ts);
        setChatMessages(msgs);
      } else {
        setChatMessages([]);
      }
    });

    // Mark current chat as read in user chats list
    set(ref(db, `users/${myId}/chats/${activeFriendId}/unread`), false);

    return () => {
      if (chatUnsubRef.current) chatUnsubRef.current();
    };
  }, [myId, activeFriendId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Close emoji picker on outside click
  useEffect(() => {
    const clickHandler = () => setShowEmojiPicker(false);
    window.addEventListener("click", clickHandler);
    return () => window.removeEventListener("click", clickHandler);
  }, []);

  // ── Send Drop Function (Direct Inbox) ────────────────────────────────────
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

    try {
      const dbRef = ref(db, `inboxes/${target}`);
      const snapshot = await get(dbRef);
      const raw = snapshot.exists() ? snapshot.val() : {};
      const existing = Array.isArray(raw) ? raw : Object.values(raw);

      const newMsg = {
        id: Math.random().toString(36).slice(2),
        from: myId,
        content,
        isCode: codeFlag,
        ts: Date.now(),
      };

      existing.unshift(newMsg);
      if (existing.length > 50) existing.length = 50;

      await set(dbRef, existing);
      setSendStatus("sent");

      if (!overrideToId) {
        setMessage("");
        setToId("");
        setIsCode(false);
      }
    } catch (_) {
      setSendStatus("error");
    } finally {
      setSending(false);
      setTimeout(() => setSendStatus(null), 3000);
    }
  };

  // ── Send Drop Image (Direct Inbox) ───────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    const target = toId
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");

    if (!file || !target) {
      alert("Please enter a Recipient ID first!");
      return;
    }

    setSending(true);
    setSendStatus(null);

    try {
      const fileRef = storageRef(storage, `images/${Date.now()}_${file.name}`);
      const uploadSnapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);

      const dbRef = ref(db, `inboxes/${target}`);
      const dbSnapshot = await get(dbRef);
      const raw = dbSnapshot.exists() ? dbSnapshot.val() : {};
      const existing = Array.isArray(raw) ? raw : Object.values(raw);

      const newMsg = {
        id: Math.random().toString(36).slice(2),
        from: myId,
        content: downloadURL,
        isCode: false,
        isImage: true,
        ts: Date.now(),
      };

      existing.unshift(newMsg);
      if (existing.length > 50) existing.length = 50;

      await set(dbRef, existing);
      setSendStatus("sent");
    } catch (_) {
      setSendStatus("error");
    } finally {
      setSending(false);
      setTimeout(() => setSendStatus(null), 3000);
    }
  };

  // ── Live Chat Actions (WhatsApp Style) ────────────────────────────────────
  const sendChatMessage = async (text, isImg = false, isCd = false) => {
    const content = text.trim();
    if (!activeFriendId || !content) return;

    const roomID = [myId, activeFriendId].sort().join("_");
    const roomRef = ref(db, `chats/${roomID}`);
    const newMsgRef = push(roomRef);

    const newMsg = {
      id: newMsgRef.key,
      sender: myId,
      text: content,
      ts: Date.now(),
      isImage: isImg,
      isCode: isCd,
    };

    if (replyingTo) {
      newMsg.replyTo = replyingTo;
      setReplyingTo(null);
    }

    // Write to Room Messages
    await set(newMsgRef, newMsg);

    // Update Chats List Metadata for Me
    const chatMetaMe = {
      friendId: activeFriendId,
      lastMessage: isImg ? "📷 Image" : isCd ? "⌨ Code Snippet" : content,
      ts: Date.now(),
      unread: false,
    };
    await set(ref(db, `users/${myId}/chats/${activeFriendId}`), chatMetaMe);

    // Update Chats List Metadata for Friend
    const chatMetaFriend = {
      friendId: myId,
      lastMessage: isImg ? "📷 Image" : isCd ? "⌨ Code Snippet" : content,
      ts: Date.now(),
      unread: true,
    };
    await set(ref(db, `users/${activeFriendId}/chats/${myId}`), chatMetaFriend);

    setChatInput("");
    setIsCodeChat(false);
  };

  const handleChatImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeFriendId) return;

    setSending(true);
    try {
      const fileRef = storageRef(storage, `chat_images/${Date.now()}_${file.name}`);
      const uploadSnapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);

      await sendChatMessage(downloadURL, true, false);
    } catch (_) {
      alert("Failed to send image.");
    } finally {
      setSending(false);
    }
  };

  const reactToMessage = async (msgId, emoji) => {
    if (!activeFriendId) return;
    const roomID = [myId, activeFriendId].sort().join("_");
    const reactionRef = ref(db, `chats/${roomID}/${msgId}/reactions/${myId}`);

    const snap = await get(reactionRef);
    if (snap.exists() && snap.val() === emoji) {
      await remove(reactionRef);
    } else {
      await set(reactionRef, emoji);
    }
    setActiveReactionMenu(null);
  };

  const startNewChat = () => {
    const cleanId = searchFriendId
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
    if (!cleanId || cleanId === myId) {
      alert("Invalid Recipient ID");
      return;
    }

    // Set initial thread metadata to show in sidebar
    const chatMeta = {
      friendId: cleanId,
      lastMessage: "No messages yet",
      ts: Date.now(),
      unread: false,
    };
    set(ref(db, `users/${myId}/chats/${cleanId}`), chatMeta);
    setActiveFriendId(cleanId);
    setSearchFriendId("");
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
    const dbRef = ref(db, `inboxes/${myId}`);
    await set(dbRef, updated);
  };

  const handleSelectMsg = (msg) => {
    setActiveMsg(msg);
    if (isMobile) setTab("inbox");
  };

  const handleReply = (recipientId, content) => {
    send(recipientId, content, false);
  };

  // Helper: Format relative timestamp
  const getFormatTime = (ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid-layout">
      {/* ── LEFT PANEL (Sidebar) ── */}
      <div
        style={{
          background: "var(--wa-sidebar)",
          borderRight: "1px solid var(--wa-border)",
          display: isMobile && (activeFriendId || (tab === "inbox" && activeMsg)) ? "none" : "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Profile / App Header */}
        <div style={{ padding: "16px", background: "var(--wa-header)", borderBottom: "1px solid var(--wa-border)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="pulse-dot" />
              <span
                style={{
                  fontSize: "18px",
                  color: "var(--wa-green)",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                DROP.TRANSFER
              </span>
            </div>
          </div>

          {/* Bold Green ID card with Copy action */}
          <div
            style={{
              background: "#182229",
              border: "1px solid var(--wa-green)",
              borderRadius: "8px",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 8px rgba(0, 168, 132, 0.15)",
            }}
          >
            <div>
              <p style={{ fontSize: "10px", color: "var(--wa-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>
                My Drop ID
              </p>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "var(--wa-green)", letterSpacing: "0.05em", margin: 0 }}>
                {myId}
              </p>
            </div>
            <button
              onClick={copyId}
              style={{
                fontSize: "11px",
                padding: "6px 12px",
                borderRadius: "20px",
                background: "var(--wa-green)",
                color: "#0b141a",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                border: "none",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#00c49a")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-green)")}
            >
              {copied ? "✓ Copied" : "📋 Copy ID"}
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: "flex",
            background: "var(--wa-sidebar)",
            borderBottom: "1px solid var(--wa-border)",
          }}
        >
          <button
            className={`tab ${tab === "chats" ? "active" : ""}`}
            onClick={() => setTab("chats")}
            style={{ flex: 1 }}
          >
            💬 Chats
          </button>
          <button
            className={`tab ${tab === "inbox" ? "active" : ""}`}
            onClick={() => setTab("inbox")}
            style={{ flex: 1 }}
          >
            📥 Inbox ({inbox.length})
          </button>
          <button
            className={`tab ${tab === "send" ? "active" : ""}`}
            onClick={() => setTab("send")}
            style={{ flex: 1 }}
          >
            📤 Send Drop
          </button>
        </div>

        {/* Main Sidebar Contents */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "chats" && (
            <>
              {/* Start new chat search box */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--wa-border)",
                  display: "flex",
                  gap: "8px",
                  background: "var(--wa-sidebar)",
                }}
              >
                <input
                  className="input-field"
                  placeholder="Enter Friend's ID..."
                  value={searchFriendId}
                  onChange={(e) => setSearchFriendId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startNewChat()}
                />
                <button
                  className="btn-send"
                  onClick={startNewChat}
                  style={{ padding: "8px 14px", fontSize: "12px" }}
                >
                  Chat
                </button>
              </div>

              {/* Chat threads list */}
              {activeChats.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "var(--wa-text-muted)",
                  }}
                >
                  <p style={{ fontSize: "14px", marginBottom: "6px" }}>No active chats</p>
                  <p style={{ fontSize: "12px", opacity: 0.7 }}>
                    Enter a Friend's ID above to start messaging in real-time.
                  </p>
                </div>
              ) : (
                activeChats.map((chat) => (
                  <div
                    key={chat.friendId}
                    className={`chat-list-item ${
                      activeFriendId === chat.friendId ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveFriendId(chat.friendId);
                      setActiveMsg(null);
                    }}
                  >
                    <div className="chat-avatar">
                      {chat.friendId.slice(0, 2)}
                    </div>
                    <div className="chat-item-details">
                      <div className="chat-item-header">
                        <span className="chat-item-name">{chat.friendId}</span>
                        <span className="chat-item-time">
                          {timeAgo(chat.ts)}
                        </span>
                      </div>
                      <div className="chat-item-body">
                        <span className="chat-item-msg">{chat.lastMessage}</span>
                        {chat.unread && <span className="chat-item-badge">!</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === "inbox" && (
            <div style={{ padding: "12px 16px" }}>
              <Inbox
                inbox={inbox}
                activeMsg={activeMsg}
                onSelect={handleSelectMsg}
                onDelete={deleteMsg}
              />
            </div>
          )}

          {tab === "send" && (
            <div style={{ padding: "20px" }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--wa-text-muted)",
                  marginBottom: "12px",
                  fontWeight: "bold",
                }}
              >
                SEND A FILE / MESSAGE DROP
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
                onImageUpload={handleImageUpload}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL (Chat Content / Drops Viewer) ── */}
      <div
        className="right-panel"
        style={{
          background: "var(--wa-bg)",
          display: isMobile && !activeFriendId && !(tab === "inbox" && activeMsg) ? "none" : "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {activeFriendId && tab === "chats" ? (
          /* ── WHATSAPP 1-to-1 CHAT INTERFACE ── */
          <div className="chat-wall">
            {/* Chat header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                background: "var(--wa-header)",
                zIndex: 10,
                borderBottom: "1px solid var(--wa-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {isMobile && (
                  <button
                    onClick={() => setActiveFriendId(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--wa-green)",
                      cursor: "pointer",
                      fontSize: "20px",
                      paddingRight: "8px",
                    }}
                  >
                    ←
                  </button>
                )}
                <div className="chat-avatar">{activeFriendId.slice(0, 2)}</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "var(--wa-text)" }}>
                    {activeFriendId}
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    <span className={friendOnline ? "online-dot" : "offline-dot"} />
                    <span style={{ fontSize: "11px", color: "var(--wa-text-muted)" }}>
                      {friendOnline
                        ? "online"
                        : friendLastSeen
                        ? `last seen ${timeAgo(friendLastSeen)}`
                        : "offline"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat message threads */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {chatMessages.length === 0 ? (
                <div
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "var(--wa-text-muted)",
                    maxWidth: "280px",
                    fontSize: "13px",
                  }}
                >
                  🔐 End-to-end drop session started. Messages are saved in real-time.
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble ${msg.sender === myId ? "sent" : "received"}`}
                    style={{ position: "relative" }}
                  >
                    {/* Reply triggers on bubble */}
                    <button
                      className="bubble-reply-trigger"
                      onClick={() =>
                        setReplyingTo({
                          id: msg.id,
                          sender: msg.sender,
                          text: msg.text,
                          isImage: msg.isImage || false,
                          isCode: msg.isCode || false,
                        })
                      }
                      title="Reply"
                    >
                      ⤶
                    </button>

                    {/* Reactions Popover Trigger */}
                    <button
                      className="bubble-reply-trigger"
                      style={{ right: "32px", fontSize: "10px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id);
                      }}
                      title="React"
                    >
                      ☺
                    </button>

                    {/* Reactions panel selector */}
                    {activeReactionMenu === msg.id && (
                      <div className="reactions-panel" onClick={(e) => e.stopPropagation()}>
                        {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                          <button
                            key={emoji}
                            className="reaction-option"
                            onClick={() => handleReact(msg.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reply Quoted Card */}
                    {msg.replyTo && (
                      <div className="reply-quote-card">
                        <p className="reply-quote-sender">
                          {msg.replyTo.sender === myId ? "You" : msg.replyTo.sender}
                        </p>
                        <p className="reply-quote-text">
                          {msg.replyTo.isImage ? "📷 Image" : msg.replyTo.isCode ? "⌨ Code" : msg.replyTo.text}
                        </p>
                      </div>
                    )}

                    {/* Message Body */}
                    {msg.isCode ? (
                      <div className="code-view" style={{ fontSize: "12px", marginTop: "4px" }}>
                        {msg.text}
                      </div>
                    ) : msg.isImage ? (
                      <img
                        src={msg.text}
                        alt="Shared image"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "260px",
                          borderRadius: "6px",
                          marginTop: "2px",
                          display: "block",
                        }}
                      />
                    ) : (
                      <p style={{ margin: 0, paddingRight: "45px" }}>{msg.text}</p>
                    )}

                    {/* Bubble Reactions list */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div
                        className="bubble-reactions-list"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id);
                        }}
                      >
                        {Object.values(msg.reactions).slice(0, 3).map((emo, idx) => (
                          <span key={idx}>{emo}</span>
                        ))}
                        {Object.keys(msg.reactions).length > 1 && (
                          <span style={{ fontSize: "9px", opacity: 0.8, marginLeft: "2px" }}>
                            {Object.keys(msg.reactions).length}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Time & Double checkmarks status */}
                    <span className="bubble-meta">
                      {getFormatTime(msg.ts)}
                      {msg.sender === myId && (
                        <span style={{ color: "var(--wa-green)" }}>✓✓</span>
                      )}
                    </span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input Strip */}
            {replyingTo && (
              <div
                style={{
                  background: "#1f2c34",
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderLeft: "4px solid var(--wa-green)",
                }}
              >
                <div style={{ fontSize: "13px" }}>
                  <span style={{ color: "var(--wa-green)", fontWeight: 600 }}>
                    Replying to {replyingTo.sender === myId ? "yourself" : replyingTo.sender}
                  </span>
                  <p
                    style={{
                      color: "var(--wa-text-muted)",
                      margin: "2px 0 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "400px",
                    }}
                  >
                    {replyingTo.isImage ? "📷 Image" : replyingTo.isCode ? "⌨ Code" : replyingTo.text}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--wa-text-muted)",
                    fontSize: "18px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Chat input panel */}
            <div
              style={{
                padding: "10px 16px",
                background: "var(--wa-header)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                position: "relative",
                borderTop: "1px solid var(--wa-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Emoji Panel Picker Popover */}
              {showEmojiPicker && (
                <EmojiPicker
                  onSelectEmoji={(emoji) => {
                    setChatInput((prev) => prev + emoji);
                  }}
                />
              )}

              {/* Emoji Button */}
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "22px",
                  cursor: "pointer",
                  color: "var(--wa-text-muted)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                title="Emojis"
              >
                😊
              </button>

              {/* Image attachment button */}
              <label
                style={{
                  cursor: "pointer",
                  fontSize: "22px",
                  color: "var(--wa-text-muted)",
                }}
                title="Send Image"
              >
                📎
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleChatImageUpload}
                  style={{ display: "none" }}
                />
              </label>

              {/* Code Mode Toggle */}
              <button
                style={{
                  background: "transparent",
                  border: "1px solid " + (isCodeChat ? "var(--wa-green)" : "#374248"),
                  color: isCodeChat ? "var(--wa-green)" : "var(--wa-text-muted)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onClick={() => setIsCodeChat(!isCodeChat)}
                title="Toggle Code Mode"
              >
                ⌨ Code
              </button>

              {/* Message Input text field */}
              {isCodeChat ? (
                <textarea
                  className="textarea-field"
                  style={{ height: "45px", flex: 1, padding: "8px 12px" }}
                  placeholder="Paste your code snippet here..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage(chatInput, false, true);
                    }
                  }}
                />
              ) : (
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && chatInput.trim()) {
                      sendChatMessage(chatInput, false, false);
                    }
                  }}
                />
              )}

              {/* Send message button */}
              <button
                className="btn-send"
                style={{ padding: "9px 18px", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => sendChatMessage(chatInput, false, isCodeChat)}
                disabled={!chatInput.trim()}
              >
                ➤
              </button>
            </div>
          </div>
        ) : tab === "inbox" && activeMsg ? (
          /* ── legacy drops message viewer pane ── */
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {isMobile && (
              <div style={{ padding: "10px 16px", background: "var(--wa-header)" }}>
                <button
                  onClick={() => setActiveMsg(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--wa-green)",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Inbox
                </button>
              </div>
            )}
            <MessageViewer
              activeMsg={activeMsg}
              onDelete={deleteMsg}
              onReply={handleReply}
            />
          </div>
        ) : (
          /* ── PREMIUM WELCOME EMPTY SCREEN STATE ── */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#222e35",
              color: "var(--wa-text-muted)",
              textAlign: "center",
              padding: "40px",
            }}
          >
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "rgba(0, 168, 132, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "42px",
                color: "var(--wa-green)",
                marginBottom: "20px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              📥
            </div>
            <h2 style={{ color: "var(--wa-text)", marginBottom: "8px", fontWeight: 600 }}>
              Drop.Transfer Chat
            </h2>
            <p style={{ maxWidth: "420px", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
              Secure, instant, real-time message and code sharing. Connect directly with user IDs, drop text/code/images, and react instantly.
            </p>
            <div
              style={{
                background: "var(--wa-sidebar)",
                border: "1px solid var(--wa-border)",
                borderRadius: "8px",
                padding: "16px",
                maxWidth: "400px",
                textAlign: "left",
                fontSize: "12px",
              }}
            >
              <p style={{ fontWeight: "bold", color: "var(--wa-text)", marginBottom: "8px" }}>
                💡 Quick tips to get started:
              </p>
              <ul style={{ paddingLeft: "18px", lineHeight: "1.8", margin: 0 }}>
                <li>Share your unique ID (shown in header) to receive messages.</li>
                <li>Start a chat by entering a Friend's ID and clicking &quot;Chat&quot;.</li>
                <li>Toggle &quot;Code mode&quot; in chats to send formatted code blocks.</li>
                <li>Hover over message bubbles to reply or add emoji reactions.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
