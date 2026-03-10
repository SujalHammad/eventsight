const express=require("express");
const { createEventCategory, createBrandType } = require("../controllers/admin");

const adminRoute=express.Router();

adminRoute.post("/createCategory",createEventCategory)
adminRoute.post("/createBrandType",createBrandType)

module.exports={adminRoute}