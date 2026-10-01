const analyticsService = require('../services/analytics.service');
const { ok } = require('../utils/response.util');

/** GET /analytics/me — member dashboard bundle. */
const myDashboard = async (req, res) => ok(res, await analyticsService.userDashboard(req.user.id));

/** GET /analytics/admin — platform-wide metrics (staff only). */
const adminDashboard = async (req, res) => ok(res, await analyticsService.adminDashboard());

/** GET /analytics/wrap?year=2025 — annual "Spotify Wrapped" style recap. */
const wrap = async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
  ok(res, await analyticsService.annualWrap(req.user.id, year));
};

/** GET /analytics/weekly — this-week summary used by the weekly report email. */
const weekly = async (req, res) => ok(res, await analyticsService.weeklyReport(req.user.id));

module.exports = { myDashboard, adminDashboard, wrap, weekly };
