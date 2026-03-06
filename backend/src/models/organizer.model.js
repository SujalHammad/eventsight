const mongoose=require("mongoose")
const organizerSchema=new mongoose.Schema({
    organizer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    eventName:{
        type:String,
        required:true,
        trim:true
    },
    eventCategory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"EventCategory",
        required:true,
        index:true
    },
    eventDescription:{
        type:String,
        required:true,
        trim:true
    },
    location:{
        type:String,
        required:true,
        trim:true
    },
    capacity:{
        type:Number,
        default:0,
        min:0
    },
    Date:{
        type:Date,
        required:true,
        index:true,
        validate:{
            validator:function(value){
                return value>new Date();
            },
            message:"Event date must be in future"
        }
    },
    ask:{
        type:Number,
        required:true,
        min:0
    },
    thumbnail:{
        type:String
    },
    isExpired:{
        type:Boolean,
        default:false,
        index:true
    },
    status:{
        type:String,
        enum:["upcoming","completed","cancelled",],
        default:"upcoming",
        index:true
    },
    isDeleted:{
        type:Boolean,
        default:false,
        index:true
    }
},{timestamps:true})

organizerSchema.index(
    {isDeleted:1,isExpired:1,status:1}
)


const Organizer=mongoose.model("Organizer",organizerSchema)

module.exports={Organizer}