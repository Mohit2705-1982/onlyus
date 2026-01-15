import { useState } from "react";

const API = "http://localhost:5000";

export default function Home({ setScreen, pin, setPin, username, setUsername }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function createRoom() {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API}/api/room/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!data.ok) {
        setMsg("❌ Failed to create room");
        setLoading(false);
        return;
      }

      setPin(data.pin);
      setMsg(`✅ Room created! PIN: ${data.pin}`);
    } catch (err) {
      setMsg("❌ Backend not running (start server first)");
    }

    setLoading(false);
  }

  async function joinRoom() {
    if (!username.trim()) return setMsg("❌ Enter username first");
    if (pin.length !== 6) return setMsg("❌ Enter valid 6-digit PIN");

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API}/api/room/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMsg("❌ Room not found");
        setLoading(false);
        return;
      }

      setScreen("room");
    } catch (err) {
      setMsg("❌ Backend not running (start server first)");
    }

    setLoading(false);
  }

  return (
    <div style={card}>
      <h1 style={{ fontSize: 28 }}>🔐 ONLYUS (PIN Space MVP)</h1>
      <p style={{ color: "#666" }}>
        Private room. No search. No friends. Just PIN ✅
      </p>

      <div style={{ marginTop: 15 }}>
        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your name"
          style={input}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Room PIN</label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit PIN"
          style={input}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={createRoom} disabled={loading} style={btn}>
          {loading ? "..." : "Create Room"}
        </button>

        <button onClick={joinRoom} disabled={loading} style={btn}>
          {loading ? "..." : "Join Room"}
        </button>
      </div>

      {msg && <p style={messageBox}>{msg}</p>}
    </div>
  );
}

const card = {
  maxWidth: 520,
  margin: "60px auto",
  padding: "22px",
  borderRadius: "14px",
  border: "1px solid #ddd",
  background: "white",
  boxShadow: "0 10px 30px rgba(0,0,0,0.07)",
};

const input = {
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  borderRadius: "10px",
  border: "1px solid #ccc",
  outline: "none",
  fontSize: "15px",
};

const btn = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

const messageBox = {
  marginTop: 15,
  padding: 12,
  background: "#f4f4f4",
  borderRadius: 10,
};
