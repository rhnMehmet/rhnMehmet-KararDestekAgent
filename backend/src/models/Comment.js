const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["player", "team"],
      required: true,
      index: true,
    },
    targetId: {
      type: Number,
      required: true,
      index: true,
    },
    playerId: {
      type: Number,
      index: true,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.pre("validate", function syncLegacyFields() {
  if (this.targetType === "player") {
    this.playerId = this.targetId;
  }

  if (!this.targetType && this.playerId) {
    this.targetType = "player";
    this.targetId = this.playerId;
  }
});

module.exports = mongoose.model("Comment", commentSchema);
