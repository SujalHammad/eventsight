const jwt = require("jsonwebtoken");
const { ApiError } = require("../utility/ApiError");
const { asyncHandler } = require("../utility/AsyncHandler");

const verifyAdmin = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.adminToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new ApiError(401, "Admin access denied — not authenticated");

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        throw new ApiError(401, "Invalid or expired admin token");
    }

    if (decoded.role !== "admin") {
        throw new ApiError(403, "Forbidden — admin role required");
    }

    req.admin = decoded;
    next();
});

module.exports = { verifyAdmin };
