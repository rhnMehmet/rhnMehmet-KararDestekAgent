const router = require("express").Router();

const aiController = require("../controllers/aiController");

router.post("/transfer-predictions", aiController.createTransferPrediction);
router.get("/team-report/:teamId", aiController.getTeamAiReport);
router.get("/player-value/:playerId", aiController.getPlayerValuePrediction);
router.get("/transfer-trends", aiController.getTransferTrends);

module.exports = router;
