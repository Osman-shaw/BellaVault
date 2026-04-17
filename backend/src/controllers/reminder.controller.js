const { getThirtyDayReminders } = require("../services/reminder.service");

async function listThirtyDayReminders(req, res, next) {
  try {
    const data = await getThirtyDayReminders(req.tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { listThirtyDayReminders };
