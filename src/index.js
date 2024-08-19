// require('dotenv').config({path:'.env'});
import dotenv from 'dotenv'
import connectDB from './db/index.js'
import { app } from './app.js'

dotenv.config({
    path:'./.env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`APP IS LISTENING ON PORT ${process.env.PORT || 8000}`);
    });
})
.catch((err)=>{
    console.log("MongoDB Connection Failed",err);
})

/* 
//IIFE For Connecting DB method I 
(async()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("Error",(error)=>{
            console.log("ERROR: ",error);
            throw error;
        });
        app.listen(process.env.PORT,()=>{
            console.log(`APP IS LISTENING ON PORT ${process.env.PORT}`);
        });
    } catch (error){
        console.log("Error: ",error);
        throw err;
    }
})();

 */
