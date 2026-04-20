const express=require("express");
const { verifyJwt } = require("../middleware/auth.middleware.js");
const { authorizeRole } = require("../middleware/roleCheck.js");
const { upload } = require("../middleware/multer.middleware.js");
const { eventCreate, getOrganizerEvents, getOrganizerEventsById, updateEvent, deleteEvent } = require("../controllers/organizer.controller.js");

const organizerRoute=express.Router();

organizerRoute.post(
    "/events",
    verifyJwt,
    authorizeRole("organizer"),
    upload.any(),
    eventCreate
) 

organizerRoute.get("/events",verifyJwt,authorizeRole("organizer"),getOrganizerEvents); 
organizerRoute.get("/events/:eventId",verifyJwt,authorizeRole("organizer"),getOrganizerEventsById);
organizerRoute.patch("/events/:eventId",verifyJwt,authorizeRole("organizer"),upload.any(),updateEvent)
organizerRoute.delete("/events/:eventId",verifyJwt,authorizeRole("organizer"),deleteEvent)  //softDelete






module.exports={organizerRoute};