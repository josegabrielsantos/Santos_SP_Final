/**
 * Phase 1: Create synthetic users and assign memberships to organizations
 *
 * Run: node scripts/seed-phase1.js
 * Rollback: node scripts/seed-phase1.js --rollback
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';

const ROLLBACK = process.argv.includes('--rollback');

// ─── Synthetic User Definitions ───

const SYNTHETIC_USERS = [
  {
    googleId: 'SEED_001',
    email: 'ml.reyes@up.edu.ph',
    displayName: 'Dr. Maria Lourdes Reyes',
    role: 'user',
    bio: 'Associate Professor, Institute of Human Nutrition and Food, UPLB. Research focus on maternal and child nutrition in rural Philippine communities.',
    expertise: ['Maternal Nutrition', 'Community Nutrition', 'Micronutrient Deficiency'],
    isActive: true,
    lastLogin: new Date('2026-03-20'),
  },
  {
    googleId: 'SEED_002',
    email: 'rc.delacruz@up.edu.ph',
    displayName: 'Prof. Ricardo Dela Cruz',
    role: 'user',
    bio: 'Assistant Professor, College of Agriculture and Food Science, UPLB. Specializes in rice biofortification and post-harvest food safety.',
    expertise: ['Rice Science', 'Food Safety', 'Biofortification'],
    isActive: true,
    lastLogin: new Date('2026-03-18'),
  },
  {
    googleId: 'SEED_003',
    email: 'am.villanueva@up.edu.ph',
    displayName: 'Dr. Angela Mae Villanueva',
    role: 'user',
    bio: 'Professor, College of Human Ecology, UPLB. Expert in household food security assessment and nutrition education interventions.',
    expertise: ['Food Security Assessment', 'Nutrition Education', 'Household Surveys'],
    isActive: true,
    lastLogin: new Date('2026-03-21'),
  },
  {
    googleId: 'SEED_004',
    email: 'pm.torres@up.edu.ph',
    displayName: 'Engr. Paolo Miguel Torres',
    role: 'user',
    bio: 'Instructor, College of Engineering and Agro-Industrial Technology, UPLB. Research on food drying and preservation technologies for smallholder farmers.',
    expertise: ['Food Processing', 'Post-Harvest Engineering', 'Drying Technology'],
    isActive: true,
    lastLogin: new Date('2026-03-15'),
  },
  {
    googleId: 'SEED_005',
    email: 'sc.aquino@up.edu.ph',
    displayName: 'Dr. Sofia Carmen Aquino',
    role: 'user',
    bio: 'Research Associate, College of Economics and Management. Studies food price volatility and its impact on Filipino household nutrition.',
    expertise: ['Agricultural Economics', 'Food Prices', 'Nutrition Economics'],
    isActive: true,
    lastLogin: new Date('2026-03-19'),
  },
  {
    googleId: 'SEED_006',
    email: 'jc.bautista@up.edu.ph',
    displayName: 'Prof. Juan Carlos Bautista',
    role: 'user',
    bio: 'Assistant Professor, College of Public Affairs and Development. Works on food security policy analysis and nutrition governance frameworks in the Philippines.',
    expertise: ['Food Policy', 'Governance', 'Rural Development'],
    isActive: true,
    lastLogin: new Date('2026-03-22'),
  },
];

// ─── Organization Membership Mapping ───
// Maps user googleId -> array of org slugs to join as member

const SYNTHETIC_MEMBERSHIPS = {
  SEED_001: ['ihnf', 'college-of-human-ecology'],
  SEED_002: ['college-of-agriculture-and-food-science', 'ihnf'],
  SEED_003: ['college-of-human-ecology', 'college-of-public-affair-and-development'],
  SEED_004: ['college-of-engineering-and-agro-industrial-technology', 'college-of-agriculture-and-food-science'],
  SEED_005: ['college-of-economics-and-management', 'college-of-public-affair-and-development'],
  SEED_006: ['college-of-public-affair-and-development', 'college-of-economics-and-management'],
};

// Existing users to add to orgs
// Maps existing user _id -> array of org slugs
const EXISTING_USER_MEMBERSHIPS = {
  '69a0672cdf765d1e77ebd281': ['college-of-agriculture-and-food-science', 'ihnf', 'college-of-human-ecology'], // JoJo Admin
  '69bffa2d91aa7f1db60879b1': ['college-of-arts-and-science'], // John Lester Centino
  '69bffd8691aa7f1db6087e67': ['college-of-developmental-communication', 'college-of-human-ecology'], // Franchesca
};

// ─── Main ───

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  if (ROLLBACK) {
    await rollback();
  } else {
    await seed();
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

async function seed() {
  // Step 1: Check for existing seed data
  const existingSeeded = await User.find({ googleId: /^SEED_/ }).lean();
  if (existingSeeded.length > 0) {
    console.log(`Found ${existingSeeded.length} existing seeded users:`);
    existingSeeded.forEach(u => console.log(`  - ${u.displayName} (${u.googleId})`));
    console.log('Run with --rollback first to clean up, or skip this phase.');
    return;
  }

  // Step 2: Create synthetic users
  console.log('=== Creating Synthetic Users ===\n');
  const createdUsers = [];

  for (const userData of SYNTHETIC_USERS) {
    const user = await User.create(userData);
    console.log(`  Created: ${user.displayName} (${user._id})`);
    createdUsers.push(user);
  }

  console.log(`\n  Total: ${createdUsers.length} users created.\n`);

  // Step 3: Add synthetic users to organizations
  console.log('=== Adding Synthetic Users to Organizations ===\n');

  // Build a map of googleId -> userId for quick lookup
  const seedUserMap = {};
  for (const user of createdUsers) {
    seedUserMap[user.googleId] = user._id;
  }

  // Process synthetic user memberships
  for (const [googleId, orgSlugs] of Object.entries(SYNTHETIC_MEMBERSHIPS)) {
    const userId = seedUserMap[googleId];
    const userName = createdUsers.find(u => u.googleId === googleId).displayName;

    for (const slug of orgSlugs) {
      const org = await Organization.findOne({ slug });
      if (!org) {
        console.log(`  WARNING: Org "${slug}" not found, skipping.`);
        continue;
      }

      // Check if already a member (shouldn't be, but be safe)
      const alreadyMember = org.memberIds.some(id => id.toString() === userId.toString());
      if (alreadyMember) {
        console.log(`  ${userName} already in ${org.name}, skipping.`);
        continue;
      }

      org.memberIds.push(userId);
      await org.save(); // pre-save hook syncs memberCount
      console.log(`  Added ${userName} -> ${org.name} (members: ${org.memberCount})`);
    }
  }

  // Step 4: Add existing users to organizations
  console.log('\n=== Adding Existing Users to Organizations ===\n');

  for (const [userIdStr, orgSlugs] of Object.entries(EXISTING_USER_MEMBERSHIPS)) {
    const userId = new mongoose.Types.ObjectId(userIdStr);
    const user = await User.findById(userId).lean();
    if (!user) {
      console.log(`  WARNING: User ${userIdStr} not found, skipping.`);
      continue;
    }

    for (const slug of orgSlugs) {
      const org = await Organization.findOne({ slug });
      if (!org) {
        console.log(`  WARNING: Org "${slug}" not found, skipping.`);
        continue;
      }

      // Check if already a member or admin/owner
      const alreadyMember = org.memberIds.some(id => id.toString() === userIdStr);
      const isAdmin = org.adminIds.some(id => id.toString() === userIdStr);
      const isOwner = org.ownerId.toString() === userIdStr;

      if (alreadyMember || isAdmin || isOwner) {
        console.log(`  ${user.displayName} already in ${org.name} (member/admin/owner), skipping.`);
        continue;
      }

      org.memberIds.push(userId);
      await org.save();
      console.log(`  Added ${user.displayName} -> ${org.name} (members: ${org.memberCount})`);
    }
  }

  // Step 5: Print summary
  console.log('\n=== Summary ===\n');
  console.log('Created users:');
  for (const user of createdUsers) {
    console.log(`  ${user.displayName} | ${user._id} | ${user.googleId}`);
  }

  console.log('\nOrganization membership counts:');
  const allOrgSlugs = new Set([
    ...Object.values(SYNTHETIC_MEMBERSHIPS).flat(),
    ...Object.values(EXISTING_USER_MEMBERSHIPS).flat(),
  ]);

  for (const slug of allOrgSlugs) {
    const org = await Organization.findOne({ slug }).lean();
    if (org) {
      console.log(`  ${org.name}: ${org.memberIds.length} members`);
    }
  }
}

async function rollback() {
  console.log('=== Rolling Back Phase 1 ===\n');

  // Find all seeded users
  const seededUsers = await User.find({ googleId: /^SEED_/ }).lean();
  if (seededUsers.length === 0) {
    console.log('No seeded users found. Nothing to rollback.');
    return;
  }

  const seededUserIds = seededUsers.map(u => u._id);

  // Remove from all org memberIds
  console.log('Removing seeded users from organizations...');
  const orgs = await Organization.find({
    memberIds: { $in: seededUserIds },
  });

  for (const org of orgs) {
    const before = org.memberIds.length;
    org.memberIds = org.memberIds.filter(
      id => !seededUserIds.some(sid => sid.toString() === id.toString())
    );
    await org.save(); // re-syncs memberCount
    const removed = before - org.memberIds.length;
    if (removed > 0) {
      console.log(`  ${org.name}: removed ${removed} seeded members (now ${org.memberCount})`);
    }
  }

  // Delete seeded users
  console.log('\nDeleting seeded users...');
  for (const user of seededUsers) {
    await User.deleteOne({ _id: user._id });
    console.log(`  Deleted: ${user.displayName} (${user.googleId})`);
  }

  // Note: we don't rollback existing user membership additions
  // since we can't distinguish which memberships were added by the seed
  console.log('\nNote: Existing user membership additions are NOT rolled back.');
  console.log('If needed, manually remove existing users from orgs.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
