const {ApiError}=require("../utility/ApiError.js")

const authorizeRole=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            throw new ApiError(403,"Access Denied");
        }
        next();
    }
}

module.exports={authorizeRole};