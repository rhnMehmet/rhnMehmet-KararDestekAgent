const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const Comment = require("../models/Comment");
const {
  isDatabaseAvailable,
  buildDatabaseUnavailablePayload,
} = require("../utils/database");

const JWT_SECRET = process.env.JWT_SECRET || "transfera-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

function sanitizeUser(user) {
  const source = typeof user?.toObject === "function" ? user.toObject() : user;
  const resolvedId = source?.id || source?._id || null;

  return {
    id: resolvedId ? resolvedId.toString() : null,
    name: source?.name,
    surname: source?.surname,
    email: source?.email,
    role: source?.role,
    favorites: {
      players: Array.isArray(source?.favorites?.players)
        ? source.favorites.players
        : [],
      teams: Array.isArray(source?.favorites?.teams)
        ? source.favorites.teams
        : [],
    },
    notificationPreferences: {
      transferUpdates: source?.notificationPreferences?.transferUpdates ?? true,
      matchAlerts: source?.notificationPreferences?.matchAlerts ?? true,
      newsletter: source?.notificationPreferences?.newsletter ?? false,
    },
    createdAt: source?.createdAt || null,
    updatedAt: source?.updatedAt || null,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      jwtid: crypto.randomUUID(),
    }
  );
}

function buildFallbackProfile(req) {
  const email = req.user?.email || req.auth?.email || "";
  const fallbackName = email ? email.split("@")[0] : "Kullanıcı";

  return {
    id: req.params.id || req.user?.id || req.auth?.id || null,
    name: fallbackName,
    surname: "",
    email,
    role: req.user?.role || req.auth?.role || "user",
    favorites: {
      players: [],
      teams: [],
    },
    notificationPreferences: {
      transferUpdates: false,
      matchAlerts: false,
      newsletter: false,
    },
    createdAt: null,
    updatedAt: null,
    degradedMode: true,
  };
}

function sendDatabaseUnavailable(res, message) {
  return res.status(503).json(buildDatabaseUnavailablePayload(message));
}

exports.register = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Kayıt işlemi için veritabanı bağlantısı gerekli."
      );
    }

    const { name, surname, email, password } = req.body;

    if (!name || !surname || !email || !password) {
      return res.status(400).json({
        message: "Ad, soyad, e-posta ve şifre zorunludur.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "Bu e-posta adresi ile daha önce kayıt olunmuş.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      surname: String(surname).trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(user);

    res.status(201).json({
      message: "Kullanıcı kaydı başarılı.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Kullanıcı kaydı sırasında hata oluştu.",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Giriş işlemi için veritabanı bağlantısı gerekli."
      );
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "E-posta ve şifre zorunludur.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "E-posta veya şifre hatalı.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "E-posta veya şifre hatalı.",
      });
    }

    const token = createToken(user);

    res.json({
      message: "Giriş başarılı.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Giriş sırasında hata oluştu.",
      error: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Çıkış işlemi için veritabanı bağlantısı gerekli."
      );
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(400).json({ message: "Bearer token gerekli." });
    }

    const expiresAt = req.auth && req.auth.exp ? new Date(req.auth.exp * 1000) : null;
    await TokenBlacklist.create({ token, expiresAt });

    res.json({ message: "Oturum sonlandırıldı." });
  } catch (error) {
    res.status(500).json({
      message: "Çıkış yapılırken hata oluştu.",
      error: error.message,
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.json({
        user: buildFallbackProfile(req),
        degradedMode: true,
        message: "Veritabanı bağlantısı yok. Sınırlı profil bilgisi gösteriliyor.",
      });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({
      message: "Profil bilgileri alınamadı.",
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Profil güncellemek için veritabanı bağlantısı gerekli."
      );
    }

    const { name, surname, email } = req.body;
    const updates = {};

    if (name) {
      updates.name = String(name).trim();
    }

    if (surname) {
      updates.surname = String(surname).trim();
    }

    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const duplicateUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.params.id },
      });

      if (duplicateUser) {
        return res.status(409).json({
          message: "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.",
        });
      }

      updates.email = normalizedEmail;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.json({
      message: "Profil güncellendi.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Profil güncellenemedi.",
      error: error.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Şifre güncellemek için veritabanı bağlantısı gerekli."
      );
    }

    const { currentPassword, newPassword } = req.body;
    const isAdminAction = req.user.role === "admin";

    if (!newPassword) {
      return res.status(400).json({
        message: "Yeni şifre zorunludur.",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    if (!isAdminAction) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Mevcut şifre zorunludur.",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          message: "Mevcut şifre doğrulanamadı.",
        });
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Şifre başarıyla güncellendi." });
  } catch (error) {
    res.status(500).json({
      message: "Şifre güncellenemedi.",
      error: error.message,
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Hesap silmek için veritabanı bağlantısı gerekli."
      );
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.json({ message: "Hesap kalici olarak silindi." });
  } catch (error) {
    res.status(500).json({
      message: "Hesap silinemedi.",
      error: error.message,
    });
  }
};

exports.addFavoritePlayer = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Favori oyuncu eklemek için veritabanı bağlantısı gerekli."
      );
    }

    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).json({ message: "playerId zorunludur." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const parsedPlayerId = Number(playerId);
    if (user.favorites.players.includes(parsedPlayerId)) {
      return res.status(409).json({
        message: "Oyuncu zaten favorilere eklenmiş.",
      });
    }

    user.favorites.players.push(parsedPlayerId);
    await user.save();

    res.status(201).json({
      message: "Favori oyuncu eklendi.",
      favorites: user.favorites,
    });
  } catch (error) {
    res.status(500).json({
      message: "Favori oyuncu eklenemedi.",
      error: error.message,
    });
  }
};

exports.removeFavoritePlayer = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Favori oyuncu kaldırmak için veritabanı bağlantısı gerekli."
      );
    }

    const playerId = Number(req.params.playerId);
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    user.favorites.players = user.favorites.players.filter((id) => id !== playerId);
    await user.save();

    res.json({
      message: "Favori oyuncu silindi.",
      favorites: user.favorites,
    });
  } catch (error) {
    res.status(500).json({
      message: "Favori oyuncu silinemedi.",
      error: error.message,
    });
  }
};

exports.addFavoriteTeam = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Favori takım eklemek için veritabanı bağlantısı gerekli."
      );
    }

    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ message: "teamId zorunludur." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const parsedTeamId = Number(teamId);
    if (user.favorites.teams.includes(parsedTeamId)) {
      return res.status(409).json({
        message: "Takım zaten favorilere eklenmiş.",
      });
    }

    user.favorites.teams.push(parsedTeamId);
    await user.save();

    res.status(201).json({
      message: "Favori takım eklendi.",
      favorites: user.favorites,
    });
  } catch (error) {
    res.status(500).json({
      message: "Favori takım eklenemedi.",
      error: error.message,
    });
  }
};

exports.removeFavoriteTeam = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Favori takım kaldırmak için veritabanı bağlantısı gerekli."
      );
    }

    const teamId = Number(req.params.teamId);
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    user.favorites.teams = user.favorites.teams.filter((id) => id !== teamId);
    await user.save();

    res.json({
      message: "Favori takım silindi.",
      favorites: user.favorites,
    });
  } catch (error) {
    res.status(500).json({
      message: "Favori takım silinemedi.",
      error: error.message,
    });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return sendDatabaseUnavailable(
        res,
        "Bildirim tercihlerini güncellemek için veritabanı bağlantısı gerekli."
      );
    }

    const { transferUpdates, matchAlerts, newsletter } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    if (typeof transferUpdates === "boolean") {
      user.notificationPreferences.transferUpdates = transferUpdates;
    }

    if (typeof matchAlerts === "boolean") {
      user.notificationPreferences.matchAlerts = matchAlerts;
    }

    if (typeof newsletter === "boolean") {
      user.notificationPreferences.newsletter = newsletter;
    }

    await user.save();

    res.json({
      message: "Bildirim tercihleri güncellendi.",
      notificationPreferences: user.notificationPreferences,
    });
  } catch (error) {
    res.status(500).json({
      message: "Bildirim tercihleri güncellenemedi.",
      error: error.message,
    });
  }
};

exports.listUserComments = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.json({
        data: [],
        total: 0,
        degradedMode: true,
      });
    }

    const comments = await Comment.find({ user: req.params.id })
      .populate("user", "name surname email")
      .sort({ createdAt: -1 });

    res.json({
      data: comments,
      total: comments.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Kullanıcı yorumları alınamadı.",
      error: error.message,
    });
  }
};

exports.listUsersForAdmin = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      return res.json({
        data: [],
        summary: {
          totalUsers: 0,
          totalComments: 0,
          totalAdmins: 0,
        },
        degradedMode: true,
      });
    }

    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const comments = await Comment.find({
      user: { $in: users.map((user) => user._id) },
    })
      .populate("user", "name surname email role")
      .sort({ createdAt: -1 })
      .lean();

    const commentsByUserId = comments.reduce((accumulator, comment) => {
      const userId = comment.user?._id?.toString() || comment.user?.toString();
      if (!userId) {
        return accumulator;
      }

      if (!accumulator[userId]) {
        accumulator[userId] = [];
      }

      accumulator[userId].push(comment);
      return accumulator;
    }, {});

    const data = users.map((user) => {
      const userId = user._id.toString();

      return {
        ...sanitizeUser(user),
        comments: commentsByUserId[userId] || [],
        stats: {
          commentCount: (commentsByUserId[userId] || []).length,
          favoritePlayers: user.favorites?.players?.length || 0,
          favoriteTeams: user.favorites?.teams?.length || 0,
        },
      };
    });

    
    res.json({
      data,
      summary: {
        totalUsers: data.length,
        totalComments: comments.length,
        totalAdmins: data.filter((user) => user.role === "admin").length,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Admin kullanıcı listesi alınamadı.",
      error: error.message,
    });
  }
};
