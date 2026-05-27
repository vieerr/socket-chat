const express = require("express");
const { createServer } = require("http");
const path = require("path");
const cookieParser = require("cookie-parser");

const realTimeServer = require("./realTimeServer");
const router = require("./routes/chat");

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;

app.set("port", PORT);
app.set("views", path.join(__dirname, "views"));

app.use(cookieParser());
app.use(express.json());
app.use(router);
app.use(express.static(path.join(__dirname, "public")));

realTimeServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
