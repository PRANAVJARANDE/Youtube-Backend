import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});          //WHILE SAVING PASSWORD IS REQUIRED BUT NOT YET GIVEN 
        return {accessToken,refreshToken};

    } catch (error) {
        throw new ApiError(500,"Something went Wrong");
    }

};

const registerUser= asyncHandler( async (req,res)=>{
    //STEPS-:
    //GET USER DETAILS FROM FRONTEND
    //VALIDATION FOR INPUT DATA- IF ANYTHING NOT LEFT EMPTY
    //CHECK IF USER ALREADY EXISTS-  BY EMAIL
    //CHECK FOR IMAGES, AVATAR  - IF ALL GOOD UPLOAD THEM ON CLOUDINARY 
    //CHECK IF AVATAR IS SUCCESSFULL UPLOADED ON CLOUDINARY 
    //CREATE USER OBJECT 
    //CREATE ENTRY IN DATABASE 
    //REMOVE PASSWORD AND REFRESH TOKEN FIELD FROM RESPONSE 
    //CHECK FOR USER CREATION STATUS IF CRTEATED RETURN RESPONSE ELSE RETURN ERROR

    const {username,fullname,email,password}=req.body;
    if([fullname,email,username,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"All Fields are required");
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    });

    if(existedUser)
    {
        throw new ApiError(409,"User already exists");
    }

    const avatarLocalPath=req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath="";
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
    {
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Required");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar File is Required");
    }

    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username,
    });

    const createUser= await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createUser)
    {
        throw new ApiError(500,"Something went wrong while registering the User");
    }

    return res.status(201).json(
        new ApiResponse(200,createUser,"User Registered Successfully")
    )
});

const loginUser= asyncHandler(async(req,res)=>{
    // STEPS-:
    // BRING DATA FROM req.body 
    // Username or email ans Password entry for login
    //find the user  -> if not present -> User DNE
    //               -> if exists      -> Check password-> Wrong Password -> throw error
    //                                                  -> Right Password -> Generate ACCESS AND REFRESH TOKEN
    //SEND COOKIE
    //SEND SUCCESS RESPONSE

    const {email,username,password}=req.body;
    if(!password)
    {
        throw new ApiError(400,"PASSWORD IS REQUIRED");
    }
    if(!username && !email)
    {
        throw new ApiError(400,"USERNAME OR EMAIL IS REQUIRED");
    }

    const user=await User.findOne({
        $or: [{username},{email}]
    });

    if(!user){
        throw new ApiError(404,"USER DOES NOT EXISTS");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(404,"INVALID PASSWORD");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

    //Sending cookies
    const options={
        httpOnly:true,          
        secure:true ,            //Only server can modify cookie
        sameSite:'strict'
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,
            accessToken,
            refreshToken
        },"USER LOGGED IN SUCCESSFULLY")
    )

});

const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken:1
            }
        },
        {
            new : true
        }
    )

    const options={
        httpOnly:true,          
        secure:true ,            //Only server can modify cookie
        sameSite:'strict'
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out Successfully"))

});

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"Unauthorized Request");
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        const user=await User.findById(decodedToken?._id);
        if(!user)
        {
            throw new ApiError(401,"INVALID REFRESH TOKEN");
        }
        if(incomingRefreshToken!==user?.refreshToken)
        {   
            throw new ApiError(401,"REFRESH TOKEN EXPIRED OR USED");
        }
    
        const {accessToken,newrefreshToken}=await generateAccessAndRefreshTokens(user._id);
        const options={
            httpOnly:true,          
            secure:true ,            //Only server can modify cookie
            sameSite: 'Strict'
        }
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken:newrefreshToken
                },
                "ACCESS TOKEN REFRESHED SUCCESSFULLY"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "INVALID REFRESH TOKEN");
    }
});

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const user=await User.findById(req.user?._id);
    const {oldPassword,newPassword}=req.body;
    
    const isPasswordValid=await user.isPasswordCorrect(oldPassword);
    if(!isPasswordValid)
    {
        throw new ApiError(400,"INVALID OLD PASSWORD");
    }   

    user.password=newPassword;
    await user.save({validateBeforeSave:false});

    return res.status(200)
    .json(new ApiResponse(200,{},"Password Changes Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json(new ApiResponse(401, null, "User not authenticated"));
    }
    return res.status(200).json(new ApiResponse(200, req.user, "User Fetched Successfully"));
});

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body;
    if(!(fullname && email))
    {
        throw new ApiError(400,"ALL fieds are required");
    }
    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken");
    return res.status(200).json(new ApiResponse(200,user,"Account details updated Successfully"));
});

const updateAvatar =asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Required for Update");
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    if(!avatar)
    {
        throw new ApiError(400,"Error while uploading on Avatar");
    }

    const user=await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password");
    return res.status(200).json(new ApiResponse(200,user,"Avatar updated Successfully"));
});

const updatecoverImage =asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage File is Required for Update");
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage)
    {
        throw new ApiError(400,"Error while uploading on CoverImage");
    }

    const user=await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password");
    return res.status(200).json(new ApiResponse(200,user,"Coverimage updated Successfully"));
});

const getUserChannelProfile =asyncHandler(async(req,res)=>{
    const {username}=req.params;
    if(!username?.trim())
    {
        throw new ApiError(400,"User does not exist");
    }

    const channel=await User.aggregate([
        {
            $match:{
                username
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false,
                    }
                }
            }
        },
        {
            $project:{
                createdAt:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
            } 
        }
    ]);

    if(!channel?.length)
    {
        throw new ApiError(404,"Channel does not exists");
    }
    return res.status(200).json(new ApiResponse(200,channel[0],"User Channel fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",  
                as: "watchHistory",
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
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
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
                    }
                ]
            }
        }
    ]);

    if (user.length === 0) {
        return res.status(404).json(new ApiResponse(404, [], "NO WATCH HISTORY FOUND"));
    }

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "WATCH HISTORY FETCHED SUCCESSFULLY"));
});

export {getWatchHistory,getUserChannelProfile,registerUser,loginUser,logoutUser,refreshAccessToken,updatecoverImage,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateAvatar};