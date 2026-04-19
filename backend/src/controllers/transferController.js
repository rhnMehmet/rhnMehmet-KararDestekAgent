const footballService = require("../services/footballService");

exports.listTransfers = async (req, res) => {
  try {
    const result = await footballService.getTransfers(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Transferler listelenemedi.",
      error: error.message,
    });
  }
};

exports.updateTransfer = async (req, res) => {
  try {
    const result = await footballService.buildManualTransferUpdate(
      req.params.transferId,
      req.body,
      req.user
    );
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      message: "Transfer g?ncellenemedi.",
      error: error.message,
    });
  }
};
