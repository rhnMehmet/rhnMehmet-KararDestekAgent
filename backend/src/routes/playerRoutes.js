const router = require("express").Router();

const playerController = require("../controllers/playerController");

router.get("/", playerController.listPlayers);
router.get("/:playerId", playerController.getPlayerDetails);
router.get("/:playerId/market-value", playerController.getPlayerMarketValue);

module.exports = router;
