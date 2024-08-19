import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the User interface that extends mongoose.Document
export interface IUser extends Document {
    id?: mongoose.Types.ObjectId | string;
    name: string;
    email: string;
    password: string;
    matchPassword(enteredPassword: string): Promise<boolean>;
}

// Create the user schema
const userSchema: Schema<IUser> = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

// Method to check the password
userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save middleware to hash the password before saving
userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Define the User model
const User: Model<IUser> = mongoose.model<IUser>('user', userSchema);

export default User;
