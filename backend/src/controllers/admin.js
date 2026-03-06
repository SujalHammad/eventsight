const { EventCategory } = require("../models/eventCategory.model");
const { ApiError } = require("../utility/ApiError");
const { ApiResponse } = require("../utility/ApiResponse");
const { asyncHandler } = require("../utility/AsyncHandler");

const createEventCategory=asyncHandler(async(req,res)=>{
    const {name}=req.body;
    if(!name){
        throw new ApiError(400,"Name is required");
    }
    const eventC=await EventCategory.create({
        name:name
    })

    return res.status(200).json(
        new ApiResponse(200,
            eventC,
            "EventCategory created successfully"
        )
    )
})

module.exports={createEventCategory}