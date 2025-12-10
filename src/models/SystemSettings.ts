import mongoose, { Schema, Document } from "mongoose";

interface ISystemSettings extends Document {
  supportEmail: string;
  supportPhone: string;
  website: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  supportEmail: {
    type: String,
    required: [true, "Support email is required"],
    trim: true,
    lowercase: true,
  },
  supportPhone: {
    type: String,
    required: [true, "Support phone is required"],
    trim: true,
  },
  website: {
    type: String,
    required: [true, "Website is required"],
    trim: true,
  },
  address: {
    type: String,
    required: [true, "Address is required"],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
SystemSettingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for performance
SystemSettingsSchema.index({ supportEmail: 1 });

const SystemSettings =
  mongoose.models.SystemSettings ||
  mongoose.model<ISystemSettings>("SystemSettings", SystemSettingsSchema);

export default SystemSettings;
