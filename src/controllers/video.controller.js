import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  // for using Full Text based search u need to create a search index in mongoDB atlas
  // you can include field mapppings in search index eg.title, description, as well
  // Field mappings specify which fields within your documents should be indexed for text search.
  // this helps in seraching only in title, desc providing faster search results
  // here the name of search index is 'search-videos'
  // console.log(req.query);

  const pipeline = [];
  console.log(pipeline);

  // if (query) {
  //   pipeline.push({
  //     $search: {
  //       index: "search-videos",
  //       text: {
  //         query: query,
  //         path: ["title", "description"],
  //       },
  //     },
  //   });
  // } else {
  //   throw new ApiError(404, "please enter a query");
  // }
  // console.log(query);

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(404, "In valid user ID");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }
  console.log(userId);

  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        // [sortBy]: sortType === "asc" ? 1 : -1,
        views: -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
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
      $unwind: "$ownerDetails",
    }
  );
  // console.log(pipeline);

  const videoAggregate = await Video.aggregate(pipeline);
  console.log(videoAggregate);

  if (!videoAggregate) {
    throw new ApiError(500, "failed to aggregate Video, try again ");
  }
  // console.log(videoAggregate);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);
  // console.log(video);

  if (!video) {
    throw new ApiError(500, "failed to get video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  //get  title t and discription from req.body
  //check if  title and discription is empty
  //check if video already exist
  // create local path for video file and thumbnail
  //check if there is local path or not
  // upload to cloudinaary if there is local path
  //  create a video object
  //res

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Title and Description required");
  }

  const existedVideo = await Video.findOne({
    $or: [{ title }, { description }],
  });

  if (existedVideo) {
    throw new ApiError(409, "Video with title and description already exist");
  }

  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Thumbnail  required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, " Video required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail not found");
  }

  if (!videoFile) {
    throw new ApiError(400, "Video file not found");
  }

  const video = await Video.create({
    title,
    description,
    duration: videoFile.duration,
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    owner: req.user?._id,
    isPublished: false,
  });

  const videoUploaded = await Video.findById(video._id);

  if (!videoUploaded) {
    throw new ApiError(500, "Something went wrong publishing video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published Successfuly"));
});

const getVideoById = asyncHandler(async (req, res) => {
  //get video id from req.params
  //check video id
  //find video
  //add owner[subscribers,] likes field and subscriber field  an comment duration created at
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "invalid video Id");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },

    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscriber",
            },
          },
          {
            $addFields: {
              subscriberCount: {
                $size: "$subscriber",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscriber.subscriber"],
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
              "avatar.url": 1,
              subscriberCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        likeCount: { $size: "$likes" },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);
  if (!video) {
    throw new ApiError(500, "failed to fetch video");
  }

  // increment views if video fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  // add this video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  //check if video id is valid or not
  //upload new video give choise to updatethumbnail  delete the old video

  const { title, description } = req.body;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!(title && description)) {
    throw new ApiError(400, "title and description required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found");
  }
  if (video.owner.toString() !== req.user?.id.toString()) {
    throw new ApiError(
      404,
      "you cant edit this video since you are  not the owner"
    );
  }

  //deleting old thubnail and uploading new

  const thumbnailToBeDeleted = video.thumbnail.public_id;
  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, " thumbnail required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(404, "thubnail not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          public_id: thumbnail.public_id,
          url: thumbnail.url,
        },
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Failed to update video details, please try again");
  }

  // if (updatedVideo) {
  //   await deleteOnCloudinary(thumbnailToBeDeleted);
  // }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "video details updated succesfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video.owner.toString() !== req.user?.id.toString()) {
    throw new ApiError(
      404,
      "you cant edit this video since you are  not the owner"
    );
  }

  const videoDelted = await Video.findByIdAndDelete(video?._id);

  if (!videoDelted) {
    throw new ApiError(400, "Failed to delete the video please try again");
  }

  await deleteOnCloudinary(video.thumbnail.public_id);
  await deleteOnCloudinary(video.videoFile.public_id, "video");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "Invalid video ID");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: true,
      },
    },
    { new: true }
  );

  if (!video) {
    throw new ApiError(400, "Failed to publish video please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  togglePublishStatus,
};
