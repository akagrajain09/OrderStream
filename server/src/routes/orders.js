const express = require('express');
const Order = require('../models/Order');

const router = express.Router();

// ─── GET /api/orders ───────────────────────────────────────────────────────────
// Returns all orders sorted by most recently updated.
router.get('/', async (_req, res) => {
  try {
    const orders = await Order.find().sort({ updated_at: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/orders/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/orders ──────────────────────────────────────────────────────────
// Creates a new order. The Change Stream will automatically notify clients.
router.post('/', async (req, res) => {
  try {
    const { customer_name, product_name, status } = req.body;
    const order = await Order.create({ customer_name, product_name, status });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/orders/:id ─────────────────────────────────────────────────────
// Updates an order's fields (typically the status). Triggers Change Stream update event.
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['customer_name', 'product_name', 'status'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    updates.updated_at = new Date();

    const order = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/orders/:id ────────────────────────────────────────────────────
// Deletes an order. Triggers Change Stream delete event.
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
