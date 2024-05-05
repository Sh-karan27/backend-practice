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
    throw new ApiError(500, "Failed to upload tweet, please try again");
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
        foreignField: "tweet",
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
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);

  if (!userTweets) {
    throw new ApiError(500, "something went wrong while fetching twweets");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "user tweets fetched"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  //get that tweet id and a content that should be updated
  //check if tweet id is correct or not or empty or now
  //check if content is same or not
  //find by id and upate the content
  //res

  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(404, "Please enter valid tweetId");
  }

  if (!content) {
    throw new ApiError(404, "Please enter content");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "could not find the tweet");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      404,
      "you are not the  owner of this tweet you cant edit it "
    );
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedTweet) {
    throw new ApiError(500, "failed to update tweet try again");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  //get the id of the tweet you wanna delete
  //check the id
  //match the owner and user id
  //findByIdandDelete
  //res

  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(404, "Enter valid tweetId");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Could not find tweet or tweet doesnt exist");
  }

  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      404,
      "You can delete this tweet bcoz you are not  the owner"
    );
  }

  const deleteTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!deleteTweet) {
    throw new ApiError(500, "Failted to delete tweet please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteTweet, "tweet was deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
