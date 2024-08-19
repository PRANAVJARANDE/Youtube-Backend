import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import {Video} from '../models/video.model.js'
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
    const {page=1,limit=10,query='',sortBy='createdAt',sortType='desc',userId}=req.query;
    const pageNumber=parseInt(page);
    const limitNumber=parseInt(limit);
    const sortDirection= (sortType==='asc')? 1 : -1;
    let match={}
    if(query)
    {
        match.$or =[
            { title : {$regex:query , $options:'i'}},
            { description:{$regex:query , $options:'i'}}
        ]
    }
    if(userId)
    {
        match.owner =userId;
    }

    const videos=await Video.aggregatePaginate(Video.aggregate([
        {
            $match: match
        },
        {
            $sort: {
                [sortBy]:sortDirection
            }
        },
        {
            $skip:(pageNumber-1)*limitNumber
        },
        {
            $limit:limitNumber
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            fullname:1,
                            avatar:1,
                            username:1,
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{$first: "$owner"}
            }
        }
    ]),{page:pageNumber,limit:limitNumber});
    if(videos.docs.length==0)
    {
        return res.status(200).json(new ApiResponse(200,[],"NO VIDEOS FOUND"));
    }
    return res.status(200).json(new ApiResponse(200,videos.docs,"Videos fetched Sucessfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body;
    if(!title)throw new ApiError(400,"Title Required");
    if(!description)throw new ApiError(400,"Description Required");
    const videoLocalPath=req.files?.videoFile[0]?.path;
    const thumbnailLocalPath=req.files?.thumbnail[0]?.path;

    if(!videoLocalPath)
    {
        throw new ApiError(400,"Video not uploaded Successfully");
    }
    if(!thumbnailLocalPath)
    {
        throw new ApiError(400,"Thumbnail not uploaded Successfully");
    }

    const videoType=req.files?.videoFile[0]?.mimetype;
    const thumbnailType=req.files?.thumbnail[0]?.mimetype;
    const allowedVideoMimeTypes = ["video/mp4", "video/mkv", "video/webm"];
    const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/gif","image/jpg"];

    if(!allowedVideoMimeTypes.includes(videoType))
    {
        throw new ApiError(400, "Invalid video file type. Only MP4, MKV, and WebM are allowed.");
    }
    if (!allowedImageMimeTypes.includes(thumbnailType)) {
        throw new ApiError(400, "Invalid thumbnail file type. Only JPEG, PNG, JPG and GIF are allowed.");
    }

    const thumbnailOnCloudinary=await uploadOnCloudinary(thumbnailLocalPath);
    const videoOnCloudinary=await uploadOnCloudinary(videoLocalPath);
    if(!videoOnCloudinary)
    {
        throw new ApiError(500,"Error while uploading Video");
    }
    if(!thumbnailOnCloudinary)
    {
        throw new ApiError(500,"Error while uploading Thumbnail");
    }
    
    const video=await Video.create(
        {
            title,
            description,
            isPublished:true,
            owner:req.user,
            duration:videoOnCloudinary.duration,
            videoFile:videoOnCloudinary.url,
            thumbnail:thumbnailOnCloudinary.url
        }
    );

    if(!video)
    {
        throw new ApiError(500,"Something went wrong while creating a video");
    }
    return res.status(200).json(new ApiResponse(200,video,"Video Published Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title,description,togglePublish}=req.body;
    const thumbnailLocalPath=req.file?.path;
    if(!thumbnailLocalPath && !title && !description && !togglePublish)
    {
        throw new ApiError(400,"Information not provided by user");
    }
    const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/gif","image/jpg"];
    const thumbnailType=req.file?.mimetype;
    if (!allowedImageMimeTypes.includes(thumbnailType)) {
        throw new ApiError(400, "Invalid thumbnail file type. Only JPEG, PNG, JPG and GIF are allowed.");
    }

    const video=await Video.findById(videoId);
    if(!video)
    {
        throw new ApiError(404,"Video not found");
    }
    if(title)video.title=title;
    if(description)video.description=description;
    if(togglePublish)video.isPublished=!video.isPublished;
    if(thumbnailLocalPath)
    {
        const thumbnailOnCloudinary=await uploadOnCloudinary(thumbnailLocalPath);
        if(!thumbnailOnCloudinary)
        {
            throw new ApiError(500,"Something went wrong while uploading on Cloudinary");
        }
        video.thumbnail=thumbnailOnCloudinary.url;
    }
    await video.save({validateBeforeSave:false});
    return res.status(200).json(new ApiResponse(200,video,"Information Updated Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const videoo = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            likedBy: 1,
                            createdAt: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "comment",
                            as: "commentlikes",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            commentlikeCount: { $size: "$commentlikes" }, 
                            owner: { $arrayElemAt: ["$owner", 0] } 
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            content: 1,
                            createdAt: 1,
                            owner: 1,
                            commentlikeCount: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" },
            }
        }
    ]);

    if (videoo.length === 0) {
        throw new ApiError(404, "Video does not exist");
    }

    return res.status(200).json(new ApiResponse(200, videoo[0], "Video fetched successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    try {
        const deleteStatus=await Video.findByIdAndDelete(videoId);
        if(deleteStatus)
        {
            res.status(201).json(new ApiResponse(200,deleteStatus,"Video Deleted Successfully"));
        }
        else
        {
            res.status(500).json(new ApiResponse(404,null,"Document Not Found"));
        }
    } catch (error) {
        throw new ApiError(500,"Something went wrong in Deleting");
    }
});

export {getAllVideos,publishAVideo,getVideoById,updateVideo,deleteVideo}