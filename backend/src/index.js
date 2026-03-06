const express=require("express")
const mongoose=require("mongoose")
const cookieParser=require("cookie-parser")
const dotenv=require("dotenv")
dotenv.config()

const {connectDb}=require("./db/db.js")

const { authRoute } = require("./routes/auth.route.js")
const { organizerRoute } = require("./routes/organizer.routes.js")
const { adminRoute } = require("./routes/admin.route.js")

require("./jobs/eventExpiry.job.js")

const app=express()

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({limit:"16kb",extended:true}))
app.use(cookieParser())

app.use("/api/auth",authRoute)
app.use("/api/organizer",organizerRoute)
app.use("/api/admin",adminRoute)



connectDb().then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`app is listening on the port ${process.env.PORT || 8000} `)
    })
}).catch((err)=>{
    console.error("connection error")
    process.exit(1)
})