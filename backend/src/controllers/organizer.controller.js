const { asyncHandler } = require("../utility/AsyncHandler");
const {ApiError}=require("../utility/ApiError.js")
const {ApiResponse}=require("../utility/ApiResponse.js");
const { Organizer } = require("../models/organizer.model.js");
const { uploadOnCloudinary } = require("../utility/cloudinary.js");
const {EventCategory}=require("../models/eventCategory.model.js")


const eventCreate=asyncHandler(async(req,res)=>{
    const {
        eventName,
        eventCategory,
        eventDescription,
        location,
        capacity,
        date,
        ask
    }=req.body;

    if(!eventName || !eventCategory || !eventDescription || !location || !capacity || !date ||!ask){
        throw new ApiError(400,"All fields are required");
    }

    const existingEventCategory=await EventCategory.findById(eventCategory);

    if(!existingEventCategory){
        throw new ApiError(404,"Event Category not exist");
    }

    let thumbnailLocalFilePath;
    if(req.file){
        thumbnailLocalFilePath=req.file.path;
    }

    console.log(thumbnailLocalFilePath)
    let uploadThumbnail;
    if(thumbnailLocalFilePath){
        uploadThumbnail=await uploadOnCloudinary(thumbnailLocalFilePath);

        if(!uploadThumbnail){
            throw new ApiError(500,"Error while uploading on cloudinary")
        }
    }
    

    const event=await Organizer.create({
        organizer:req.user._id,
        eventName,
        eventCategory:existingEventCategory._id,
        eventDescription,
        location,
        capacity,
        date,
        ask,
        thumbnail:uploadThumbnail?.url || null
    })

    return res.status(201).json(
        new ApiResponse(201,
            event,
            "Event created Successfully"
        )
    );

})

module.exports={eventCreate}