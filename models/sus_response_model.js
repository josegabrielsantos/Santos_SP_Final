import mongoose from 'mongoose';

const susResponseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    responses: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) => v.length === 10 && v.every((r) => r >= 1 && r <= 5),
        message: 'responses must be exactly 10 numbers between 1 and 5.',
      },
    },
    // SUS score is computed: alternating (r-1)*25 and (5-r)*25 summed
    susScore: {
      type: Number,
      default: null,
    },
    comment: {
      type: String,
      maxlength: 1000,
      default: null,
    },
  },
  { timestamps: true }
);

const SusResponse = mongoose.model('SusResponse', susResponseSchema);
export default SusResponse;
