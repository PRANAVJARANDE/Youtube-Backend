import mongoose from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from '../models/video.model.js'
import {Comment} from '../models/comment.model.js'
import {Tweet} from '../models/tweet.model.js'

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const video=await Video.findById(videoId);
    if(!video)
    {
        throw new ApiError(404,"Video Does not Exists");
    }
    const result=await Like.findOneAndDelete({video:videoId,likedBy:req.user?._id});
    if(!result)
    {
        const like=await Like.create({
            likedBy:req.user?._id,
            video:videoId,
            videoName:video.title,
        });
        if(!like)
        {
            throw new ApiError(500,"Unable to like Video- Server Issue");
        }
        return res.status(200).json(new ApiResponse(200,like,"Video Liked Successfully"));
    }
    else
    {
        return res.status(200).json(new ApiResponse(200,result,"Video Disliked Successfully"));
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const comment=await Comment.findById(commentId);
    if(!comment)
    {
        throw new ApiError(404,"Comment Does not Exists");
    }

    const result=await Like.findOneAndDelete({comment:commentId,likedBy:req.user?._id});
    if(!result)
    {
        const like=await Like.create({
            likedBy:req.user,
            comment:commentId,
            commentContent:comment.content
        });
        if(!like)
        {
            throw new ApiError(500,"Unable to like Comment- Server Issue");
        }
        return res.status(200).json(new ApiResponse(200,like,"Comment Liked Successfully"));
    }
    else
    {
        return res.status(200).json(new ApiResponse(200,result,"Comment Disliked Successfully"));
    }

});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const tweet=await Tweet.findById(tweetId);
    if(!tweet)
    {
        throw new ApiError(404,"Tweet Does not Exists");
    }

    const result=await Like.findOneAndDelete({tweet:tweetId,likedBy:req.user?._id});
    if(!result)
    {
        const like=await Like.create({
            likedBy:req.user,
            tweet:tweetId,
            tweetContent:tweet.content
        });
        if(!like)
        {
            throw new ApiError(500,"Unable to like Tweet - Server Issue");
        }
        return res.status(200).json(new ApiResponse(200,like,"Tweet Liked Successfully"));
    }
    else
    {
        return res.status(200).json(new ApiResponse(200,result,"Tweet Disliked Successfully"));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const videos=await Like.aggregate([
        {
            $match:{
                likedBy:req.user?._id
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video",
                pipeline:[
                {
                    $project:{
                        _id:1,
                        videoFile:1,
                        title:1,
                    }
                }]
            }
        },
        {
            $addFields:{
                video:{$first: "$video"}
            }
        }
    ]);
    if(videos.length==0)
    {
        return res.status(200).json(new ApiResponse(200,[],"No liked videos"));
    }
    return res.status(200).json(new ApiResponse(200,videos,"Liked videos Fetched sucessfully"));
});

export {toggleCommentLike,toggleTweetLike,toggleVideoLike,getLikedVideos}