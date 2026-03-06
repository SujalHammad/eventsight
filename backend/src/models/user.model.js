const mongoose=require("mongoose")
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")
const userSchema=new mongoose.Schema(
    {
        username:{
            type:String,
            required:true,
            lowercase:true,
            trim:true,
            unique:true
        },
        email:{
            type:String,
            required:true,
            lowercase:true,
            unique:true,
            trim:true,
            match:[/^\S+@\S+\.\S+$/, "Invalid email"]
        },
        password:{
            type:String,
            required:true,
            minlength:[6,"password should be greater than or equal to  6"],
            select:false
        },
        role:{
            type:String,
            enum:["organizer","sponsor","admin"],
            default:"organizer",
            index:true

        },
        refreshToken:{
            type:String
        },
        isVerified:{
            type:Boolean,
            default:false
        }
    },{
        timestamps:true
    }
)

userSchema.pre("save",async function(){
        if(!this.isModified("password")) return ;
    
        this.password=await bcrypt.hash(this.password,10);
    } 
)

userSchema.methods.comparePassword=async function(enteredPassword){
   return await bcrypt.compare(enteredPassword,this.password);
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign({_id:this._id},process.env.ACCESS_TOKEN_SECRET,{expiresIn:process.env.ACCESS_TOKEN_EXPIRY})
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign({_id:this._id},process.env.REFRESH_TOKEN_SECRET,{expiresIn:process.env.REFRESH_TOKEN_EXPIRY})
}

const User=mongoose.model("User",userSchema)
module.exports={User}