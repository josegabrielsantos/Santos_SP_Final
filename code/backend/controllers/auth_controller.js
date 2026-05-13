import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';
import { generateTokenandSetCookie, COOKIE_OPTIONS } from '../lib/util/generateToken.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Testing-window auto-join. On first login only, if AUTO_JOIN_ORG_SLUG is set
 * in the environment, add the new user to that org's memberIds and followerIds.
 *
 * Reversible: unset the env var to disable. Existing memberships are not
 * retroactively removed — only future first-logins are affected.
 *
 * Wrapped in try/catch so auth never fails because of this.
 */
async function autoJoinOrgOnFirstLogin(userId) {
  const slug = process.env.AUTO_JOIN_ORG_SLUG;
  if (!slug) return;

  try {
    const org = await Organization.findOne({ slug });
    if (!org) {
      console.warn(`[auto-join] AUTO_JOIN_ORG_SLUG="${slug}" but no org found with that slug — skipping`);
      return;
    }
    if (!org.isActive) {
      console.warn(`[auto-join] org "${slug}" is deactivated — skipping`);
      return;
    }

    const uidStr = userId.toString();
    const isOwner = org.ownerId?.toString() === uidStr;
    const isAdmin = (org.adminIds || []).some((id) => id.toString() === uidStr);
    const isMember = (org.memberIds || []).some((id) => id.toString() === uidStr);

    if (isOwner || isAdmin || isMember) return;

    org.memberIds.push(userId);
    if (!(org.followerIds || []).some((id) => id.toString() === uidStr)) {
      org.followerIds.push(userId);
    }

    // Clear any stale pending request for this user in the same org
    const pendingIdx = (org.pendingMemberIds || []).findIndex((id) => id.toString() === uidStr);
    if (pendingIdx !== -1) {
      org.pendingMemberIds.splice(pendingIdx, 1);
    }

    await org.save();
    console.log(`[auto-join] user ${uidStr} added to org "${slug}" on first login`);
  } catch (err) {
    console.warn(`[auto-join] failed for user ${userId}: ${err.message}`);
  }
}

/**
 * Resolve Google user info from either an ID-token (credential)
 * or an OAuth2 access-token (from the implicit flow).
 */
async function resolveGoogleUser(credential) {
  // Try ID-token verification first (one-tap / credential flow)
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    // Fall through — credential may be an access_token instead
  }

  // Try as an access token — call Google's userinfo endpoint
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${credential}` },
  });

  if (!res.ok) {
    throw new Error('Invalid Google credential.');
  }

  const info = await res.json();
  return {
    googleId: info.sub,
    email: info.email,
    name: info.name,
    picture: info.picture,
  };
}

/**
 * POST /api/auth/google
 * Accepts { credential } (Google ID token OR access token from frontend).
 * Creates the user on first visit; logs them in on subsequent visits.
 */
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    // Resolve user info from the credential
    const { googleId, email, name, picture } = await resolveGoogleUser(credential);

    // Find or create user
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if a user with this email already exists (e.g. manually created admin)
      user = await User.findOne({ email });

      if (user) {
        // Link the existing account to this Google ID
        const isFirstLogin = !user.lastLogin;
        user.googleId = googleId;
        user.lastLogin = new Date();
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        // For pre-seeded stubs (never logged in), refresh displayName from Google
        // so placeholder names get replaced with real ones. Users who have logged
        // in before keep whatever name they've set.
        if (isFirstLogin && name) {
          user.displayName = name;
        }
        await user.save();
        if (isFirstLogin) {
          await autoJoinOrgOnFirstLogin(user._id);
        }
      } else {
        // First-time login - create user
        user = new User({
          googleId,
          email,
          displayName: name,
          avatar: picture || null,
          lastLogin: new Date(),
        });
        await user.save();
        await autoJoinOrgOnFirstLogin(user._id);
      }
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
    res.cookie('jwt', '', { ...COOKIE_OPTIONS, maxAge: 0 });
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.log('Error in logout:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export { googleAuth, getMe, logout };
