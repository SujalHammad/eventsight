const express=require("express");
const { verifyJwt } = require("../middleware/auth.middleware");
const { authorizeRole } = require("../middleware/roleCheck");
const { createSponsorProfile, getSponsorProfile, updateSponsorProfile, deleteSponsorProfile, giveFeedback, getMyFeedback, getEventById, getAllEvents, updateFeedback, getPrediction } = require("../controllers/sponsor.controller");
const { upload } = require("../middleware/multer.middleware");

const sponsorRoute=express.Router();

//sponsor profile
sponsorRoute.post("/profileCreate",verifyJwt,authorizeRole("sponsor"),upload.single("logo"),createSponsorProfile); 
sponsorRoute.get("/profileFetch",verifyJwt,authorizeRole("sponsor"),getSponsorProfile);
sponsorRoute.patch("/profileUpdate",verifyJwt,authorizeRole("sponsor"),upload.single("logo"),updateSponsorProfile); 
sponsorRoute.delete("/profileDelete",verifyJwt,authorizeRole("sponsor"),deleteSponsorProfile);


// event fetch 
sponsorRoute.get("/events",verifyJwt,authorizeRole("sponsor"),getAllEvents);
sponsorRoute.get("/events/:id",verifyJwt,authorizeRole("sponsor"),getEventById);

// completed events for feedback 
sponsorRoute.get("/completed-events",verifyJwt,authorizeRole("sponsor"),getCompletedEvents);

// feedback
sponsorRoute.post("/events/:id/feedback",verifyJwt,authorizeRole("sponsor"),giveFeedback);
sponsorRoute.get("/events/:id/feedback",verifyJwt,authorizeRole("sponsor"),getMyFeedback);
sponsorRoute.patch("/events/:id/feedback",verifyJwt,authorizeRole("sponsor"),updateFeedback);

// predict
sponsorRoute.get("/predict/:eventId", verifyJwt, authorizeRole("sponsor"), getPrediction);
 
module.exports={sponsorRoute}