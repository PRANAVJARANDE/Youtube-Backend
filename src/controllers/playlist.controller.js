import mongoose from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body    
    if(!name){
        throw new ApiError(400,"Name of playlist is Required");
    }
    if(!description){
        throw new ApiError(400,"Desciption of playlist is Required");
    }

    const playlist=await Playlist.create({
        name,
        description,
        owner:req.user?._id,
        videos:[]
    });
    if(!playlist)
    {
        throw new ApiError(500,"Something went wrong while creating playlist");
    }
    return res.status(200).json(new ApiResponse(200,playlist,"Playlist created Successfully"));

});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    const userPlaylists=await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId),
            }
        }
    ]);
    if(userPlaylists.length===0)
    {
        return res.status(200).json(new ApiResponse(200,[],"No playlist of current User"));
    }
    return res.status(200).json(new ApiResponse(200,userPlaylists,"User Playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    const playlist=await Playlist.findById(playlistId);
    if(!playlist)
    {
        throw new ApiError(404,"Playlist does not exists");
    }
    return res.status(200).json(new ApiResponse(200,playlist,"Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;
    const result=await Playlist.findByIdAndUpdate(
        playlistId,
        {$addToSet:{videos:videoId}},
        {new:true}
    );
    if(!result)
    {
        throw new ApiError(400,"Playlist does not exists or something went Wrong");
    }
    return res.status(200).json(new ApiResponse(200,result,"Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const result=await Playlist.findByIdAndUpdate(
        playlistId,
        {$pull:{videos:videoId}},
        {new:true}
    );
    if(!result)
    {
        throw new ApiError(400,"Playlist does not exists or something went Wrong");
    }
    return res.status(200).json(new ApiResponse(200,result,"Video removed from playlist"));

});

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const result=await Playlist.findByIdAndDelete(playlistId);
    if(!result)
    {
        throw new ApiError(400,"Playlist deos not exists");
    }
    return res.status(200).json(new ApiResponse(200,result,"Playlist Deleted Successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    if(!name && !description)
    {
        throw new ApiError(400,"Update imformation missing : Name and description");
    }
    let upd={};
    if(name)upd.name=name;
    if(description)upd.description=description;
    const result=await Playlist.findByIdAndUpdate(playlistId,upd,{new:true});
    if(!result)
    {
        throw new ApiError(400,"Something went wrong or playlist does not exists");
    }
    return res.status(200).json(new ApiResponse(200,result,"Playlist Updated Successfully"));
});

export {createPlaylist,getUserPlaylists,getPlaylistById,addVideoToPlaylist,removeVideoFromPlaylist,deletePlaylist,updatePlaylist}