'use strict';

const Cost = require('../../models/Cost.model');
const Report = require('../../models/Report.model');
const { CATEGORIES } = require('../../lib/categories');

function isPastMonth(year, month) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year < currentYear || (year === currentYear && month < currentMonth);
}

function buildCostsByCategory(costDocs) {
  return CATEGORIES.map((category) => {
    const itemsInCategory = costDocs
      .filter((cost) => cost.category === category)
      .map((cost) => ({
        sum: cost.sum,
        description: cost.description,
        day: cost.created_at.getDate(),
      }));
    return { [category]: itemsInCategory };
  });
}

/* Computed Design Pattern: a month that has already ended can never change
   again (the server refuses to backdate costs into the past), so its
   report is computed once and persisted in the "reports" collection.
   Later requests for that same month are served straight from the cache
   instead of re-aggregating the costs collection. Reports for the current
   or a future month are always computed fresh, since new costs can still
   arrive for them. */
async function getMonthlyReport(userid, year, month) {
  if (isPastMonth(year, month)) {
    const cached = await Report.findOne({ userid, year, month }).lean();
    if (cached) {
      return { userid, year, month, costs: cached.costs };
    }
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const costDocs = await Cost.find({
    userid,
    created_at: { $gte: start, $lt: end },
  }).lean();

  const costs = buildCostsByCategory(costDocs);

  if (isPastMonth(year, month)) {
    await Report.findOneAndUpdate(
      { userid, year, month },
      { userid, year, month, costs },
      { upsert: true },
    );
  }

  return { userid, year, month, costs };
}

module.exports = { getMonthlyReport, isPastMonth };
