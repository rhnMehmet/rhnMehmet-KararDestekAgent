const router = require("express").Router();

const teamController = require("../controllers/teamController");

router.get("/", teamController.listTeams);
router.get("/league-meta", teamController.getLeagueMeta);
router.get("/:teamId", teamController.getTeamDetails);
router.get("/:teamId/squad", teamController.getTeamSquad);

module.exports = router;
