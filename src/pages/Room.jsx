import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:5000";

export default function Room({ pin, username, setScreen }) {
  const socket = useMemo(() => io(API, { transports: ["websocket"] }), []);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {
    if (!pin || !username) {
      setScreen("home");
      return;
    }

    socket.emit("join_room", { pin, username });

    const onNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onSystemMsg = (txt) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), username: "SYSTEM", text: txt, time: Date.now() },
      ]);
    };

    const onMembersUpdate = (list) => setMembers(list);

    const onErrorMsg = (err) => {
      alert(err);
      setScreen("home");
    };

    socket.on("new_message", onNewMessage);
    socket.on("system_msg", onSystemMsg);
    socket.on("members_update", onMembersUpdate);
    socket.on("error_msg", onErrorMsg);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("system_msg", onSystemMsg);
      socket.off("members_update", onMembersUpdate);
      socket.off("error_msg", onErrorMsg);
      socket.disconnect();
    };
  }, [pin, username, socket, setScreen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!text.trim()) return;
    socket.emit("send_message", { pin, username, text });
    setText("");
  }

  return (
    <div style={appWrap}>
      {/* LEFT SIDEBAR */}
      <aside style={sidebar}>
        <div style={sidebarHeader}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14 }}>ONLYUS</div>
            <div style={{ fontSize: 12, color: "#aebac1" }}>Private PIN Room</div>
          </div>
          <button onClick={() => setScreen("home")} style={leaveSmall}>
            Leave
          </button>
        </div>

        <div style={roomInfo}>
          <div style={pinBox}>
            <div style={{ fontSize: 11, color: "#aebac1" }}>ROOM PIN</div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>
              {pin}
            </div>
          </div>

          <div style={userBox}>
            <div style={{ fontSize: 11, color: "#aebac1" }}>YOU</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{username}</div>
          </div>
        </div>

        <div style={membersBox}>
          <div style={membersTitle}>Members ({members.length})</div>
          <div style={membersList}>
            {members.map((m, idx) => (
              <div key={idx} style={memberItem}>
                <div style={avatar}>{m[0]?.toUpperCase() || "U"}</div>
                <div style={{ fontWeight: 700 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* CHAT */}
      <main style={chatArea}>
        {/* TOP BAR */}
        <div style={chatTop}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={chatAvatar}>🔐</div>
            <div>
              <div style={{ fontWeight: 900 }}>Room Chat</div>
              <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                {members.length} online
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            
          </div>
        </div>

        {/* MESSAGES */}
        <div style={messagesWrap}>
          {messages.map((m) => {
            const isMe = m.username === username;
            const isSystem = m.username === "SYSTEM";

            if (isSystem) {
              return (
                <div key={m.id} style={systemRow}>
                  <div style={systemBubble}>{m.text}</div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    ...bubble,
                    background: isMe ? "#d9fdd3" : "#ffffff",
                    borderTopLeftRadius: isMe ? 16 : 6,
                    borderTopRightRadius: isMe ? 6 : 16,
                  }}
                >
                  {!isMe && (
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#16a34a" }}>
                      {m.username}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: "#111" }}>{m.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div style={inputBar}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            style={chatInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button onClick={sendMessage} style={sendBtn}>
            ➤
          </button>
        </div>
      </main>
    </div>
  );
}

/* ✅ Styles */
const appWrap = {
  height: "100vh",
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  background: "#111b21",
};

const sidebar = {
  borderRight: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  flexDirection: "column",
  background: "#111b21",
};

const sidebarHeader = {
  padding: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const leaveSmall = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "none",
  background: "#202c33",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const roomInfo = {
  padding: 14,
  display: "grid",
  gap: 10,
};

const pinBox = {
  background: "#202c33",
  borderRadius: 14,
  padding: 12,
  color: "white",
};

const userBox = {
  background: "#202c33",
  borderRadius: 14,
  padding: 12,
  color: "white",
};

const membersBox = {
  padding: 14,
  flex: 1,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const membersTitle = {
  color: "white",
  fontWeight: 900,
  marginBottom: 10,
};

const membersList = {
  overflowY: "auto",
  paddingRight: 6,
};

const memberItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 8px",
  borderRadius: 12,
  color: "white",
  background: "rgba(255,255,255,0.04)",
  marginBottom: 8,
};

const avatar = {
  width: 34,
  height: 34,
  borderRadius: 12,
  background: "#25D366",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  color: "#111",
};

const chatArea = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
};

const chatTop = {
  padding: "12px 14px",
  background: "#202c33",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const chatAvatar = {
  width: 36,
  height: 36,
  borderRadius: 14,
  background: "#111b21",
  display: "grid",
  placeItems: "center",
};

const messagesWrap = {
  flex: 1,
  padding: "18px",
  overflowY: "auto",
  background:
    "linear-gradient(rgba(17,27,33,0.92), rgba(17,27,33,0.92)), repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 10px, transparent 10px, transparent 20px)",
};

const bubble = {
  maxWidth: "70%",
  padding: "10px 12px",
  borderRadius: 16,
  boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
};

const systemRow = {
  display: "flex",
  justifyContent: "center",
  padding: "8px 0",
};

const systemBubble = {
  background: "rgba(255,255,255,0.08)",
  color: "#e2e8f0",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 12,
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
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  background: "#25D366",
  fontWeight: 900,
  fontSize: 16,
};
