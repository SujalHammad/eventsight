const express=require("express");
const { verifyJwt } = require("../middleware/auth.middleware");
const { authorizeRole } = require("../middleware/roleCheck");
const { createSponsorProfile, getSponsorProfile, updateSponsorProfile, deleteSponsorProfile, giveFeedback, getMyFeedback, getEventById, getAllEvents, updateFeedback, getPrediction } = require("../controllers/sponsor.controller");

const sponsorRoute=express.Router();



// ########



//sponsor profile
sponsorRoute.post("/profileCreate",verifyJwt,authorizeRole("sponsor"),createSponsorProfile); //yaha pe photo vala bacha hai
sponsorRoute.get("/profileFetch",verifyJwt,authorizeRole("sponsor"),getSponsorProfile);
sponsorRoute.patch("/profileUpdate",verifyJwt,authorizeRole("sponsor"),updateSponsorProfile); //yaha pe bhi photo vala bacha hai 
sponsorRoute.delete("/profileDelete",verifyJwt,authorizeRole("sponsor"),deleteSponsorProfile);

// //event fetch
sponsorRoute.get("/events",verifyJwt,authorizeRole("sponsor"),getAllEvents); //query
sponsorRoute.get("/events/:id",verifyJwt,authorizeRole("sponsor"),getEventById);
sponsorRoute.post("/events/:id/feedback",verifyJwt,authorizeRole("sponsor"),giveFeedback)  // feedback do
sponsorRoute.get("/events/:id/feedback",verifyJwt,authorizeRole("sponsor"),getMyFeedback)  // apna feedback dekho
sponsorRoute.patch("/events/:id/feedback",verifyJwt,authorizeRole("sponsor"),updateFeedback)

// //predict
sponsorRoute.get("/predict/:eventId", verifyJwt, authorizeRole("sponsor"), getPrediction)
 


// //sponsor application
// sponsorRoute.post("/events/:id/apply")   // apply karo
// sponsorRoute.get("/applications/")  //apni saari applications dekho
// sponsorRoute.get("/applications/:id")  // ek application detail (negotiation history)
// sponsorRoute.post("/application/:id/negotiate")  // counter offer do
//  sponsorRoute.get("/applications/:id/withdraw")   // withdraw karo



// POST   /events/:id/feedback           // feedback do
// GET    /events/:id/feedback           // apna feedback dekho

// GET    /dashboard
// // total applications, accepted, pending, 
// // negotiating, total spent etc.


module.exports={sponsorRoute}