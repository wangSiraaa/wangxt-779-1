import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInspectionReport extends Document {
  _id: Types.ObjectId;
  cooperativeId: Types.ObjectId;
  plotBoundaryId?: Types.ObjectId;
  reportNumber: string;
  variety: string;
  batchNumber: string;
  reportDate: Date;
  validUntil: Date;
  issuedBy: string;
  fileUrl?: string;
  status: 'valid' | 'expired' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const InspectionReportSchema: Schema = new Schema({
  cooperativeId: { type: Schema.Types.ObjectId, ref: 'Cooperative', required: true, index: true },
  plotBoundaryId: { type: Schema.Types.ObjectId, ref: 'PlotBoundary' },
  reportNumber: { type: String, required: true, unique: true },
  variety: { type: String, required: true },
  batchNumber: { type: String, required: true },
  reportDate: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  issuedBy: { type: String, required: true },
  fileUrl: { type: String },
  status: { type: String, enum: ['valid', 'expired', 'pending'], default: 'pending' }
}, {
  timestamps: true
});

InspectionReportSchema.pre<IInspectionReport>('save', function(next) {
  const now = new Date();
  if (this.validUntil < now) {
    this.status = 'expired';
  } else if (this.status === 'pending') {
    this.status = 'valid';
  }
  next();
});

export default mongoose.model<IInspectionReport>('InspectionReport', InspectionReportSchema);
