const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema(
  {
    customer_name: {
      type: String,
      required: [true, 'customer_name is required'],
      trim: true,
    },
    product_name: {
      type: String,
      required: [true, 'product_name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'shipped', 'delivered'],
        message: 'status must be pending | shipped | delivered',
      },
      default: 'pending',
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Store the Mongo ObjectId as a plain numeric-like string id for clients
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Always refresh updated_at on save/update
orderSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
