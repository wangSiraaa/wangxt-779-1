import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuthorizationCertificate extends Document {
  _id: Types.ObjectId;
  cooperativeId: Types.ObjectId;
  plotBoundaryId: Types.ObjectId;
  inspectionReportId: Types.ObjectId;
  certificateNumber: string;
  variety: string;
  batchNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedAt?: Date;
  approvedBy?: string;
  rejectReason?: string;
  validFrom: Date;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuthorizationCertificateSchema: Schema = new Schema({
  cooperativeId: { type: Schema.Types.ObjectId, ref: 'Cooperative', required: true, index: true },
  plotBoundaryId: { type: Schema.Types.ObjectId, ref: 'PlotBoundary', required: true },
  inspectionReportId: { type: Schema.Types.ObjectId, ref: 'InspectionReport', required: true },
  certificateNumber: { type: String, required: true, unique: true },
  variety: { type: String, required: true },
  batchNumber: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  approvedAt: { type: Date },
  approvedBy: { type: String },
  rejectReason: { type: String },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true }
}, {
  timestamps: true
});

AuthorizationCertificateSchema.index({ cooperativeId: 1, batchNumber: 1 }, { unique: true });

export default mongoose.model<IAuthorizationCertificate>('AuthorizationCertificate', AuthorizationCertificateSchema);
