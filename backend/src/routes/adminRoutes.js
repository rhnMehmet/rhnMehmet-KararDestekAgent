const router = require("express").Router();

const userController = require("../controllers/userController");
const playerController = require("../controllers/playerController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/users", requireAuth, requireAdmin, userController.listUsersForAdmin);
router.put(
  "/players/:playerId",
  requireAuth,
  requireAdmin,
  playerController.updatePlayerDetails
);

module.exports = router;
