const router = require("express").Router();

const commentController = require("../controllers/commentController");
const { requireAuth } = require("../middleware/auth");

router.get("/", commentController.listAllComments);
router.post("/:targetId/comments", requireAuth, commentController.addComment);
router.get("/:targetId/comments", commentController.listComments);
router.put("/:commentId", requireAuth, commentController.updateComment);
router.delete("/:commentId", requireAuth, commentController.deleteComment);

module.exports = router;
