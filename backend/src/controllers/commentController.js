const Comment = require("../models/Comment");
const {
  isDatabaseAvailable,
  buildDatabaseUnavailablePayload,
} = require("../utils/database");

function getTargetContext(req) {
  if (req.baseUrl.includes("/api/teams")) {
    return {
      targetType: "team",
      targetId: Number(req.params.teamId || req.params.targetId),
    };
  }

  return {
    targetType: "player",
    targetId: Number(req.params.playerId || req.params.targetId),
  };
}

function validateRating(rating) {
  const parsed = Number(rating);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
}

function emptyCommentResponse(page = 1, limit = 10) {
  return {
    data: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 1,
    },
    degradedMode: true,
  };
}

exports.addComment = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res
        .status(503)
        .json(buildDatabaseUnavailablePayload("Yorum eklemek için veritabanı bağlantısı gerekli."));
    }

    const { text, rating } = req.body;
    const { targetType, targetId } = getTargetContext(req);

    if (!text || !rating) {
      return res.status(400).json({
        message: "Yorum metni ve puan zorunludur.",
      });
    }

    const parsedRating = validateRating(rating);
    if (!parsedRating) {
      return res.status(400).json({
        message: "Puan 1 ile 5 arasında olmalıdır.",
      });
    }

    const comment = await Comment.create({
      targetType,
      targetId,
      playerId: targetType === "player" ? targetId : null,
      user: req.user.id,
      text: String(text).trim(),
      rating: parsedRating,
    });

    const populatedComment = await comment.populate("user", "name surname email");

    res.status(201).json({
      message: "Yorum eklendi.",
      comment: populatedComment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Yorum eklenemedi.",
      error: error.message,
    });
  }
};

exports.listComments = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);

    if (!isDatabaseAvailable()) {
      return res.json(emptyCommentResponse(page, limit));
    }

    const skip = (page - 1) * limit;
    const { targetType, targetId } = getTargetContext(req);
    const filter =
      targetType === "player"
        ? {
            $or: [
              { targetType: "player", targetId },
              { playerId: targetId },
            ],
          }
        : { targetType: "team", targetId };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate("user", "name surname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments(filter),
    ]);

    res.json({
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Yorumlar listelenemedi.",
      error: error.message,
    });
  }
};

exports.listAllComments = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);

    if (!isDatabaseAvailable()) {
      return res.json(emptyCommentResponse(page, limit));
    }

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find({})
        .populate("user", "name surname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({}),
    ]);

    res.json({
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Tüm yorumlar listelenemedi.",
      error: error.message,
    });
  }
};

exports.updateComment = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.status(503).json(
        buildDatabaseUnavailablePayload(
          "Yorum güncellemek için veritabanı bağlantısı gerekli."
        )
      );
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }

    const isOwner = comment.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Bu yorumu güncelleme yetkiniz yok.",
      });
    }

    if (req.body.text) {
      comment.text = String(req.body.text).trim();
    }

    if (req.body.rating) {
      const parsedRating = validateRating(req.body.rating);
      if (!parsedRating) {
        return res.status(400).json({
          message: "Puan 1 ile 5 arasında olmalıdır.",
        });
      }
      comment.rating = parsedRating;
    }

    await comment.save();
    await comment.populate("user", "name surname email");

    res.json({
      message: "Yorum güncellendi.",
      comment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Yorum güncellenemedi.",
      error: error.message,
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.status(503).json(
        buildDatabaseUnavailablePayload("Yorum silmek için veritabanı bağlantısı gerekli.")
      );
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }

    const isOwner = comment.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Bu yorumu silme yetkiniz yok.",
      });
    }

    await comment.deleteOne();

    res.json({ message: "Yorum silindi." });
  } catch (error) {
    res.status(500).json({
      message: "Yorum silinemedi.",
      error: error.message,
    });
  }
};
