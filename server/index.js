import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 5000;

/* ✅ Online users tracker (FAST + REALTIME) */
const onlineUsers = new Map(); // pin -> socketId

/* ✅ MongoDB Connect */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.log("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
}

/* ✅ Schemas */
const userSchema = new mongoose.Schema(
  {
    pin: { type: String, unique: true, required: true },
    username: { type: String, required: true },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    chatKey: { type: String, unique: true, required: true },
    members: { type: [String], required: true }, // [pin1,pin2]
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, default: uuidv4 },
    chatKey: { type: String, required: true },

    fromPin: { type: String, required: true },
    fromName: { type: String, required: true },
    toPin: { type: String, required: true },

    text: { type: String, required: true },
    time: { type: Number, required: true },

    deletedForAll: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Chat = mongoose.model("Chat", chatSchema);
const Message = mongoose.model("Message", messageSchema);

/* ✅ Helpers */
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function makeChatKey(pinA, pinB) {
  return [pinA, pinB].sort().join("-");
}

/* ✅ Routes */
app.get("/", (req, res) => {
  res.json({ ok: true, message: "ONLYUS MongoDB Server Running ✅" });
});

// ✅ Create account => unique PIN
app.post("/api/user/create", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username?.trim()) {
      return res.status(400).json({ ok: false, message: "Username required" });
    }

    let pin = generatePin();
    while (await User.findOne({ pin })) pin = generatePin();

    const user = await User.create({ pin, username: username.trim() });
    return res.json({ ok: true, pin: user.pin, username: user.username });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ✅ Login by PIN
app.post("/api/user/login", async (req, res) => {
  try {
    const { pin } = req.body;

    const user = await User.findOne({ pin });
    if (!user) return res.status(404).json({ ok: false, message: "Invalid PIN" });

    return res.json({
      ok: true,
      user: { pin: user.pin, username: user.username },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ✅ Get full chat history
app.get("/api/chat/:myPin/:otherPin", async (req, res) => {
  try {
    const { myPin, otherPin } = req.params;

    const me = await User.findOne({ pin: myPin });
    const other = await User.findOne({ pin: otherPin });

    if (!me) return res.status(404).json({ ok: false, message: "Your PIN not found" });
    if (!other) return res.status(404).json({ ok: false, message: "Other PIN not found" });

    const chatKey = makeChatKey(myPin, otherPin);

    const messages = await Message.find({ chatKey }).sort({ time: 1 });

    return res.json({ ok: true, chatKey, messages });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/* ✅ Socket.IO */
io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  // ✅ Delete ALL chats of user
  socket.on("delete_all_chats", async ({ myPin }) => {
    try {
      const myChats = await Chat.find({ members: myPin });
      const keys = myChats.map((c) => c.chatKey);

      await Message.deleteMany({ chatKey: { $in: keys } });
      await Chat.deleteMany({ chatKey: { $in: keys } });

      socket.emit("all_chats_deleted");
    } catch (err) {
      socket.emit("error_msg", "Failed to delete chats ❌");
    }
  });

  // ✅ user is online
  socket.on("user_online", ({ myPin }) => {
    if (!myPin) return;

    onlineUsers.set(myPin, socket.id);

    // broadcast status to everyone
    io.emit("user_status", { pin: myPin, online: true });

    // attach pin to socket for disconnect cleanup
    socket.data.pin = myPin;
  });

  // ✅ open chat
  socket.on("open_chat", async ({ myPin, otherPin }) => {
    try {
      const me = await User.findOne({ pin: myPin });
      const other = await User.findOne({ pin: otherPin });

      if (!me || !other) {
        socket.emit("error_msg", "PIN not valid ❌");
        return;
      }

      const chatKey = makeChatKey(myPin, otherPin);

      let chat = await Chat.findOne({ chatKey });
      if (!chat) {
        chat = await Chat.create({ chatKey, members: [myPin, otherPin] });
      }

      socket.join(chatKey);

      const messages = await Message.find({ chatKey }).sort({ time: 1 });

      // ✅ send messages
      socket.emit("chat_history", { chatKey, messages });

      // ✅ send other user meta (username + online)
      socket.emit("chat_meta", {
        otherUser: { pin: other.pin, username: other.username },
        online: onlineUsers.has(otherPin),
      });
    } catch {
      socket.emit("error_msg", "Server error ❌");
    }
  });

  // ✅ send dm
  socket.on("send_dm", async ({ myPin, otherPin, text }) => {
    try {
      if (!text?.trim()) return;

      const sender = await User.findOne({ pin: myPin });
      const receiver = await User.findOne({ pin: otherPin });

      if (!sender || !receiver) {
        socket.emit("error_msg", "PIN not valid ❌");
        return;
      }

      const chatKey = makeChatKey(myPin, otherPin);

      let chat = await Chat.findOne({ chatKey });
      if (!chat) {
        chat = await Chat.create({ chatKey, members: [myPin, otherPin] });
      }

      const msg = await Message.create({
        id: uuidv4(),
        chatKey,
        fromPin: myPin,
        fromName: sender.username,
        toPin: otherPin,
        text: text.trim(),
        time: Date.now(),
      });

      io.to(chatKey).emit("new_dm", msg);

      // ✅ if receiver is online notify them too
      const receiverSocketId = onlineUsers.get(otherPin);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("dm_notify", {
          fromPin: myPin,
          fromName: sender.username,
          text: msg.text,
        });
      }
    } catch {
      socket.emit("error_msg", "Message failed ❌");
    }
  });

  // ✅ delete message
  socket.on("delete_message", async ({ myPin, messageId }) => {
    try {
      const msg = await Message.findOne({ id: messageId });
      if (!msg) return;

      if (msg.fromPin !== myPin) return;

      msg.deletedForAll = true;
      msg.text = "🗑️ This message was deleted";
      await msg.save();

      io.to(msg.chatKey).emit("message_deleted", {
        messageId: msg.id,
        newText: msg.text,
      });
    } catch {}
  });

  // ✅ disconnect
  socket.on("disconnect", () => {
    const pin = socket.data.pin;
    if (pin) {
      onlineUsers.delete(pin);
      io.emit("user_status", { pin, online: false });
    }

    console.log("❌ Disconnected:", socket.id);
  });
});

/* ✅ Start */
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
});
