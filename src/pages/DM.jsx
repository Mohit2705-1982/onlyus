import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:5001";

export default function DM({ me, setScreen }) {
  const socket = useMemo(() => io(API, { transports: ["websocket"] }), []);

  const [otherPin, setOtherPin] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [panelOpen, setPanelOpen] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState(null);

  // ✅ Chat header meta
  const [otherUser, setOtherUser] = useState(null); // { pin, username }
  const [otherOnline, setOtherOnline] = useState(false);

  const bottomRef = useRef(null);

  // ✅ IMPORTANT: keep activeChat ref so socket listeners don't break
  const activeChatRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (!me?.pin) {
      setScreen("auth");
      return;
    }

    // ✅ tell server "I'm online"
    socket.emit("user_online", { myPin: me.pin });

    const onChatHistory = (data) => setMessages(data.messages || []);
    const onNewDm = (msg) => setMessages((prev) => [...prev, msg]);

    const onDeleted = ({ messageId, newText }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: newText, deletedForAll: true } : m
        )
      );
    };

    const onAllChatsDeleted = () => {
      setActiveChat(null);
      setMessages([]);
      setOtherPin("");
      setPanelOpen(false);

      setOtherUser(null);
      setOtherOnline(false);

      alert("✅ All chats deleted!");
    };

    // ✅ meta comes from server when opening chat
    const onChatMeta = (data) => {
      setOtherUser(data.otherUser || null);
      setOtherOnline(!!data.online);
    };

    // ✅ realtime online/offline
    const onUserStatus = ({ pin, online }) => {
      if (activeChatRef.current?.otherPin === pin) {
        setOtherOnline(!!online);
      }
    };

    socket.on("chat_history", onChatHistory);
    socket.on("new_dm", onNewDm);
    socket.on("message_deleted", onDeleted);
    socket.on("all_chats_deleted", onAllChatsDeleted);

    socket.on("chat_meta", onChatMeta);
    socket.on("user_status", onUserStatus);

    socket.on("error_msg", (err) => alert(err));

    return () => {
      socket.off("chat_history", onChatHistory);
      socket.off("new_dm", onNewDm);
      socket.off("message_deleted", onDeleted);
      socket.off("all_chats_deleted", onAllChatsDeleted);

      socket.off("chat_meta", onChatMeta);
      socket.off("user_status", onUserStatus);

      socket.disconnect();
    };
  }, [me, socket, setScreen]); // ✅ FIXED: activeChat removed (important)

  // ✅ keep chat always scrolled bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openChat() {
    if (otherPin.length !== 6) return alert("Enter valid 6-digit PIN");
    if (otherPin === me.pin) return alert("You can't chat with yourself 😄");

    setActiveChat({ otherPin });
    setMessages([]);
    setPanelOpen(false);

    // ✅ reset meta while loading
    setOtherUser(null);
    setOtherOnline(false);

    socket.emit("open_chat", { myPin: me.pin, otherPin });
  }

  function send() {
    if (!text.trim()) return;
    if (!activeChat?.otherPin) return alert("Open a chat first ✅");

    socket.emit("send_dm", {
      myPin: me.pin,
      otherPin: activeChat.otherPin,
      text,
    });

    setText("");
  }

  function deleteMessage(messageId, fromPin) {
    if (fromPin !== me.pin) return;

    const ok = confirm("Delete this message for everyone?");
    if (!ok) return;

    socket.emit("delete_message", { myPin: me.pin, messageId });
    setMenuMsgId(null);
  }

  function deleteAllChats() {
    const ok = confirm("Delete ALL chats permanently?");
    if (!ok) return;

    socket.emit("delete_all_chats", { myPin: me.pin });
  }

  function copyPin() {
    navigator.clipboard.writeText(me.pin);
    alert("✅ PIN Copied!");
  }

  return (
    <div style={appWrap}>
      <div style={shell}>
        {/* ✅ TOP BAR */}
        <div style={mobileTopBar}>
          <button style={topIconBtn} onClick={() => setPanelOpen(true)}>
            ☰
          </button>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={brandTitle}>
              <span style={brandOnly}>ONLY</span>
              <span style={brandUs}>US</span>
            </div>

            {/* ✅ Username + online */}
            <div style={topSubText}>
              {activeChat ? (
                otherUser?.username ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#e5e7eb", fontWeight: 900 }}>
                      {otherUser.username}
                    </span>

                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: otherOnline ? "#22c55e" : "#aebac1",
                        fontWeight: 800,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: otherOnline ? "#22c55e" : "#64748b",
                        }}
                      />
                      {otherOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                ) : (
                  <span>PIN: {activeChat.otherPin}</span>
                )
              ) : (
                <span>PIN: {me.pin}</span>
              )}
            </div>
          </div>

          <button style={topIconBtn} onClick={copyPin} title="Copy PIN">
            ⧉
          </button>
        </div>

        {/* ✅ SIDE PANEL OVERLAY */}
        <div
          style={{
            ...overlay,
            opacity: panelOpen ? 1 : 0,
            pointerEvents: panelOpen ? "auto" : "none",
          }}
          onClick={() => setPanelOpen(false)}
        />

        {/* ✅ SIDE PANEL */}
        <aside
          style={{
            ...sidePanel,
            transform: panelOpen ? "translateX(0)" : "translateX(-110%)",
          }}
        >
          <div style={sideHeader}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={avatar}>
                {(me.username?.[0] || "U").toUpperCase()}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "white", fontWeight: 900, fontSize: 14 }}>
                  {me.username}
                </div>
                <div style={{ fontSize: 12, color: "#aebac1" }}>
                  Your PIN: <b style={{ color: "#e5e7eb" }}>{me.pin}</b>
                </div>
              </div>
            </div>

            <button style={closeBtn} onClick={() => setPanelOpen(false)}>
              ✕
            </button>
          </div>

          <div style={sideContent}>
            <div style={card}>
              <div style={cardTitle}>Start Chat by PIN</div>

              <input
                style={pinInput}
                placeholder="Enter other person's PIN"
                value={otherPin}
                onChange={(e) =>
                  setOtherPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />

              <button style={primaryBtn} onClick={openChat}>
                Open Chat
              </button>
            </div>

            <div style={card}>
              <div style={cardTitle}>Danger Zone</div>
              <button style={dangerBtn} onClick={deleteAllChats}>
                Delete All Chats
              </button>
            </div>

            <div style={card}>
              <div style={cardTitle}>Account</div>
              <button
                style={secondaryBtn}
                onClick={() => {
                  const ok = confirm("Logout?");
                  if (!ok) return;
                  setScreen("auth");
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* ✅ CHAT AREA */}
        <main style={chatArea}>
          {/* ✅ Strap */}
          <div style={chatStrap}>
            {activeChat ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontWeight: 900, color: "white", fontSize: 14 }}>
                  {otherUser?.username || "Chat Partner"}
                </div>
                <div style={{ fontSize: 12, color: "#aebac1" }}>
                  PIN: <b style={{ color: "#e5e7eb" }}>{activeChat.otherPin}</b>
                  <span
                    style={{
                      marginLeft: 10,
                      color: otherOnline ? "#22c55e" : "#aebac1",
                    }}
                  >
                    {otherOnline ? "• Online" : "• Offline"}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: "#aebac1", fontWeight: 900 }}>
                No chat opened
              </div>
            )}
          </div>

          {/* ✅ MESSAGES */}
          <div style={messagesWrap} onClick={() => setMenuMsgId(null)}>
            {!activeChat && (
              <div style={emptyBox}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>
                  Welcome to ONLYUS 🔐
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                  Tap <b>☰</b> and open chat using PIN.
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isMe = m.fromPin === me.pin;
              const showMenu = menuMsgId === m.id;

              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    padding: "6px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      maxWidth: "78%",
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (isMe && !m.deletedForAll) setMenuMsgId(m.id);
                    }}
                  >
                    <div
                      style={{
                        ...bubble,
                        background: isMe ? "#d9fdd3" : "#ffffff",
                        opacity: m.deletedForAll ? 0.7 : 1,
                      }}
                    >
                      <div style={msgText}>{m.text}</div>
                    </div>

                    {isMe && !m.deletedForAll && (
                      <div style={{ position: "relative" }}>
                        <button
                          style={dotsBtnOutside}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuMsgId((prev) => (prev === m.id ? null : m.id));
                          }}
                          title="Options"
                        >
                          ⋮
                        </button>

                        {showMenu && (
                          <div
                            style={menuBoxOutside}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              style={menuItem}
                              onClick={() => deleteMessage(m.id, m.fromPin)}
                            >
                              🗑️ Delete Message
                            </button>

                            <button
                              style={{ ...menuItem, color: "#555" }}
                              onClick={() => setMenuMsgId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {/* ✅ INPUT */}
          <div style={inputBar}>
            <input
              style={chatInput}
              placeholder={activeChat ? "Message..." : "Open a chat first..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={!activeChat}
            />
            <button style={sendBtn} onClick={send} disabled={!activeChat}>
              ➤
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ✅ STYLES */
const appWrap = {
  height: "100vh",
  overflow: "hidden",
  background: "#0b141a",
  display: "flex",
  justifyContent: "center",
};

const shell = {
  width: "100%",
  height: "100vh",
  background: "#111b21",
  display: "flex",
  flexDirection: "column",
  maxWidth: "min(1200px, 100vw)",
  margin: "0 auto",
  borderLeft: "1px solid rgba(255,255,255,0.06)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
};

const mobileTopBar = {
  height: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 12px",
  background: "#202c33",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const brandTitle = {
  fontWeight: 1000,
  fontSize: 20,
  letterSpacing: 2,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  gap: 2,
  textTransform: "uppercase",
};

const brandOnly = {
  background: "linear-gradient(90deg, #25D366, #00c6ff)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textShadow: "0 10px 30px rgba(37,211,102,0.25)",
};

const brandUs = {
  color: "white",
  textShadow: "0 10px 30px rgba(0,0,0,0.45)",
};

const topSubText = {
  fontSize: 12,
  color: "#aebac1",
  display: "flex",
  alignItems: "center",
  minHeight: 16,
};

const topIconBtn = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontSize: 16,
};

const chatStrap = {
  padding: "10px 14px",
  background: "#202c33",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  transition: "0.2s",
  zIndex: 40,
};

const sidePanel = {
  position: "fixed",
  top: 0,
  left: 0,
  height: "100vh",
  width: "86vw",
  maxWidth: 360,
  background: "#111b21",
  zIndex: 50,
  transition: "0.25s",
  boxShadow: "30px 0 80px rgba(0,0,0,0.45)",
  display: "flex",
  flexDirection: "column",
};

const sideHeader = {
  padding: 14,
  background: "#202c33",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const closeBtn = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontSize: 14,
};

const avatar = {
  width: 44,
  height: 44,
  borderRadius: 16,
  background: "linear-gradient(135deg,#25D366,#00c6ff)",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 16,
  color: "#0b141a",
};

const sideContent = {
  padding: 14,
  display: "grid",
  gap: 12,
  overflowY: "auto",
};

const card = {
  background: "#202c33",
  borderRadius: 18,
  padding: 14,
  border: "1px solid rgba(255,255,255,0.06)",
};

const cardTitle = {
  color: "white",
  fontWeight: 900,
  marginBottom: 10,
  fontSize: 13,
};

const pinInput = {
  width: "100%",
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111b21",
  color: "white",
  outline: "none",
};

const primaryBtn = {
  width: "100%",
  marginTop: 10,
  padding: 12,
  borderRadius: 14,
  border: "none",
  background: "#25D366",
  color: "white",
  cursor: "pointer",
  fontWeight: 950,
};

const secondaryBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 14,
  border: "none",
  background: "#111b21",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const dangerBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "#111b21",
  color: "#ff6b6b",
  cursor: "pointer",
  fontWeight: 950,
};

const chatArea = {
  height: "calc(100vh - 56px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const messagesWrap = {
  flex: 1,
  minHeight: 0,
  padding: 10,
  overflowY: "auto",
  background:
    "linear-gradient(rgba(17,27,33,0.93), rgba(17,27,33,0.93)), repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 10px, transparent 10px, transparent 20px)",
};

const bubble = {
  maxWidth: "100%",
  padding: "10px 14px",
  borderRadius: 18,
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  lineHeight: 1.35,
};

const msgText = {
  fontSize: 14,
  color: "#111",
};

const dotsBtnOutside = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  fontWeight: 900,
  fontSize: 16,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const menuBoxOutside = {
  position: "absolute",
  top: 36,
  right: 0,
  background: "white",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 14px 40px rgba(0,0,0,0.18)",
  overflow: "hidden",
  minWidth: 170,
  zIndex: 10,
};

const menuItem = {
  width: "100%",
  padding: "10px 12px",
  border: "none",
  background: "white",
  cursor: "pointer",
  fontWeight: 850,
  textAlign: "left",
};

const emptyBox = {
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: 16,
  borderRadius: 16,
  maxWidth: 420,
  margin: "20px auto",
  textAlign: "center",
};

const inputBar = {
  padding: 12,
  background: "#202c33",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  gap: 10,
};

const chatInput = {
  flex: 1,
  padding: "12px 14px",
  borderRadius: 999,
  border: "none",
  outline: "none",
  fontSize: 14,
  background: "#111b21",
  color: "white",
};

const sendBtn = {
  width: 46,
  height: 46,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  background: "#25D366",
  fontWeight: 900,
  fontSize: 16,
};
