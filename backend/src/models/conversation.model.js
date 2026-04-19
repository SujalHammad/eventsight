const mongoose=require('mongoose')

const conversationSchema=new mongoose.Schema({
    organizerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    sponsorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    eventId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Organizer'
    },
    lastMessage:{
        type:String
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }
})

const Conversation=mongoose.model('Conversation',conversationSchema);

module.exports={Conversation}