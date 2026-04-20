const express = require("express")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const dotenv = require("dotenv")
const path = require("path")
dotenv.config()

const { connectDb } = require("./db/db.js")

const { authRoute } = require("./routes/auth.route.js")
const { organizerRoute } = require("./routes/organizer.routes.js")
const { adminRoute } = require("./routes/admin.route.js")
const { sponsorRoute } = require("./routes/sponsor.route.js")
const { chatRoute } = require("./routes/chat.route.js")
const http = require("http")
const { Server } = require("socket.io")
const chatSocket = require("./socket/chatSocket.js")
require("./jobs/eventExpiry.job.js")

const app = express()

app.use(cors({
    origin:`${process.env.CLIENT_ORIGIN}`,
    credentials:true
}))

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: `${process.env.CLIENT_ORIGIN}`,
        credentials: true
    }
})

chatSocket(io)


app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ limit: "16kb", extended: true }))
app.use(cookieParser())
app.use("/temp", express.static(path.join(__dirname, "../public/temp")))

app.use("/api/auth", authRoute)
app.use("/api/organizer", organizerRoute)
app.use("/api/admin", adminRoute)
app.use("/api/sponsor", sponsorRoute)
app.use("/api/chat", chatRoute)



connectDb().then(() => {
    server.listen(process.env.PORT || 8000, () => {
        console.log(`app is listening on the port ${process.env.PORT || 8000} `)
    })
}).catch((err) => {
    console.error("connection error")
    process.exit(1)
})