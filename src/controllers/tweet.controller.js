import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content) {
    throw new ApiError(404, "Please enter content for tweet");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(404, "Failed to upload tweet, please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "tweet uploaded successfuly"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  // console.log(userId);

  if (!isValidObjectId(userId)) {
    throw new ApiError(404, "please enter a valid userID");
  }

  const userTweets = await Tweet.aggregate([
    {
      $match: { owner: new mongoose.Types.ObjectId(userId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "userDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweets",
        as: "likeDetails",
        pipeline: [
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        userDetails: {
          $first: "$userDetails",
        },
      },
    },
  ]);

  if (!userTweets) {
    throw new ApiError(404, "something went wrong while fetching twweets");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "user tweets fetched"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
