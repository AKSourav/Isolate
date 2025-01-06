import mongoose, {Schema, Document, Model} from 'mongoose';

export interface IConfigs extends Document {
    name: string;
    configText: string;
    createdBy: mongoose.Types.ObjectId;  
    description?: string;  
}

// Create the kubeConfig schema
const kubeConfigSchema: Schema<IConfigs> = new mongoose.Schema(
    {
        name: {type: String, required: true},
        configText: {type: String, required: true},
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        description: { type: String, default:'' },  
    },
    {
        timestamps: true
    }
)

const Kube : Model<IConfigs> = mongoose.model<IConfigs>('kube',kubeConfigSchema);

export default Kube;