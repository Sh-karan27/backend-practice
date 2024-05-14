import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Please entervlid video id");
  }

  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res.status(200).json(200, { isLiked: false });
  }

  const likedVideo = await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (!likedVideo) {
    throw new ApiError(500, "Fialed to like video, try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { likedVideo, isLiked: true }, "Video liked"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(404, "Enter valid tweet id ");
  }

  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  const likedTweet = await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (!likedTweet) {
    throw new ApiError(404, "failed to like, try again ");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { likedTweet, isLiked: true }, "tweet liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const likedVides = await Like.aggregate([
    {
      $match: {
        likedBy: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    { $unwind: "$likedVideos" },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideos: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, likedVides, "liked videos fetched"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
