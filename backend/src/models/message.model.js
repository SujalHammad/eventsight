const mongoose=require("mongoose");
const { Conversation } = require("./conversation.model");

const messageSchema=new mongoose.Schema({
    conversationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Conversation'
    },
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    senderRole:{
        type:String,
        enum:['organizer','sponsor']
    },
    text:{
       type:String,
       required:true
    },
    isRead:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    }

})

const Message=mongoose.model('Message',messageSchema);
module.exports={Message}