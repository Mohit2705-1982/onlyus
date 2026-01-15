import { useState } from "react";

const API = "http://localhost:5001";

export default function Auth({ setScreen, setMe }) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    if (!username.trim()) return setMsg("Enter username ❌");

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API}/api/user/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMsg(data.message || "Failed ❌");
        setLoading(false);
        return;
      }

      // ✅ Save user
      setMe({ pin: data.pin, username: data.username });

      // ✅ Move to DM screen immediately
      setScreen("dm");

      setMsg(`✅ Account created! Your PIN: ${data.pin}`);
    } catch {
      setMsg("Server not running ❌");
    }

    setLoading(false);
  }

  async function login() {
    if (pin.length !== 6) return setMsg("Enter valid 6-digit PIN ❌");

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMsg("Invalid PIN ❌");
        setLoading(false);
        return;
      }

      setMe(data.user);
      setScreen("dm");
    } catch {
      setMsg("Server not running ❌");
    }

    setLoading(false);
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={top}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={logoRow}>
              <h1 style={{ margin: 0, fontSize: 42, letterSpacing: 1 }}>
                ONLYUS
              </h1>
              <span style={{ fontSize: 34 }}>🔐</span>
            </div>

            <p style={{ marginTop: 8, color: "#667085", fontSize: 15 }}>
              Your PIN is your identity. DM anyone by PIN ✅
            </p>
          </div>
        </div>

        {/* Create */}
        <div style={{ marginTop: 18 }}>
          <h2 style={{ margin: 0 }}>Create Account</h2>

          <input
            style={input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <button style={btnSolid} onClick={createAccount} disabled={loading}>
            {loading ? "..." : "Create & Get PIN"}
          </button>
        </div>

        <hr style={{ margin: "18px 0", borderColor: "#eee" }} />

        {/* Login */}
        <div>
          <h2 style={{ margin: 0 }}>Login with PIN</h2>

          <input
            style={input}
            placeholder="Enter your PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />

          <button style={btnOutline} onClick={login} disabled={loading}>
            {loading ? "..." : "Login"}
          </button>
        </div>

        {msg && <div style={alert}>{msg}</div>}
      </div>
    </div>
  );
}

/* ✅ PERFECT CENTER */
const page = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 18,
  background: "radial-gradient(circle at top, #111827, #0b141a 55%)",
};

const card = {
  width: "100%",
  maxWidth: 520,
  background: "white",
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
};

const top = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const logoRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const input = {
  width: "100%",
  marginTop: 12,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #E5E7EB",
  outline: "none",
  fontSize: 15,
};

const btnSolid = {
  width: "100%",
  marginTop: 12,
  padding: 14,
  borderRadius: 14,
  border: "none",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 16,
  background: "#25D366",
  color: "white",
};

const btnOutline = {
  width: "100%",
  marginTop: 12,
  padding: 14,
  borderRadius: 14,
  border: "2px solid #25D366",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 16,
  background: "white",
};

const alert = {
  marginTop: 14,
  padding: 12,
  borderRadius: 14,
  background: "#F4F4F5",
  fontWeight: 700,
};
