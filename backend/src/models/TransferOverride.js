const mongoose = require("mongoose");

const transferOverrideSchema = new mongoose.Schema(
  {
    transferId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TransferOverride", transferOverrideSchema);
