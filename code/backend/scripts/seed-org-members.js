import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';

function parseArgs(argv) {
  const args = { org: null, emails: [], names: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--org') { args.org = next; i++; }
    else if (a === '--emails') { args.emails = next.split(',').map((s) => s.trim()).filter(Boolean); i++; }
    else if (a === '--names') { args.names = next.split(',').map((s) => s.trim()); i++; }
  }
  return args;
}

function usageAndExit(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error('Usage:');
  console.error('  node scripts/seed-org-members.js --org <slug> --emails a@x,b@x [--names "Alice,Bob"]');
  console.error('');
  console.error('  --org     org slug (required)');
  console.error('  --emails  comma-separated emails (required)');
  console.error('  --names   comma-separated display names, same order as --emails (optional)');
  console.error('            if omitted, the email prefix is used as a placeholder.');
  process.exit(1);
}

const run = async () => {
  const args = parseArgs(process.argv);

  if (!args.org) usageAndExit('--org is required');
  if (args.emails.length === 0) usageAndExit('--emails is required');
  if (args.names.length > 0 && args.names.length !== args.emails.length) {
    usageAndExit(`--names has ${args.names.length} entries but --emails has ${args.emails.length}`);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.host}`);

  const org = await Organization.findOne({ slug: args.org });
  if (!org) {
    console.error(`Organization with slug "${args.org}" not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`Org: ${org.name} (${org._id})`);

  const before = org.memberCount;
  const userIds = [];

  for (let i = 0; i < args.emails.length; i++) {
    const email = args.emails[i].toLowerCase();
    const name = args.names[i] || email.split('@')[0];

    let user = await User.findOne({ email });
    if (user) {
      console.log(`[exists]    ${email} → ${user.displayName} (${user._id})`);
    } else {
      user = await User.create({
        googleId: `pre-seed-${email}`,
        email,
        displayName: name,
        lastLogin: null,
      });
      console.log(`[created]   ${email} → ${name} (${user._id})`);
    }
    userIds.push(user._id);
  }

  let addedCount = 0;
  for (const uid of userIds) {
    const uidStr = uid.toString();
    const isOwner = org.ownerId.toString() === uidStr;
    const isAdmin = org.adminIds.some((id) => id.toString() === uidStr);
    const isMember = org.memberIds.some((id) => id.toString() === uidStr);

    if (isOwner || isAdmin || isMember) {
      console.log(`[skip]      ${uidStr} is already owner/admin/member`);
      continue;
    }

    org.memberIds.push(uid);
    addedCount++;

    const isFollower = org.followerIds.some((id) => id.toString() === uidStr);
    if (!isFollower) {
      org.followerIds.push(uid);
    }

    // Remove from pending if present (they were in the queue before we pre-seeded them)
    const pendingIdx = org.pendingMemberIds.findIndex((id) => id.toString() === uidStr);
    if (pendingIdx !== -1) {
      org.pendingMemberIds.splice(pendingIdx, 1);
    }
  }

  await org.save();

  console.log(`\nMembers added: ${addedCount}`);
  console.log(`Member count: ${before} → ${org.memberCount}`);
  console.log('Done.');

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
