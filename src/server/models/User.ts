import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: 'User' },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// Memory fallback store for local development or when MongoDB is not running
export interface MemoryUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export const memoryUsers = new Map<string, MemoryUser>();
