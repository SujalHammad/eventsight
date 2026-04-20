const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        console.error("BACKEND ERROR:", err);
        
        let statusCode = 500;
        let message = err.message || "Internal server error";
        
        // MongoDB duplicate key error को पहले handle करो
        if (err.code === 11000) {
            statusCode = 400;
            message = "Record already exists with this data.";
        } 
        // फिर custom statusCode check करो
        else if (err.statusCode && typeof err.statusCode === 'number' 
                 && err.statusCode >= 100 && err.statusCode <= 599) {
            statusCode = err.statusCode;
        }

        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }
};

module.exports = { asyncHandler };