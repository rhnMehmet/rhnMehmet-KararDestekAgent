const agentService = require("../services/agentService");

exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (!message) {
      return res.status(400).json({ message: "message zorunludur." });
    }

    const response = await agentService.createAgentReply({ message, history });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      message: "Agent yaniti olusturulamadi.",
      error: error.message,
    });
  }
};
