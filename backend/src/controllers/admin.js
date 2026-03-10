const { EventCategory } = require("../models/eventCategory.model");
const { BrandType } = require("../models/sponserBrandTypes.model");
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

const createBrandType = asyncHandler(async (req, res) => {

    const { name } = req.body

    if (!name) {
        throw new ApiError(400, "Name is required")
    }

    const existing = await BrandType.findOne({ name: name.toLowerCase().trim() })

    if (existing) {
        throw new ApiError(400, "Brand type already exists")
    }

    const brandType = await BrandType.create({ name })

    return res.status(201).json(
        new ApiResponse(201, brandType, "Brand type created successfully")
    )
})

module.exports={createEventCategory,createBrandType}