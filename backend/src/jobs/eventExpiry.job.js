const cron=require("node-cron");
const {Organizer}=require("../models/organizer.model.js")

cron.schedule("* * * * *",async()=>{
   try {
     const now=new Date();
     await Organizer.updateMany(
         {date:{$lte:now},isExpired:false},
         {$set:{
             status:"completed",
             isExpired:true
         }}
     );
   } catch (err) {
        console.error("error updating expired event",err);
   }
    
});

