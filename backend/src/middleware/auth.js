const jwt = require("jsonwebtoken");

const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const { resolveUserRole } = require("../utils/localAdmin");
const { isDatabaseAvailable } = require("../utils/database");

const JWT_SECRET = process.env.JWT_SECRET || "transfera-dev-secret";

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Yetkilendirme gerekli.",
      });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isDatabaseAvailable()) {
      req.auth = decoded;
      req.user = {
        id: String(decoded.id),
        role: resolveUserRole(decoded),
        email: decoded.email || "",
      };
      return next();
    }

    const blacklistedToken = await TokenBlacklist.findOne({ token });
    if (blacklistedToken) {
      return res.status(401).json({
        message: "Oturum geçersiz veya sonlandırılmış.",
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: "Kullanıcı bulunamadı.",
      });
    }

    req.auth = decoded;
    req.user = {
      id: user._id.toString(),
      role: resolveUserRole(user),
      email: user.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Geçersiz token.",
      error: error.message,
    });
  }
}

function requireSelfOrAdmin(req, res, next) {
  if (req.user.role === "admin" || req.user.id === req.params.id) {
    return next();
  }

  return res.status(403).json({
    message: "Bu işlem için yetkiniz yok.",
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    message: "Bu işlem sadece yetkili kullanıcılar için açıktır.",
  });
}

module.exports = {
  requireAuth,
  requireSelfOrAdmin,
  requireAdmin,
};
