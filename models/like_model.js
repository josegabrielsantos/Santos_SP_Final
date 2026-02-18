import mongoose, { mongo } from "mongoose";

const likeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    targetType: {
        type: String,
        required: true,
        enum: ['Post', 'Comment'],
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetType',
        required: true,
    }
}, {timestamps: true});

const Like = mongoose.model("Like", likesSchema);

export default Like;