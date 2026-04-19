const router = require("express").Router();

const userController = require("../controllers/userController");
const { requireAuth, requireSelfOrAdmin } = require("../middleware/auth");

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/logout", requireAuth, userController.logout);

router.get("/:id", requireAuth, requireSelfOrAdmin, userController.getProfile);
router.get(
  "/:id/comments",
  requireAuth,
  requireSelfOrAdmin,
  userController.listUserComments
);
router.put("/:id", requireAuth, requireSelfOrAdmin, userController.updateProfile);
router.put(
  "/:id/password",
  requireAuth,
  requireSelfOrAdmin,
  userController.changePassword
);
router.delete(
  "/:id",
  requireAuth,
  requireSelfOrAdmin,
  userController.deleteAccount
);

router.post(
  "/:id/favorites/players",
  requireAuth,
  requireSelfOrAdmin,
  userController.addFavoritePlayer
);
router.delete(
  "/:id/favorites/players/:playerId",
  requireAuth,
  requireSelfOrAdmin,
  userController.removeFavoritePlayer
);
router.post(
  "/:id/favorites/teams",
  requireAuth,
  requireSelfOrAdmin,
  userController.addFavoriteTeam
);
router.delete(
  "/:id/favorites/teams/:teamId",
  requireAuth,
  requireSelfOrAdmin,
  userController.removeFavoriteTeam
);
router.put(
  "/:id/notifications",
  requireAuth,
  requireSelfOrAdmin,
  userController.updateNotificationPreferences
);

module.exports = router;
