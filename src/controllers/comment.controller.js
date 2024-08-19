import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from '../models/video.model.js'

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const commentsPipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            avatar: 1,
                            username: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                }
            }
        },
        {
            $sort: {
                createdAt: -1 
            }
        }

    ];

    const options = { page: parseInt(page), limit: parseInt(limit) };
    const paginatedComments = await Comment.aggregatePaginate(Comment.aggregate(commentsPipeline), options);

    if (paginatedComments.docs.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No comments found"));
    }

    return res.status(200).json(new ApiResponse(200, paginatedComments.docs, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {content}=req.body;
    const video=await Video.findById(videoId);
    if(!video)
    {
        throw new ApiError(404,"Video does not exist");
    }
    if(!content)
    {
        throw new ApiError(404,"Comment content is required");
    }

    const comment=await Comment.create({
        content,
        owner:req.user?._id,
        video:videoId
    });
    return res.status(200).json(new ApiResponse(200,comment,"Comment Created Successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content}=req.body;
    if(!content)
    {
        throw new ApiError(404,"Content is required to update the comment");
    }
    const comment=await Comment.findByIdAndUpdate(commentId,
        {
            $set:{
                content:content
            }
        },
        {
            new:true
        }
    );
    if(!comment)
    {
        throw new ApiError(404,"Comment not found or something went wrong");
    }
    return res.status(200).json(new ApiResponse(200,comment,"Comment updated Successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const deleteStatus=await Comment.findByIdAndDelete(commentId);
    if(deleteStatus)
    {
        return res.status(200).json(new ApiResponse(200,deleteStatus,"Comment Deleted Successfully"));
    }
    else
    {
        return res.status(500).json(new ApiResponse(404,null,"Comment not found"));
    }
})

export {getVideoComments, addComment, updateComment,deleteComment}