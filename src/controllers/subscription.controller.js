import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongoose, { Types } from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelUsername} = req.params;
    const channel=await User.findOne({username:channelUsername});
    if(!channel)
    {
        throw new ApiError(404,"Channel Does not Exists");
    }
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "User not authenticated");
    }
    const subscription=await Subscription.findOne({
        subscriber:  req.user?._id,
        channel: channel._id
    });

    if(subscription)
    {
        const result=await Subscription.findByIdAndDelete(subscription._id);
        if(result)
        {
            return res.status(200).json(new ApiResponse(200,result,"Unsubscribed Channel"));
        }
        throw new ApiError(500,"Something went wrong in Unsubscribing");
    }
    else
    {
        const result=await Subscription.create({
            subscriber:req.user?._id,
            channel:channel._id,
        });
        if(result)
        {
            return res.status(200).json(new ApiResponse(200,result,"Subscribed Channel"));
        }
        throw new ApiError(500,"Something went wrong in Subscribing");
    }
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "User not authenticated");
    }

    const channels=await Subscription.aggregate([
        {
            $match:{
                subscriber: req.user?._id,
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullname:1,
                            avatar:1,
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                channel:{
                    $first:"$channel",
                }
            }
        }
    ]);

    if(channels.length==0)
    {
        return res.status(200).json(new ApiResponse(200,[],"No channels Subscribed Yet"));
    }
    return res.status(200).json(new ApiResponse(200,channels,"Subscribed Channels Fetched Successfully"));
});

export {toggleSubscription,getSubscribedChannels}