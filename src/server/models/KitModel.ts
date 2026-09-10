import mongoose, { Schema, Document } from 'mongoose';
import { EnhancedKit } from '../../core/types/kit';
import { CardPracticeState } from '../../core/practice/practiceEngine';

export interface IKitDocument extends Document {
  userId: string;
  kit: EnhancedKit;
  practiceStates: Map<string, CardPracticeState>;
  createdAt: Date;
  updatedAt: Date;
}

const KitSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    kit: { type: Schema.Types.Mixed, required: true },
    practiceStates: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const KitMongoModel = mongoose.models.Kit || mongoose.model<IKitDocument>('Kit', KitSchema);

// In-memory / persistent fallback store when MongoDB is offline
export interface MemoryKit {
  id: string;
  userId: string;
  kit: EnhancedKit;
  practiceStates: Record<string, CardPracticeState>;
  createdAt: string;
  updatedAt: string;
}

export const memoryKits = new Map<string, MemoryKit>();
