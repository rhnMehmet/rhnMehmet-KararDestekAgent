const footballService = require("../services/footballService");

exports.listTeams = async (req, res) => {
  try {
    const result = await footballService.getTeams(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Tak?mlar listelenemedi.",
      error: error.message,
    });
  }
};

exports.getLeagueMeta = async (req, res) => {
  try {
    const result = await footballService.getLeagueMeta(req.query.league);
    res.json(result || {});
  } catch (error) {
    res.status(500).json({
      message: "Lig bilgisi al?namad?.",
      error: error.message,
    });
  }
};

exports.getTeamDetails = async (req, res) => {
  try {
    const result = await footballService.getTeamDetails(req.params.teamId, req.query);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Tak?m detay? al?namad?.",
      error: error.message,
    });
  }
};

exports.getTeamSquad = async (req, res) => {
  try {
    const result = await footballService.getTeamSquad(req.params.teamId);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Tak?m kadrosu al?namad?.",
      error: error.message,
    });
  }
};
