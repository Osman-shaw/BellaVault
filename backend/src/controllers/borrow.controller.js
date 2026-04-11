const Borrow = require("../model/borrow.model");

async function listBorrows(req, res, next) {
  try {
    const data = await Borrow.find({ tenantId: req.tenantId }).sort({ borrowedAt: -1, createdAt: -1 });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createBorrow(req, res, next) {
  try {
    const { borrowerName, borrowerContact, borrowedAt, principalAmount, amountPaid } = req.body;
    const borrow = await Borrow.create({
      tenantId: req.tenantId,
      borrowerName,
      borrowerContact,
      borrowedAt,
      principalAmount,
      amountPaid: amountPaid ?? 0,
    });
    res.status(201).json(borrow);
  } catch (error) {
    next(error);
  }
}

async function updateBorrow(req, res, next) {
  try {
    const existing = await Borrow.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) {
      return res.status(404).json({ message: "Borrow record not found" });
    }

    const body = { ...req.body };
    const additionalPayment = body.additionalPayment;
    delete body.additionalPayment;

    const patch = {};
    const allowed = ["borrowerName", "borrowerContact", "borrowedAt", "principalAmount"];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        patch[key] = body[key];
      }
    }

    if (additionalPayment !== undefined && additionalPayment !== null) {
      patch.amountPaid = Number(existing.amountPaid) + Number(additionalPayment);
    } else if (body.amountPaid !== undefined) {
      patch.amountPaid = body.amountPaid;
    }

    const updated = await Borrow.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: patch },
      { new: true, runValidators: true }
    );

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteBorrow(req, res, next) {
  try {
    const borrow = await Borrow.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!borrow) {
      return res.status(404).json({ message: "Borrow record not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listBorrows, createBorrow, updateBorrow, deleteBorrow };
