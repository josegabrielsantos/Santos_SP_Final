import User from '../models/user_model.js';
import { generateTokenandSetCookie } from '../lib/util/generateToken.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Accepts { credential } (Google ID token from frontend).
 * Creates the user on first visit; logs them in on subsequent visits.
 */
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ googleId });

    if (!user) {
      // First-time login - create user
      user = new User({
        googleId,
        email,
        displayName: name,
        avatar: picture || null,
        lastLogin: new Date(),
      });
      await user.save();
    } else {
      // Returning user - update lastLogin and optionally refresh profile info
      user.lastLogin = new Date();
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    // Issue JWT
    generateTokenandSetCookie(user._id, res);

    res.status(200).json({
      _id: user._id,
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      expertise: user.expertise,
      certifications: user.certifications,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.log('Error in googleAuth controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log('Error in getMe controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    res.cookie('jwt', '', { maxAge: 0 });
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.log('Error in logout:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { googleAuth, getMe, logout };
