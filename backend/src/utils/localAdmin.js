function getConfiguredLocalAdminEmails() {
  return String(process.env.LOCAL_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isLocalAdminEmail(email) {
  if (!email) {
    return false;
  }

  return getConfiguredLocalAdminEmails().includes(String(email).trim().toLowerCase());
}

function resolveUserRole(user) {
  if (isLocalAdminEmail(user?.email)) {
    return "admin";
  }

  return user?.role === "admin" ? "admin" : "user";
}

module.exports = {
  getConfiguredLocalAdminEmails,
  isLocalAdminEmail,
  resolveUserRole,
};
