const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { EventCategory } = require("../models/eventCategory.model");
const { BrandType } = require("../models/sponserBrandTypes.model");
const { City } = require("../models/city.model");
const { Organizer } = require("../models/organizer.model");
const { User } = require("../models/user.model");
const { ApiError } = require("../utility/ApiError");
const { ApiResponse } = require("../utility/ApiResponse");
const { asyncHandler } = require("../utility/AsyncHandler");

// ─── Admin Auth ───────────────────────────────────────────────────

const adminLogin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        throw new ApiError(400, "Username and password are required");
    }

    const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin@123";

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        throw new ApiError(401, "Invalid admin credentials");
    }

    const token = jwt.sign(
        { role: "admin", username: ADMIN_USER },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "24h" }
    );

    res.cookie("adminToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json(
        new ApiResponse(200, { token, username: ADMIN_USER }, "Admin login successful")
    );
});

const adminLogout = asyncHandler(async (req, res) => {
    res.clearCookie("adminToken");
    return res.status(200).json(new ApiResponse(200, null, "Admin logged out"));
});

// ─── Event Categories ────────────────────────────────────────────

const createEventCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) throw new ApiError(400, "Name is required");

    const existing = await EventCategory.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") }, isDeleted: false });
    if (existing) throw new ApiError(400, "Category already exists");

    const eventC = await EventCategory.create({ name: name.trim() });
    return res.status(201).json(new ApiResponse(201, eventC, "EventCategory created successfully"));
});

const getEventCategories = asyncHandler(async (req, res) => {
    const categories = await EventCategory.find({ isDeleted: false }).sort({ createdAt: 1 });
    return res.status(200).json(new ApiResponse(200, categories, "Event categories fetched successfully"));
});

const deleteEventCategory = asyncHandler(async (req, res) => {
    const cat = await EventCategory.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true },
        { new: true }
    );
    if (!cat) throw new ApiError(404, "Category not found");
    return res.status(200).json(new ApiResponse(200, null, "Category deleted"));
});

// ─── Brand Types ─────────────────────────────────────────────────

const createBrandType = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) throw new ApiError(400, "Name is required");

    const existing = await BrandType.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (existing) throw new ApiError(400, "Brand type already exists");

    const brandType = await BrandType.create({ name });
    return res.status(201).json(new ApiResponse(201, brandType, "Brand type created successfully"));
});

const getBrandTypes = asyncHandler(async (req, res) => {
    const brands = await BrandType.find({}).sort({ createdAt: 1 });
    return res.status(200).json(new ApiResponse(200, brands, "Brand types fetched successfully"));
});

const deleteBrandType = asyncHandler(async (req, res) => {
    const bt = await BrandType.findByIdAndDelete(req.params.id);
    if (!bt) throw new ApiError(404, "Brand type not found");
    return res.status(200).json(new ApiResponse(200, null, "Brand type deleted"));
});

// ─── Cities ──────────────────────────────────────────────────────

const createCity = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) throw new ApiError(400, "Name is required");

    const existing = await City.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") }, isDeleted: false });
    if (existing) throw new ApiError(400, "City already exists");

    const city = await City.create({ name: name.trim() });
    return res.status(201).json(new ApiResponse(201, city, "City created successfully"));
});

const getCities = asyncHandler(async (req, res) => {
    const cities = await City.find({ isDeleted: false }).sort({ name: 1 });
    return res.status(200).json(new ApiResponse(200, cities, "Cities fetched successfully"));
});

const deleteCity = asyncHandler(async (req, res) => {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) throw new ApiError(404, "City not found");
    return res.status(200).json(new ApiResponse(200, null, "City deleted"));
});

// ─── Users Management ────────────────────────────────────────────

const getAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
        filter.$or = [
            { username: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } }
        ];
    }

    const [users, total] = await Promise.all([
        User.find(filter).select("-password -refreshToken").sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        users,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    }, "Users fetched successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid user id");
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    return res.status(200).json(new ApiResponse(200, null, "User deleted permanently"));
});

// ─── Events Management ───────────────────────────────────────────

const getAllEventsAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.eventName = { $regex: req.query.search, $options: "i" };

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
            $addFields: {
                "organizerInfo.password": "$$REMOVE",
                "organizerInfo.refreshToken": "$$REMOVE"
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $facet: {
                events: [{ $skip: skip }, { $limit: limit }],
                totalCount: [{ $count: "count" }]
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, {
        events: result[0]?.events || [],
        pagination: {
            total: result[0]?.totalCount[0]?.count || 0,
            page, limit,
            totalPages: Math.ceil((result[0]?.totalCount[0]?.count || 0) / limit)
        }
    }, "Events fetched successfully"));
});

const deleteEventAdmin = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid event id");
    const event = await Organizer.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!event) throw new ApiError(404, "Event not found");
    return res.status(200).json(new ApiResponse(200, null, "Event deleted"));
});

// ─── Platform Stats ──────────────────────────────────────────────

const getPlatformStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalOrganizers,
        totalSponsors,
        totalEvents,
        activeEvents,
        completedEvents,
        totalCategories,
        totalBrandTypes
    ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: "organizer" }),
        User.countDocuments({ role: "sponsor" }),
        Organizer.countDocuments({ isDeleted: false }),
        Organizer.countDocuments({ isDeleted: false, isExpired: false, status: "upcoming" }),
        Organizer.countDocuments({ isDeleted: false, status: "completed" }),
        EventCategory.countDocuments({ isDeleted: false }),
        BrandType.countDocuments({})
    ]);

    // New signups last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    return res.status(200).json(new ApiResponse(200, {
        totalUsers,
        totalOrganizers,
        totalSponsors,
        totalEvents,
        activeEvents,
        completedEvents,
        totalCategories,
        totalBrandTypes,
        recentUsers
    }, "Platform stats fetched"));
});

module.exports = {
    adminLogin,
    adminLogout,
    createEventCategory,
    getEventCategories,
    deleteEventCategory,
    createBrandType,
    getBrandTypes,
    deleteBrandType,
    createCity,
    getCities,
    deleteCity,
    getAllUsers,
    deleteUser,
    getAllEventsAdmin,
    deleteEventAdmin,
    getPlatformStats
}