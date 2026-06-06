import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICoordinate {
  lat: number;
  lng: number;
}

export interface IPlotBoundary extends Document {
  _id: Types.ObjectId;
  cooperativeId: Types.ObjectId;
  name: string;
  coordinates: ICoordinate[];
  area: number;
  variety: string;
  isWithinProtectionZone: boolean;
  validationResult?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlotBoundarySchema: Schema = new Schema({
  cooperativeId: { type: Schema.Types.ObjectId, ref: 'Cooperative', required: true, index: true },
  name: { type: String, required: true },
  coordinates: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }],
  area: { type: Number, required: true },
  variety: { type: String, required: true },
  isWithinProtectionZone: { type: Boolean, default: false },
  validationResult: { type: String }
}, {
  timestamps: true
});

export default mongoose.model<IPlotBoundary>('PlotBoundary', PlotBoundarySchema);
