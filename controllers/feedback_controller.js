import SusResponse from '../models/sus_response_model.js';

const submitSus = async (req, res) => {
  try {
    const { responses, comment } = req.body;
    if (!Array.isArray(responses) || responses.length !== 10) {
      return res.status(400).json({ error: 'responses must be an array of 10 numbers.' });
    }
    if (!responses.every((r) => Number.isInteger(r) && r >= 1 && r <= 5)) {
      return res.status(400).json({ error: 'Each response must be an integer 1–5.' });
    }

    // Compute SUS score: odd-indexed questions (0,2,4,6,8): score = r-1; even-indexed (1,3,5,7,9): score = 5-r; sum * 2.5
    let sum = 0;
    responses.forEach((r, i) => {
      sum += i % 2 === 0 ? (r - 1) : (5 - r);
    });
    const susScore = sum * 2.5;

    const susResponse = new SusResponse({
      userId: req.user._id,
      responses,
      susScore,
      comment: comment?.trim() || null,
    });
    await susResponse.save();
    res.status(201).json({ susScore });
  } catch (error) {
    console.log('Error in submitSus:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

const getSusResponses = async (req, res) => {
  try {
    const responses = await SusResponse.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'displayName email');
    const count = responses.length;
    const avgScore = count > 0
      ? responses.reduce((acc, r) => acc + (r.susScore ?? 0), 0) / count
      : 0;
    res.status(200).json({ count, avgScore: Math.round(avgScore * 10) / 10, responses });
  } catch (error) {
    console.log('Error in getSusResponses:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { submitSus, getSusResponses };
