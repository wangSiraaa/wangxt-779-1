import mongoose, { Schema, Document } from 'mongoose';

export interface ICoordinate {
  lat: number;
  lng: number;
}

export interface IProtectionZone extends Document {
  name: string;
  code: string;
  variety: string;
  boundary: ICoordinate[];
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProtectionZoneSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  variety: { type: String, required: true },
  boundary: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }],
  description: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.model<IProtectionZone>('ProtectionZone', ProtectionZoneSchema);
