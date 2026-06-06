import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPatrolRecord extends Document {
  _id: Types.ObjectId;
  cooperativeId: Types.ObjectId;
  plotBoundaryId?: Types.ObjectId;
  inspectionReportId?: Types.ObjectId;
  inspectorName: string;
  patrolDate: Date;
  result: 'normal' | 'abnormal' | 'warning';
  source: 'manual' | 'report_verification' | 'plot_validation' | 'system_auto';
  sourceDetail?: string;
  description: string;
  findings?: string[];
  correctiveActions?: string;
  nextPatrolDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PatrolRecordSchema: Schema = new Schema({
  cooperativeId: { type: Schema.Types.ObjectId, ref: 'Cooperative', required: true, index: true },
  plotBoundaryId: { type: Schema.Types.ObjectId, ref: 'PlotBoundary' },
  inspectionReportId: { type: Schema.Types.ObjectId, ref: 'InspectionReport' },
  inspectorName: { type: String, required: true },
  patrolDate: { type: Date, required: true },
  result: { type: String, enum: ['normal', 'abnormal', 'warning'], required: true },
  source: {
    type: String,
    enum: ['manual', 'report_verification', 'plot_validation', 'system_auto'],
    default: 'manual'
  },
  sourceDetail: { type: String },
  description: { type: String, required: true },
  findings: [{ type: String }],
  correctiveActions: { type: String },
  nextPatrolDate: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model<IPatrolRecord>('PatrolRecord', PatrolRecordSchema);
