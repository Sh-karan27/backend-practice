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
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",//store all the userId = subscriber in the document whos channel feild is = channelId *read subscription model carefully
        pipeline: [
          {
            // getting those user which subscribed me, getting their id after that  im looking up in other document's(subscription's)channel if its contains these ids
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribedToSubscriber",
            },
          },
          {
            $addFields: {
              subscribedToSubscriber: {
                $cond: {
                  if: {
                    $in: [channelId, "$subscribedToSubscriber.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
              subscribersCount: {
                $size: "$subscribedToSubscriber",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriber",
    },
    {
      $project: {
        _id: 0,
        subscriber: {
          _id: 1,
          username: 1,
          fullName: 1,
          "avatar.url": 1,
          subscribedToSubscriber: 1,
          subscribersCount: 1,
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, subscriber, "subscribers fetched successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
