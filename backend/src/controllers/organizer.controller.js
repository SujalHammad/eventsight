const mongoose=require("mongoose")
const { asyncHandler } = require("../utility/AsyncHandler");
const {ApiError}=require("../utility/ApiError.js")
const {ApiResponse}=require("../utility/ApiResponse.js");
const { Organizer } = require("../models/organizer.model.js");
const { uploadOnCloudinary } = require("../utility/cloudinary.js");
const {EventCategory}=require("../models/eventCategory.model.js");


const DEFAULT_FEEDBACK_RATINGS = Object.freeze({
    organizerReputation: 0.5,
    lineupQuality: 0.55,
    activationMaturity: 0.5
})

const buildFeedbackAggregateFields = () => ({
    totalFeedbacks: { $size: "$feedbacks" },
    avgOrganizerReputation: {
        $cond: [
            { $gt: [{ $size: "$feedbacks" }, 0] },
            {
                $divide: [
                    { $add: [{ $sum: "$feedbacks.organizerReputation" }, DEFAULT_FEEDBACK_RATINGS.organizerReputation] },
                    { $add: [{ $size: "$feedbacks" }, 1] }
                ]
            },
            DEFAULT_FEEDBACK_RATINGS.organizerReputation
        ]
    },
    avgLineupQuality: {
        $cond: [
            { $gt: [{ $size: "$feedbacks" }, 0] },
            {
                $divide: [
                    { $add: [{ $sum: "$feedbacks.lineupQuality" }, DEFAULT_FEEDBACK_RATINGS.lineupQuality] },
                    { $add: [{ $size: "$feedbacks" }, 1] }
                ]
            },
            DEFAULT_FEEDBACK_RATINGS.lineupQuality
        ]
    },
    avgActivationMaturity: {
        $cond: [
            { $gt: [{ $size: "$feedbacks" }, 0] },
            {
                $divide: [
                    { $add: [{ $sum: "$feedbacks.activationMaturity" }, DEFAULT_FEEDBACK_RATINGS.activationMaturity] },
                    { $add: [{ $size: "$feedbacks" }, 1] }
                ]
            },
            DEFAULT_FEEDBACK_RATINGS.activationMaturity
        ]
    }
})



const parseSocialMedia = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(s => ({ ...s, link: typeof s.link === 'string' ? s.link.replace(/^"|"$/g, '').trim() : s.link }));
    if (typeof raw !== 'string') return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map(s => ({ ...s, link: typeof s.link === 'string' ? s.link.replace(/^"|"$/g, '').trim() : s.link })) : [];
    } catch { return []; }
};

const eventCreate=asyncHandler(async(req,res)=>{
    const {
        eventName,
        eventCategory,
        eventDescription,
        location,
        capacity,
        date,
        ask,
        ticketPrice,
        marketingBudget,
        isIndoor,
        socialMediaAccount: rawSocial
    }=req.body;

    const socialMediaAccount = parseSocialMedia(rawSocial);

     if(
        !eventName ||
        !eventCategory ||
        !eventDescription ||
        !location ||
        !capacity ||
        !date ||
        !ask ||
        !ticketPrice ||
        !marketingBudget ||
        isIndoor === undefined
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existingEventCategory=await EventCategory.findById(eventCategory);

    if(!existingEventCategory){
        throw new ApiError(404,"Event Category not Found");
    }

    let thumbnailLocalFilePath;
    if(req.file){
        thumbnailLocalFilePath=req.file.path;
    }
    
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
        eventCategory,
        eventDescription,
        location,
        capacity,
        date,
        ask,
        ticketPrice,
        marketingBudget,
        isIndoor,
        socialMediaAccount,
        thumbnail: uploadThumbnail?.url || null
    })

    return res.status(201).json(
        new ApiResponse(201,
            event,
            "Event created Successfully"
        )
    );

})


const getOrganizerEvents = asyncHandler(async (req,res)=>{

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10,50)

    const skip = (page-1)*limit

    const filter = {
        organizer:req.user._id,
        isDeleted:false
    }

    if(req.query.type==="active" || req.query.type==="upcoming"){
        filter.date = { $gte: new Date() };
    }

    if(req.query.type==="expired" || req.query.type==="completed"){
        filter.date = { $lt: new Date() };
    }

    if(req.query.search){
        filter.eventName = {
            $regex:req.query.search,
            $options:"i"
        }
    }

    if(req.query.category){
        filter.eventCategory = req.query.category
    }

    if(req.query.location){
        filter.location = {
            $regex:req.query.location,
            $options:"i"
        }
    }

    const result = await Organizer.aggregate([

        { $match: filter },

        {
            $lookup:{
                from:"eventcategories",
                localField:"eventCategory",
                foreignField:"_id",
                as:"eventCategory"
            }
        },

        {
            $unwind:{
                path:"$eventCategory",
                preserveNullAndEmptyArrays:true
            }
        },

       

        {
            $lookup:{
                from:"eventfeedbacks",
                localField:"_id",
                foreignField:"event",
                as:"feedbacks"
            }
        },

        {
            $addFields:{
                ...buildFeedbackAggregateFields(),
                status: {
                    $cond: { if: { $lt: ["$date", new Date()] }, then: "completed", else: "upcoming" }
                }
            }
        },
        {
            $project:{
                feedbacks:0
            }
        },

        { $sort:{createdAt:-1} },

        {
            $facet:{
                events:[
                    { $skip:skip },
                    { $limit:limit }
                ],
                totalCount:[
                    { $count:"count" }
                ],
                pastEventsCount:[
                    { $match:{ date: { $lt: new Date() } } },
                    { $count:"count" }
                ]
            }
        }

    ])

    const events = result[0]?.events || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    const pastEventsOrganized = result[0]?.pastEventsCount[0]?.count || 0 

    return res.status(200).json(

        new ApiResponse(
            200,
            {
                events,
                pastEventsOrganized: pastEventsOrganized,
                pagination:{
                    total,
                    page,
                    limit,
                    totalPages:Math.ceil(total/limit)
                }
            },
            "Events fetched successfully"
        )
    )

})

const getOrganizerEventsById = asyncHandler(async(req,res)=>{

    if(!mongoose.Types.ObjectId.isValid(req.params.eventId)){
        throw new ApiError(400,"Invalid event id")
    }

    const event = await Organizer.aggregate([

        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.params.eventId),
                organizer:req.user._id,
                isDeleted:false
            }
        },

        {
            $lookup:{
                from:"eventcategories",
                localField:"eventCategory",
                foreignField:"_id",
                as:"eventCategory"
            }
        },

        {
            $unwind:{
                path:"$eventCategory",
                preserveNullAndEmptyArrays:true
            }
        },

       

        {
            $lookup:{
                from:"eventfeedbacks",
                localField:"_id",
                foreignField:"event",
                as:"feedbacks"
            }
        },

        {
            $addFields:{
                ...buildFeedbackAggregateFields(),
                status: {
                    $cond: { if: { $lt: ["$date", new Date()] }, then: "completed", else: "upcoming" }
                }
            }
        }

    ])

    if(!event.length){
        throw new ApiError(404,"Event not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            event[0],
            "Event fetched by id successfully"
        )
    )
})

const updateEvent = asyncHandler(async(req,res)=>{

    if(!mongoose.Types.ObjectId.isValid(req.params.eventId)){
        throw new ApiError(400,"Invalid event id")
    }

    const data = req.body

    if(!data || Object.keys(data).length === 0){
        throw new ApiError(400,"No data provided for update")
    }

    const allowedFields = [
        "eventName",
        "eventCategory",
        "eventDescription",
        "location",
        "capacity",
        "date",
        "ask",
        "ticketPrice",
        "marketingBudget",
        "isIndoor",
        "socialMediaAccount"
    ]

    const updateData = {}

    for(const key of allowedFields){
        if(data[key] !== undefined){
            if(key === 'socialMediaAccount'){
                updateData[key] = parseSocialMedia(data[key])
            } else {
                updateData[key] = data[key]
            }
        }
    }

    if(Object.keys(updateData).length === 0){
        throw new ApiError(400,"No valid fields to update")
    }

 

    if(updateData.eventName){
        updateData.eventName = updateData.eventName.trim()
    }

    if(updateData.eventDescription){
        updateData.eventDescription = updateData.eventDescription.trim()
    }

    if(updateData.location){
        updateData.location = updateData.location.trim()
    }

    

    if(updateData.eventCategory){

        if(!mongoose.Types.ObjectId.isValid(updateData.eventCategory)){
            throw new ApiError(400,"Invalid event category id")
        }

        const category = await EventCategory.findById(updateData.eventCategory)

        if(!category){
            throw new ApiError(404,"Event category not found")
        }
    }

   

    if(updateData.date){
        const newDate = new Date(updateData.date)

        if(newDate <= new Date()){
            throw new ApiError(400,"Event date must be in future")
        }
    }

    

    if(req.file){
        const upload = await uploadOnCloudinary(req.file.path)

        if(!upload){
            throw new ApiError(500,"Thumbnail upload failed")
        }

        updateData.thumbnail = upload.url
    }

    const event = await Organizer.findOneAndUpdate(

        {
            _id:req.params.eventId,
            organizer:req.user._id,
            isDeleted:false
        },

        { $set:updateData },

        {
            new:true,
            runValidators:true
        }
    )

    if(!event){
        throw new ApiError(404,"Event not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            event,
            "Event updated successfully"
        )
    )

})

//updateThumbnail option should be
const deleteEvent = asyncHandler(async(req,res)=>{

    if(!mongoose.Types.ObjectId.isValid(req.params.eventId)){
        throw new ApiError(400,"Invalid event id")
    }

    const event = await Organizer.findOneAndUpdate(

        {
            _id:req.params.eventId,
            organizer:req.user._id,
            isDeleted:false
        },

        {isDeleted:true},

        {new:true}

    )

    if(!event){
        throw new ApiError(404,"Event not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            event,
            "Event deleted successfully"
        )
    )

})



module.exports={eventCreate,getOrganizerEvents,getOrganizerEventsById,updateEvent,deleteEvent}

