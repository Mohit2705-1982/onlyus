import { useEffect, useState } from "react";
import Auth from "./pages/Auth";
import DM from "./pages/DM";

export default function App() {
  const [screen, setScreen] = useState("auth");
  const [me, setMe] = useState(null);

  // ✅ Auto Login on refresh
  useEffect(() => {
    const saved = localStorage.getItem("onlyus_me");
    if (saved) {
      const user = JSON.parse(saved);
      setMe(user);
      setScreen("dm");
    }
  }, []);

  // ✅ Save user when login/create
  useEffect(() => {
    if (me?.pin) {
      localStorage.setItem("onlyus_me", JSON.stringify(me));
    }
  }, [me]);

  function logout() {
    localStorage.removeItem("onlyus_me");
    setMe(null);
    setScreen("auth");
  }

  return (
    <>
      {screen === "auth" && (
        <Auth
          setScreen={setScreen}
          setMe={setMe}
        />
      )}

      {screen === "dm" && (
        <DM
          me={me}
          setScreen={setScreen}
          logout={logout} // ✅ pass logout function
        />
      )}
    </>
  );
}
