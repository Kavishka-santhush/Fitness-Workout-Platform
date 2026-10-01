const wearableService = require('../services/wearable.service');
const { ok, created } = require('../utils/response.util');
const fs = require('fs');

const record = async (req, res) => created(res, await wearableService.record(req.user.id, req.body), 'Data point recorded');
const sync = async (req, res) => created(res, await wearableService.syncBatch(req.user.id, req.body), 'Sync complete');
const importCsv = async (req, res) => {
  const csv = req.file ? fs.readFileSync(req.file.path, 'utf8') : req.body.csv;
  created(res, await wearableService.importCsv(req.user.id, { source: req.body.source || req.query.source, csv }), 'CSV imported');
};
const daily = async (req, res) => ok(res, await wearableService.dailySummary(req.user.id, req.query.date));
const series = async (req, res) => ok(res, await wearableService.series(req.user.id, req.query));
const sources = async (req, res) => ok(res, await wearableService.sources(req.user.id));
const recent = async (req, res) => ok(res, await wearableService.recent(req.user.id, req.query));
const clear = async (req, res) => ok(res, await wearableService.clearSource(req.user.id, req.params.source), 'Source data cleared');

module.exports = { record, sync, importCsv, daily, series, sources, recent, clear };
