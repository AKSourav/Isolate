import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (callback: () => void): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || `mongodb+srv://anupam:anupam@aks.67ujxb7.mongodb.net/k8s?retryWrites=true&w=majority&appName=AKS`;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    callback();
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;
