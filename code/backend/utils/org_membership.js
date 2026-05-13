import Organization from '../models/organization_model.js';

/**
 * Remove a user from all organization membership arrays.
 *
 * Handles:
 *   - memberIds, pendingMemberIds, followerIds → pulled freely
 *   - adminIds → pulled unless it would leave the org with zero admins
 *     (schema requires adminIds.length >= 1)
 *   - ownerId → NOT removed. Ownership must be transferred or the org
 *     deleted by a website admin; we don't silently orphan organizations.
 *
 * Keeps memberCount consistent with memberIds (the pre-save hook recomputes
 * it, but we go through updateMany for bulk speed + atomicity, so we use
 * $inc and let the next save normalize if needed).
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<{
 *   memberRemoved: number,
 *   adminRemoved: number,
 *   followerRemoved: number,
 *   pendingRemoved: number,
 *   ownedOrgs: string[],
 *   adminSkipped: string[],
 * }>}
 */
export async function removeUserFromAllOrgs(userId) {
  const [memberRes, followerRes, pendingRes] = await Promise.all([
    Organization.updateMany(
      { memberIds: userId },
      { $pull: { memberIds: userId }, $inc: { memberCount: -1 } },
    ),
    Organization.updateMany(
      { followerIds: userId },
      { $pull: { followerIds: userId } },
    ),
    Organization.updateMany(
      { pendingMemberIds: userId },
      { $pull: { pendingMemberIds: userId } },
    ),
  ]);

  // Admin removal needs the "at least one admin remains" guard.
  const adminOrgs = await Organization.find({ adminIds: userId })
    .select('_id name adminIds')
    .lean();

  const adminSkipped = [];
  let adminRemoved = 0;
  for (const org of adminOrgs) {
    if ((org.adminIds || []).length <= 1) {
      adminSkipped.push(org._id.toString());
      continue;
    }
    await Organization.updateOne(
      { _id: org._id },
      { $pull: { adminIds: userId } },
    );
    adminRemoved += 1;
  }

  // Flag organizations where this user is the sole owner — not removed.
  const ownedOrgs = await Organization.find({ ownerId: userId })
    .select('_id')
    .lean();

  return {
    memberRemoved: memberRes.modifiedCount || 0,
    adminRemoved,
    followerRemoved: followerRes.modifiedCount || 0,
    pendingRemoved: pendingRes.modifiedCount || 0,
    ownedOrgs: ownedOrgs.map((o) => o._id.toString()),
    adminSkipped,
  };
}
