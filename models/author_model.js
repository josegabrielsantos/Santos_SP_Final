import mongoose from "mongoose";

const authorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User collection
    },
    firstName: {
        type: String, // Name for authors not in the database
        trim: true,
    },
    lastName: {
        type: String, // Name for authors not in the database
        trim: true,
    },
    middleName: {
        type: String, // Name for authors not in the database
        trim: true,
    },
    
}, {timestamps: true});

authorSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`;
});


const Author = mongoose.model("Author", authorSchema);

export default Author;