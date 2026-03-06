const express=require("express");
const { verifyJwt } = require("../middleware/auth.middleware.js");
const { authorizeRole } = require("../middleware/roleCheck.js");
const { upload } = require("../middleware/multer.middleware.js");
const { eventCreate } = require("../controllers/organizer.controller.js");

const organizerRoute=express.Router();

organizerRoute.post(
    "/events",
    verifyJwt,
    authorizeRole("organizer"),
    upload.single("thumbnail"),
    eventCreate
)


module.exports={organizerRoute};