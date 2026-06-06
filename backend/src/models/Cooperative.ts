import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICoordinate {
  lat: number;
  lng: number;
}

export interface ICooperative extends Document {
  _id: Types.ObjectId;
  name: string;
  legalPerson: string;
  phone: string;
  address: string;
  registrationNumber: string;
  isSuspended: boolean;
  suspendReason?: string;
  suspendDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CooperativeSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  legalPerson: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  registrationNumber: { type: String, required: true, unique: true },
  isSuspended: { type: Boolean, default: false },
  suspendReason: { type: String },
  suspendDate: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model<ICooperative>('Cooperative', CooperativeSchema);
