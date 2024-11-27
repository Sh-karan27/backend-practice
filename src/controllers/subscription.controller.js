import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  if (!channelId) {
    throw new ApiError(404, "Please enter a  channel Id");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(404, "Please enter a valid channel Id");
  }

  const channelDetails =
    await User.findById(channelId).select("username avatar");

  if (!channelDetails) {
    throw new ApiError(500, "Failed to fetch channel details");
  }

  // console.log(channelDetails);

  const subscribe = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user?._id,
  });

  if (subscribe) {
    await Subscription.deleteOne({
      channel: channelId,
      subscriber: req.user?._id,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subscribed: false, channelDetails },
          "Unsubscribed successfully"
        )
      );
  }

  await Subscription.create({
    channel: channelId,
    subscriber: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscribed: true, channelDetails },
        "subscribed successfully"
      )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  let { channelId } = req.params;
  console.log(channelId);

  channelId = new mongoose.Types.ObjectId(channelId);

  if (!isValidObjectId(channelId)) {
    throw new ApiError(404, "enter valid channel id");
  }

  const subscriber = await Subscription.aggregate([
    {
      $match: {
        channel: channelId,
      },
    },

    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "subscriber",
        as: "subscriber",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              foreignField: "channel",
              localField: "_id",
              as: "subscribedToSubscriber",
            },
          },
          {
            $addFields: {
              subscribedToSubscriber: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribedToSubscriber.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              followedToFollower: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        follower: {
          $arrayElemAt: ["$subscriber", 0],
        },
      },
    },
    {
      $project: {
        _id: 0,
        subscriber: 1,
      },
    },
  ]);

  if (!subscriber) {
    throw new ApiError(500, "Failed to get user subscriber");
  }

  const subscriberList = subscriber.map((currVal) => currVal.subscriber);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscriberCount: subscriberList.length, subscriber },
        "subscribers fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  let { subscriberId } = req.params;

  // console.log(subscriberId);

  subscriberId = new mongoose.Types.ObjectId(subscriberId);

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(404, "Please enter valid Id");
  }
  // console.log(subscriberId);

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: subscriberId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "subscriber",
              as: "subscriberingUs",
            },
          },
          {
            $addFields: {
              followingUs: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscriberingUs.subscribedChannel"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscriberingUs: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscribedChannel: { $arrayElemAt: ["$subscribedChannel", 0] },
      },
    },
    {
      $project: {
        _id: 0,
        subscribedChannel: 1,
      },
    },
  ]);
  if (!subscribedChannels) {
    throw new ApiError(500, "Failed to get UserProfile subscribed channel");
  }

  const channelSubscribedTo = subscribedChannels.map(
    (currVal) => currVal.subscribedChannels
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscribedToCount: subscribedChannels, channelSubscribedTo },
        "subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
