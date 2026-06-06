import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPatrolRecord extends Document {
  _id: Types.ObjectId;
  cooperativeId: Types.ObjectId;
  plotBoundaryId?: Types.ObjectId;
  inspectorName: string;
  patrolDate: Date;
  result: 'normal' | 'abnormal' | 'warning';
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
  inspectorName: { type: String, required: true },
  patrolDate: { type: Date, required: true },
  result: { type: String, enum: ['normal', 'abnormal', 'warning'], required: true },
  description: { type: String, required: true },
  findings: [{ type: String }],
  correctiveActions: { type: String },
  nextPatrolDate: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model<IPatrolRecord>('PatrolRecord', PatrolRecordSchema);
