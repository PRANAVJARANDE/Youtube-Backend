import mongoose from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content}=req.body;
    if(!content)
    {
        throw new ApiError(400,"Content is Required for a Tweet");
    }

    try {
        const tweet=await Tweet.create({
            content,
            owner:req.user?._id
        });
        return res.status(200).json(new ApiResponse(200,tweet,"Tweet created Successfully"));
    } 
    catch (error) {
        throw new ApiError(500,"Server error in Uploading tweet");
    }
});

const getUserTweets = asyncHandler(async (req, res) => {
    const {username}=req.query;
    const match={};
    if(username)
    {
        const user=await User.findOne({username}).select('_id');
        if (!user) {
            throw new ApiError(404, "User does not exist");
        }
        match.owner=new mongoose.Types.ObjectId(user._id);
    }
    
    
    const userTweets=await Tweet.aggregate([
        {
            $match:match
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            avatar:1,
                            username:1,
                            fullname:1,
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likes",
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner",
                },
                likes:{
                    $size: "$likes",
                }
            }
        }
    ]);

    if(userTweets.length==0)
    {
        return res.status(200).json(new ApiResponse(204,[],"No tweets made by user"));
    }
    return res.status(200).json(new ApiResponse(200,userTweets,"Tweeets of user fetched Successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId}=req.params;
    const {content}=req.body;
    if(!content)
    {
        throw new ApiError(400,"Content is required to update Tweet");
    }
    const newtweet=await Tweet.findByIdAndUpdate(tweetId,{
        $set:{
            content
        }
    },
    {
        new:true
    });
    if(!newtweet)
    {
        throw new ApiError(404,"Tweet does not exists or something went wrong");
    }
    return res.status(200).json(new ApiResponse(200,newtweet,"Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId}=req.params;
    const deleteStatus=await Tweet.findByIdAndDelete(tweetId);
    if(!deleteStatus)
    {
        throw new ApiError(500,"Something went wrong in deleting tweet");
    }
    return res.status(200).json(new ApiResponse(200,deleteStatus,"Tweet deleted successfully"));
});

export {createTweet,getUserTweets,updateTweet,deleteTweet}