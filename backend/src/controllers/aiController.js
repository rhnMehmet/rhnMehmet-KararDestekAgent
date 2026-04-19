const footballService = require("../services/footballService");
const aiService = require("../services/aiService");

exports.createTransferPrediction = async (req, res) => {
  try {
    const {
      playerId,
      currentTeamId,
      contractMonthsRemaining,
      contractEndDate,
      preferredLeague,
      targetTeamId,
    } = req.body || {};

    if (!playerId) {
      return res.status(400).json({ message: "playerId zorunludur." });
    }

    const playerProfile = await footballService.getPlayerDetails(playerId);
    const resolvedCurrentTeamId = currentTeamId || playerProfile.player.team?.id;
    const teams = await footballService.getTeams({
      page: 1,
      limit: 50,
      league: preferredLeague,
      excludeTeamId: resolvedCurrentTeamId,
    });
    const transferMarket = await footballService.getTransfers({
      page: 1,
      limit: 100,
      club: playerProfile.player.team?.name,
      league: preferredLeague,
    });
    const trendReport = aiService.buildTransferTrendReport(transferMarket.data);
    const targetTeamContext =
      targetTeamId && preferredLeague
        ? await footballService.getTeamDetails(targetTeamId, { league: preferredLeague })
        : targetTeamId
        ? await footballService.getTeamDetails(targetTeamId, {})
        : null;

    const prediction = aiService.generateTransferPrediction(
      playerProfile.player,
      teams.data,
      {
        contractMonthsRemaining,
        contractEndDate,
        preferredLeague,
        targetTeamId,
        trendReport,
        targetTeamContext,
      }
    );

    res.status(201).json(prediction);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Transfer tahmini oluşturulamadı.",
      error: error.message,
    });
  }
};

exports.getTeamAiReport = async (req, res) => {
  try {
    const teamDetails = await footballService.getTeamDetails(
      req.params.teamId,
      req.query
    );
    const report = aiService.buildTeamAiReport(
      teamDetails.team,
      teamDetails.squad,
      teamDetails.transferHistory
    );

    res.json(report);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Takım AI raporu oluşturulamadı.",
      error: error.message,
    });
  }
};

exports.getPlayerValuePrediction = async (req, res) => {
  try {
    const playerProfile = await footballService.getPlayerDetails(req.params.playerId);
    const valueProjection = aiService.calculatePlayerValueProjection(
      playerProfile.player
    );

    res.json(valueProjection);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Oyuncu değer tahmini hesaplanamadı.",
      error: error.message,
    });
  }
};

exports.getTransferTrends = async (req, res) => {
  try {
    const transfers = await footballService.getTransfers({
      page: req.query.page || 1,
      limit: req.query.limit || 50,
      league: req.query.league,
    });

    res.json(aiService.buildTransferTrendReport(transfers.data));
  } catch (error) {
    res.status(500).json({
      message: "Transfer trendleri üretilemedi.",
      error: error.message,
    });
  }
};
