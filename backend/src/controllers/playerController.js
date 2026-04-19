const footballService = require("../services/footballService");

exports.listPlayers = async (req, res) => {
  try {
    const result = await footballService.getPlayers(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Oyuncular listelenemedi.",
      error: error.message,
    });
  }
};

exports.getPlayerDetails = async (req, res) => {
  try {
    const result = await footballService.getPlayerDetails(req.params.playerId, req.query);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Oyuncu detay? al?namad?.",
      error: error.message,
    });
  }
};

exports.getPlayerMarketValue = async (req, res) => {
  try {
    const result = await footballService.getPlayerMarketValue(req.params.playerId, req.query);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Oyuncu piyasa de?eri al?namad?.",
      error: error.message,
    });
  }
};

exports.updatePlayerDetails = async (req, res) => {
  try {
    const result = await footballService.buildManualPlayerUpdate(
      req.params.playerId,
      req.body,
      req.user
    );
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Oyuncu bilgileri g?ncellenemedi.",
      error: error.message,
    });
  }
};
