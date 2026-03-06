const express=require("express");
const { createEventCategory } = require("../controllers/admin");

const adminRoute=express.Router();

adminRoute.post("/createCategory",createEventCategory)

module.exports={adminRoute}