const { default: mongoose } = require("mongoose");
const { EventCategory } = require("../models/eventCategory.model");
const { Organizer } = require("../models/organizer.model");
const { BrandType } = require("../models/sponserBrandTypes.model");
const { Sponsor } = require("../models/sponsers.model");
const { ApiError } = require("../utility/ApiError");
const { ApiResponse } = require("../utility/ApiResponse");
const { asyncHandler } = require("../utility/AsyncHandler");
const { uploadOnCloudinary } = require("../utility/cloudinary");
const { eventCreate } = require("./organizer.controller");
const {EventFeedBack}=require("../models/eventFeedBack.model")
const axios = require("axios")

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

const createSponsorProfile=asyncHandler(async(req,res)=>{
    const existing = await Sponsor.findOne({ sponsor: req.user._id, isDeleted: false })
    if(existing){
        throw new ApiError(400, "Sponsor profile already exists")
    }
    const {brandName,brandType,description, brandKpi,cityFocus}=req.body;
    if(!brandName || !brandType || !description || !brandKpi ||!cityFocus){
        throw new ApiError(400,"All fields are required");
    }
    const existBrandType=await BrandType.findById(brandType)
    if(!existBrandType){
        throw new ApiError(400,"Brand type not exist");
    }

    let sponsorLogoLocalFilePath;
    if(req.file){
        sponsorLogoLocalFilePath=req.file.path;
    }

    let sponsorLogo;
    if(sponsorLogoLocalFilePath){
        sponsorLogo=await uploadOnCloudinary(sponsorLogoLocalFilePath)
        if(!sponsorLogo){
            throw new ApiError(500, "Logo upload failed")
        }
    }

    const sponsor=await Sponsor.create({
        sponsor:req.user._id,
        brandName,
        brandType,
        description,
        brandKpi,
        cityFocus,
        logo:sponsorLogo?.url || null
    })

    return res.status(201).json(
        new ApiResponse(
            201,
            sponsor,
            "Sponsor profile created successfully"
        )
    )
})

const getSponsorProfile=asyncHandler(async(req,res)=>{
    const profile=await Sponsor.findOne({sponsor:req.user._id,isDeleted:false})
    .populate("brandType","name");
     if (!profile) {
        throw new ApiError(404, "Sponsor profile not found")
    }

     return res.status(200).json(
        new ApiResponse(200, profile, "Sponsor profile fetched successfully")
    )
})

const updateSponsorProfile = asyncHandler(async (req, res) => {

    const data = req.body

    if (!data || Object.keys(data).length === 0 && !req.file) {
        throw new ApiError(400, "No data provided for update")
    }

    const allowedFields = ["brandName", "brandType", "description", "brandKpi", "cityFocus"]

    const updateData = {}

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            updateData[key] = data[key]
        }
    }

    if (Object.keys(updateData).length === 0 && !req.file) {
        throw new ApiError(400, "No valid fields to update")
    }


    if (updateData.brandType) {
        const existBrandType = await BrandType.findById(updateData.brandType)
        if (!existBrandType) {
            throw new ApiError(404, "Brand type not found")
        }
    }


    if (req.file) {
        const upload = await uploadOnCloudinary(req.file.path)
        if (!upload) throw new ApiError(500, "Logo upload failed")
        updateData.logo = upload.url
    }

    const profile = await Sponsor.findOneAndUpdate(
        { sponsor: req.user._id, isDeleted: false },
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate("brandType", "name")

    if (!profile) {
        throw new ApiError(404, "Sponsor profile not found")
    }

    return res.status(200).json(
        new ApiResponse(200, profile, "Sponsor profile updated successfully")
    )
})

const deleteSponsorProfile = asyncHandler(async (req, res) => {

    const profile = await Sponsor.findOneAndUpdate(
        { sponsor: req.user._id, isDeleted: false },
        { isDeleted: true },
        { new: true }
    )

    if (!profile) {
        throw new ApiError(404, "Sponsor profile not found")
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Sponsor profile deleted successfully")
    )
})

const getAllEvents = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    const skip = (page - 1) * limit

    const filter = {
        isDeleted: false,
        date: { $gte: new Date() }
    }

    if (req.query.search) {
        filter.eventName = { $regex: req.query.search, $options: "i" }
    }

    if (req.query.category) {
        filter.eventCategory = new mongoose.Types.ObjectId(req.query.category)
    }

    if (req.query.location) {
        filter.location = { $regex: req.query.location, $options: "i" }
    }

    if (req.query.isIndoor !== undefined) {
        filter.isIndoor = req.query.isIndoor === "true"
    }

    if (req.query.minAsk || req.query.maxAsk) {
        filter.ask = {}
        if (req.query.minAsk) filter.ask.$gte = Number(req.query.minAsk)
        if (req.query.maxAsk) filter.ask.$lte = Number(req.query.maxAsk)
    }

    const result = await Organizer.aggregate([

        { $match: filter },

        
        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

       
        {
            $lookup: {
                from: "users",
                localField: "organizer",
                foreignField: "_id",
                as: "organizerInfo"
            }
        },
        { $unwind: { path: "$organizerInfo", preserveNullAndEmptyArrays: true } },

        
        {
            $lookup: {
                from: "eventfeedbacks",
                localField: "_id",
                foreignField: "event",
                as: "feedbacks"
            }
        },

        {
            $addFields: {
                ...buildFeedbackAggregateFields(),
                "organizerInfo.password": "$$REMOVE",
                "organizerInfo.refreshToken": "$$REMOVE",
                status: "upcoming"
            }
        },

        { $project: { feedbacks: 0 } },

        { $sort: { createdAt: -1 } },

        {
            $facet: {
                events: [
                    { $skip: skip },
                    { $limit: limit }
                ],
                totalCount: [
                    { $count: "count" }
                ]
            }
        }
    ])

    const events = result[0]?.events || []
    const total = result[0]?.totalCount[0]?.count || 0

    return res.status(200).json(
        new ApiResponse(200, {
            events,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, "Events fetched successfully")
    )
})
const getEventById = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const event = await Organizer.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.params.id),
                isDeleted: false,
                isExpired: false,
                status: "upcoming"
            }
        },

       
        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

       
        {
            $lookup: {
                from: "users",
                localField: "organizer",
                foreignField: "_id",
                as: "organizerInfo"
            }
        },
        { $unwind: { path: "$organizerInfo", preserveNullAndEmptyArrays: true } },

        
        {
            $lookup: {
                from: "eventfeedbacks",
                localField: "_id",
                foreignField: "event",
                as: "feedbacks"
            }
        },

        
        {
            $lookup: {
                from: "organizers",
                localField: "organizer",
                foreignField: "organizer",
                as: "allOrganizerEvents"
            }
        },

        {
            $addFields: {
                ...buildFeedbackAggregateFields(),

                
                pastEventOrganized: {
                    $size: {
                        $filter: {
                            input: "$allOrganizerEvents",
                            as: "e",
                            cond: {
                                $and: [
                                    { $lt: ["$$e.date", new Date()] },
                                    { $eq: ["$$e.isDeleted", false] }
                                ]
                            }
                        }
                    }
                },

                "organizerInfo.password": "$$REMOVE",
                "organizerInfo.refreshToken": "$$REMOVE",
                status: "upcoming"
            }
        },

        
        { $project: { feedbacks: 0, allOrganizerEvents: 0 } }

    ])

    if (!event.length) {
        throw new ApiError(404, "Event not found")
    }

    return res.status(200).json(
        new ApiResponse(200, event[0], "Event fetched successfully")
    )
})

const giveFeedback = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    
    const event = await Organizer.findOne({
        _id: req.params.id,
        isDeleted: false,
        isExpired:true,
        date: { $lt: new Date() }
    })

    if (!event) {
        throw new ApiError(404, "Event not found or not completed yet")
    }

    
    const existing = await EventFeedBack.findOne({
        event: req.params.id,
        sponsor: req.user._id
    })

    if (existing) {
        throw new ApiError(400, "Feedback already submitted for this event")
    }

    const { organizerReputation, lineupQuality, activationMaturity } = req.body

    const feedback = await EventFeedBack.create({
        event: req.params.id,
        sponsor: req.user._id,
        ...(organizerReputation !== undefined && { organizerReputation }),
        ...(lineupQuality !== undefined && { lineupQuality }),
        ...(activationMaturity !== undefined && { activationMaturity })
    })

    return res.status(201).json(
        new ApiResponse(201, feedback, "Feedback submitted successfully")
    )
})

const getMyFeedback = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const feedback = await EventFeedBack.findOne({
        event: req.params.id,
        sponsor: req.user._id,
        isDeleted: false
    }).populate("event", "eventName date location")

    if (!feedback) {
        throw new ApiError(404, "Feedback not found")
    }

    return res.status(200).json(
        new ApiResponse(200, feedback, "Feedback fetched successfully")
    )
})

const updateFeedback = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const data = req.body

    if (!data || Object.keys(data).length === 0) {
        throw new ApiError(400, "No data provided for update")
    }

    const allowedFields = ["organizerReputation", "lineupQuality", "activationMaturity"]

    const updateData = {}

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            updateData[key] = data[key]
        }
    }

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No valid fields to update")
    }

    const feedback = await EventFeedBack.findOneAndUpdate(
        { event: req.params.id, sponsor: req.user._id },
        { $set: updateData },
        { new: true, runValidators: true }
    )

    if (!feedback) {
        throw new ApiError(404, "Feedback not found")
    }

    return res.status(200).json(
        new ApiResponse(200, feedback, "Feedback updated successfully")
    )
})



const getPrediction = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    
    const sponsorProfile = await Sponsor.findOne({
        sponsor: req.user._id,
        isDeleted: false
    }).populate("brandType", "name")

    if (!sponsorProfile) {
        throw new ApiError(404, "Sponsor profile not found")
    }

    
    const event = await Organizer.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.params.eventId),
                isDeleted: false,
                date: { $gte: new Date() }
            }
        },

    
        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

        
        {
            $lookup: {
                from: "organizers",
                localField: "organizer",
                foreignField: "organizer",
                as: "allOrganizerEvents"
            }
        },

        {
            $addFields: {
                totalSocialReach: { $sum: "$socialMediaAccount.followers" },
                
                pastEventOrganized: {
                    $size: {
                        $filter: {
                            input: "$allOrganizerEvents",
                            as: "e",
                            cond: {
                                $and: [
                                    { $lt: ["$$e.date", new Date()] },
                                    { $eq: ["$$e.isDeleted", false] }
                                ]
                            }
                        }
                    }
                },
               
                pastEventIds: {
                    $map: {
                        input: {
                            $filter: {
                                input: "$allOrganizerEvents",
                                as: "e",
                                cond: {
                                    $and: [
                                        { $lt: ["$$e.date", new Date()] },
                                        { $eq: ["$$e.isDeleted", false] }
                                    ]
                                }
                            }
                        },
                        as: "e",
                        in: "$$e._id"
                    }
                }
            }
        },

        { $project: { allOrganizerEvents: 0 } }
    ])

    if (!event.length) {
        throw new ApiError(404, "Event not found")
    }

    const eventData = event[0]

    let avgOrganizerReputation = DEFAULT_FEEDBACK_RATINGS.organizerReputation
    let avgLineupQuality       = DEFAULT_FEEDBACK_RATINGS.lineupQuality
    let avgActivationMaturity  = DEFAULT_FEEDBACK_RATINGS.activationMaturity

    if (eventData.pastEventIds && eventData.pastEventIds.length > 0) {
        
        const feedbackStats = await EventFeedBack.aggregate([
            {
                $match: {
                    event: { $in: eventData.pastEventIds }
                }
            },
            {
                $group: {
                    _id: null,
                    feedbackCount: { $sum: 1 },
                    sumOrganizerReputation: { $sum: "$organizerReputation" },
                    sumLineupQuality: { $sum: "$lineupQuality" },
                    sumActivationMaturity: { $sum: "$activationMaturity" }
                }
            }
        ])

        if (feedbackStats.length > 0) {
            const stats = feedbackStats[0]
            const divisor = (stats.feedbackCount || 0) + 1

            avgOrganizerReputation = ((stats.sumOrganizerReputation || 0) + DEFAULT_FEEDBACK_RATINGS.organizerReputation) / divisor
            avgLineupQuality       = ((stats.sumLineupQuality || 0) + DEFAULT_FEEDBACK_RATINGS.lineupQuality) / divisor
            avgActivationMaturity  = ((stats.sumActivationMaturity || 0) + DEFAULT_FEEDBACK_RATINGS.activationMaturity) / divisor
        }
        
    }
    

  
    let analyzeBrandResponse
    try {
        analyzeBrandResponse = await axios.post(
            `${process.env.ML_API_URL}/analyze-brand`,
            {
                company_name:      sponsorProfile.brandName,
                industry:          sponsorProfile.brandType.name,
                brand_description: sponsorProfile.description
            },
            {
                headers: {
                    "x-api-key":    process.env.ML_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        )
    } catch (error) {
        throw new ApiError(500, "Brand analysis failed")
    }

    
    let predictResponse
    try {
        predictResponse = await axios.post(
            `${process.env.ML_API_URL}/predict`,
            {
                city:                      eventData.location,
                event_type:                eventData.eventCategory?.name || "",
                sponsor_category:          sponsorProfile.brandType.name,
                brand_name:                sponsorProfile.brandName,
                brand_description:         sponsorProfile.description,
                event_description:         eventData.eventDescription,
                date:                      new Date(eventData.date).toISOString().split("T")[0],
                price:                     eventData.ticketPrice,
                marketing_budget:          eventData.marketingBudget,
                sponsor_amount:            eventData.ask,
                venue_capacity:            eventData.capacity,
                organizer_reputation:      avgOrganizerReputation,
                lineup_quality:            avgLineupQuality,
                brand_activation_maturity: avgActivationMaturity,
                is_indoor:                 eventData.isIndoor ? 1 : 0,
                social_media_reach:        eventData.totalSocialReach,
                past_events_organized:     eventData.pastEventOrganized,
                brand_kpi:                 sponsorProfile.brandKpi,
                brand_city_focus:          sponsorProfile.cityFocus
            },
            {
                headers: {
                    "x-api-key":    process.env.ML_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        )
    } catch (error) {
        console.log(error.response?.data);
        throw new ApiError(500, "Prediction failed")
    }

    return res.status(200).json(
        new ApiResponse(200, {
            brandAnalysis: analyzeBrandResponse.data,
            prediction: predictResponse.data
        }, "Prediction fetched successfully")
    )
})

const getCompletedEvents = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const skip = (page - 1) * limit

    const filter = {
        isDeleted: false,
        date: { $lt: new Date() }
    }

    if (req.query.search) {
        filter.eventName = { $regex: req.query.search, $options: "i" }
    }

    const result = await Organizer.aggregate([
        { $match: filter },

        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "users",
                localField: "organizer",
                foreignField: "_id",
                as: "organizerInfo"
            }
        },
        { $unwind: { path: "$organizerInfo", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "eventfeedbacks",
                localField: "_id",
                foreignField: "event",
                as: "feedbacks"
            }
        },

        {
            $addFields: {
                ...buildFeedbackAggregateFields(),
                myFeedback: {
                    $filter: {
                        input: "$feedbacks",
                        as: "f",
                        cond: { $eq: ["$$f.sponsor", req.user._id] }
                    }
                },
                "organizerInfo.password": "$$REMOVE",
                "organizerInfo.refreshToken": "$$REMOVE",
                status: "completed"
            }
        },

        {
            $addFields: {
                hasFeedback: { $gt: [{ $size: "$myFeedback" }, 0] }
            }
        },

        { $project: { feedbacks: 0, myFeedback: 0 } },
        { $sort: { date: -1 } },

        {
            $facet: {
                events: [{ $skip: skip }, { $limit: limit }],
                totalCount: [{ $count: "count" }]
            }
        }
    ])

    const events = result[0]?.events || []
    const total = result[0]?.totalCount[0]?.count || 0

    return res.status(200).json(
        new ApiResponse(200, {
            events,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        }, "Completed events fetched successfully")
    )
})

module.exports={
    createSponsorProfile,
    getSponsorProfile,
    updateSponsorProfile,
    deleteSponsorProfile,
    getAllEvents,
    getCompletedEvents,
    getEventById,
    giveFeedback,
    getMyFeedback,
    updateFeedback,
    getPrediction
}