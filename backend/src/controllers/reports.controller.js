const { getReportsOverview } = require("../services/reports.service");

async function overview(req, res, next) {
  try {
    const data = await getReportsOverview(req.tenantId, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { overview };
