const Entity = require("../model/entity.model");
const PartnerLedger = require("../model/partnerLedger.model");

async function listEntities(_req, res, next) {
  try {
    const data = await Entity.find({}).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createEntity(req, res, next) {
  try {
    const entity = await Entity.create(req.body);
    res.status(201).json(entity);
  } catch (error) {
    next(error);
  }
}

async function updateEntity(req, res, next) {
  try {
    const entity = await Entity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!entity) {
      return res.status(404).json({ message: "Entity not found" });
    }

    return res.json(entity);
  } catch (error) {
    return next(error);
  }
}

async function deleteEntity(req, res, next) {
  try {
    const entity = await Entity.findByIdAndDelete(req.params.id);
    if (!entity) {
      return res.status(404).json({ message: "Entity not found" });
    }
    await PartnerLedger.deleteMany({ entityId: entity._id });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listEntities, createEntity, updateEntity, deleteEntity };
