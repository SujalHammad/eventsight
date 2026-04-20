const cloudinary=require("cloudinary").v2
const fs=require("fs")
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const uploadOnCloudinary=async(localFilePath)=>{
    try{
        if(!localFilePath){
            return null;
        }
        console.log(`[CLOUDINARY] Uploading file: ${localFilePath}`);
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        });
        console.log(`[CLOUDINARY] Upload successful: ${response.secure_url}`);
        
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
            console.log(`[CLOUDINARY] Temp file deleted: ${localFilePath}`);
        }
        return response;
        
    }catch(err){
        console.error(`[CLOUDINARY] UPLOAD FAILED: ${err.message}`);
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
            console.log(`[CLOUDINARY] Temp file deleted after failure: ${localFilePath}`);
        }   
        
        throw new Error(err?.message || "cloudinary upload failed");
    }
}

module.exports={uploadOnCloudinary}