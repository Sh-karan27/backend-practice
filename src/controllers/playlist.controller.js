import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(404, "name and description required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(500, "failed to create playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!isValidObjectId(userId)) {
    throw new ApiError(404, "Enter valid userId");
  }

  const userPlayList = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        video: "$videos",
        totalVideos: {
          $size: "$videos",
        },
        totalPlaylistViews: {
          $sum: "$videos.views",
        },
      },
    },

    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        videos: 1,
        totalPlaylistViews: 1,
        totalVideos: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!userPlayList) {
    throw new ApiError(500, "Couldn't load user playlist please try again");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, userPlayList, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  //get playlist by id
  //and then in the playlist get playlist videos owner totalViews totalVideos

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(404, "Enter a valid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(500, "could not fetch playlist please try again");
  }

  const playlistVideos = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },

    {
      $lookup: {
        from: "video",
        localField: "videso",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $match: {
        "videos.isPublished": true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: 1,
        totalViews: 1,
        video: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
        },
        owner: {
          user: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { playlist, playlistVideos },
        "playlist fetched successfully"
      )
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  let { playlistId, videoId } = req.params;

  console.log(playlistId);
  console.log(videoId);

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid PlaylistId or videoId");
  }

  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (playlist.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      404,
      "you are not the owner of this playlis you cant add any video"
    );
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(400, "failed to add video to playlist please try again");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Added video to playlist successfully"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
