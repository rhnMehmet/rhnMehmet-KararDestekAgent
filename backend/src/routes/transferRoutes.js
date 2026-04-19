const router = require("express").Router();

const transferController = require("../controllers/transferController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/", transferController.listTransfers);
router.put(
  "/:transferId",
  requireAuth,
  requireAdmin,
  transferController.updateTransfer
);

module.exports = router;
