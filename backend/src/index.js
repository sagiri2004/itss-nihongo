require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/connectDB");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = ["https://group-web-project-omega.vercel.app"];
// const allowedOrigins = ["http://localhost:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Cho phép gửi cookie và các thông tin xác thực khác
};

module.exports = corsOptions;
app.use(cors(corsOptions));

app.use(express.json());
routes(app);

connectDB();

const db = require("~/models");
const { Op } = require("sequelize");

app.post("/api/conversations", async (req, res) => {
  const { senderId, receiverId } = req.body;

  let conversation = await db.Conversation.findOne({
    where: {
      [Op.or]: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (!conversation) {
    conversation = await db.Conversation.create({ senderId, receiverId });
  }

  res.status(200).json(conversation);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://group-web-project-omega.vercel.app",
    // origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const jwt = require("jsonwebtoken");
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Authentication error: Invalid token"));
    }

    socket.user = decoded;
    next();
  });
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("send_message", async (data) => {
    try {
      const senderId = socket.user.id;
      // chuyen data tu string sang number ghi de len data cu
      const receiverId = Number(data.receiverId); // Ensure it's a number
      const text = data.text;
      const conversationId = data.conversationId;

      console.log("Message received from user:", senderId);
      console.log("Message details:", { receiverId, text, conversationId });
      // Lưu tin nhắn vào database
      const newMessage = await db.Message.create({
        senderId,
        receiverId,
        text,
        conversationId,
      });

      // Gửi tin nhắn đến người nhận
      socket.to(conversationId).emit("receive_message", newMessage);

      // Them truong isOwn de phan biet tin nhan cua minh va nguoi khac
      newMessage.dataValues.isOwn = true;

      // Gửi thông báo về cho người gửi
      socket.emit("send_message_success", newMessage);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Something went wrong");
    }
  });

  // Lắng nghe sự kiện tham gia vào một cuộc trò chuyện
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined conversation: ${conversationId}`);
  });

  // Lắng nghe sự kiện rời khỏi một cuộc trò chuyện
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(conversationId);
    console.log(`User left conversation: ${conversationId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
