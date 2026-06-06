import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILabelUsage extends Document {
  _id: Types.ObjectId;
  cooperativeId: Types.ObjectId;
  certificateId: Types.ObjectId;
  batchNumber: string;
  variety: string;
  quantity: number;
  labelType: string;
  useDate: Date;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LabelUsageSchema: Schema = new Schema({
  cooperativeId: { type: Schema.Types.ObjectId, ref: 'Cooperative', required: true, index: true },
  certificateId: { type: Schema.Types.ObjectId, ref: 'AuthorizationCertificate', required: true },
  batchNumber: { type: String, required: true },
  variety: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  labelType: { type: String, required: true },
  useDate: { type: Date, required: true },
  remark: { type: String }
}, {
  timestamps: true
});

export default mongoose.model<ILabelUsage>('LabelUsage', LabelUsageSchema);
