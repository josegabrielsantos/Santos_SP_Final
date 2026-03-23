/**
 * Phase 3: Create discussion posts in organizations
 *
 * 5 posts total:
 *   - 2 in College of Human Ecology
 *   - 2 in College of Arts and Science
 *   - 1 in College of Forestry and Natural Resources
 *
 * Run: node scripts/seed-phase3.js
 * Rollback: node scripts/seed-phase3.js --rollback
 */

import dotenv from 'dotenv';
dotenv.config();

const { default: mongoose } = await import('mongoose');
const { default: User } = await import('../models/user_model.js');
const { default: Organization } = await import('../models/organization_model.js');
const { default: Post } = await import('../models/post_model.js');
const { uploadToSpaces } = await import('../lib/spaces.js');

const ROLLBACK = process.argv.includes('--rollback');

// ─── Helper: build TipTap body from paragraphs ───

function buildBody(paragraphs) {
  return {
    type: 'doc',
    content: paragraphs.map(text => ({
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : [],
    })),
  };
}

// ─── Helper: download image from URL and upload to Spaces ───

async function downloadAndUploadImage(imageUrl, folder = 'posts') {
  try {
    const resp = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (UPLB-KAIN-Seed/1.0)' },
      redirect: 'follow',
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await resp.arrayBuffer());

    // Determine extension from content type
    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
    const ext = extMap[contentType.split(';')[0]] || '.jpg';
    const filename = `seed-image${ext}`;

    const result = await uploadToSpaces(buffer, filename, folder, contentType.split(';')[0]);
    return result.url;
  } catch (err) {
    console.log(`    WARNING: Failed to download/upload image: ${err.message}`);
    return null;
  }
}

// ─── Post Definitions ───

function getPostDefinitions() {
  return [
    // ── College of Human Ecology - Post 1 ──
    {
      title: 'Usapang food security sa mga pamilyang Pilipino during disasters',
      bodyParagraphs: [
        "Hi everyone! So we just finished our preliminary data collection sa 12 barangays in Laguna about household food security during the recent typhoon season and grabe yung findings.",
        "62% of the households we surveyed experienced moderate to severe food insecurity during and after the lockdowns/evacuations. Yung pinaka-affected talaga are the informal sector workers — yung mga nag-ttricycle, nagbebenta sa palengke, construction workers. They have zero safety net.",
        "What surprised me most was how creative the coping strategies were. Community pantries, food sharing between neighbors, switching to cheaper alternatives like instant noodles and dried fish. But the nutritional quality really drops. One mother told us 'basta may laman yung tiyan ng mga anak ko, ok na yun.' Heartbreaking.",
        "I want to open this discussion to the community — for those of you working in disaster risk reduction or community nutrition, what food security interventions have you seen that actually work during emergency situations? Especially yung sustainable, hindi lang one-time relief goods.",
        "Would also love to hear thoughts on how LGUs can better prepare food reserves at the barangay level. Right now parang reactive lang tayo lagi.",
      ],
      bodyText: "Hi everyone! So we just finished our preliminary data collection sa 12 barangays in Laguna about household food security during the recent typhoon season and grabe yung findings. 62% of the households we surveyed experienced moderate to severe food insecurity during and after the lockdowns/evacuations. Yung pinaka-affected talaga are the informal sector workers — yung mga nag-ttricycle, nagbebenta sa palengke, construction workers. They have zero safety net. What surprised me most was how creative the coping strategies were. Community pantries, food sharing between neighbors, switching to cheaper alternatives like instant noodles and dried fish. But the nutritional quality really drops. One mother told us 'basta may laman yung tiyan ng mga anak ko, ok na yun.' Heartbreaking. I want to open this discussion to the community — for those of you working in disaster risk reduction or community nutrition, what food security interventions have you seen that actually work during emergency situations? Especially yung sustainable, hindi lang one-time relief goods. Would also love to hear thoughts on how LGUs can better prepare food reserves at the barangay level. Right now parang reactive lang tayo lagi.",
      tags: ['food security', 'disaster preparedness', 'household nutrition', 'community resilience', 'Philippines'],
      orgSlug: 'college-of-human-ecology',
      authorGoogleId: 'SEED_003', // Dr. Villanueva
      type: 'post',
      publishedAt: new Date('2026-02-10T08:30:00Z'),
      images: [
        'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800', // community/relief goods
      ],
    },

    // ── College of Human Ecology - Post 2 ──
    {
      title: 'Nutrition education sa public schools — does it actually change behavior?',
      bodyParagraphs: [
        "So I just wrapped up a 12-week nutrition education pilot sa 8 public elementary schools in Batangas and wanted to share some initial results (full paper coming soon hopefully haha).",
        "We tested classroom modules + cooking demos + school garden activities. The good news: nutrition knowledge scores improved by 34% and vegetable consumption went from 2.1 to 3.8 times per week. The not-so-good news: the improvement was MUCH stronger in schools where parents were actively involved sa take-home activities.",
        "Basically, without parental engagement, yung mga bata they learn the concepts in school pero pagdating sa bahay, same diet pa rin. Sardinas, rice, and maybe some kangkong if swerte.",
        "This makes me think — should DepEd's Gulayan sa Paaralan program put more emphasis on parent involvement? Right now kasi focused lang sya sa school garden maintenance. What if we add family cooking sessions or recipe cards na involve yung vegetables from the garden?",
        "For those in the education or nutrition field, what's been your experience with school-based interventions? Any tips on how to make the behavior change stick beyond the program period?",
      ],
      bodyText: "So I just wrapped up a 12-week nutrition education pilot sa 8 public elementary schools in Batangas and wanted to share some initial results (full paper coming soon hopefully haha). We tested classroom modules + cooking demos + school garden activities. The good news: nutrition knowledge scores improved by 34% and vegetable consumption went from 2.1 to 3.8 times per week. The not-so-good news: the improvement was MUCH stronger in schools where parents were actively involved sa take-home activities. Basically, without parental engagement, yung mga bata they learn the concepts in school pero pagdating sa bahay, same diet pa rin. Sardinas, rice, and maybe some kangkong if swerte. This makes me think — should DepEd's Gulayan sa Paaralan program put more emphasis on parent involvement? Right now kasi focused lang sya sa school garden maintenance. What if we add family cooking sessions or recipe cards na involve yung vegetables from the garden? For those in the education or nutrition field, what's been your experience with school-based interventions? Any tips on how to make the behavior change stick beyond the program period?",
      tags: ['nutrition education', 'school nutrition', 'Gulayan sa Paaralan', 'dietary behavior', 'Philippines'],
      orgSlug: 'college-of-human-ecology',
      authorGoogleId: 'SEED_003', // Dr. Villanueva
      type: 'post',
      publishedAt: new Date('2026-03-05T14:15:00Z'),
      images: [
        'https://images.unsplash.com/photo-1592928302636-c83cf1e1c887?w=800', // school garden
      ],
    },

    // ── College of Arts and Science - Post 1 ──
    {
      title: 'Malunggay — superfood hype or legit nutritional powerhouse?',
      bodyParagraphs: [
        "Ok so malunggay has been getting a LOT of attention as a 'superfood' and I see it everywhere na — supplements, powder, capsules, pandesal na may malunggay, even smoothies. But how much of this is backed by actual science?",
        "We just finished a phytochemical analysis of three Philippine moringa varieties here in Laguna and yes, the nutrient content is genuinely impressive. The native PH variety had the highest antioxidant activity and the mineral content across all varieties was consistently high — calcium at around 2,000 mg/100g dried leaves, iron at 28 mg/100g. These numbers are legit.",
        "BUT here's the thing that most health blogs dont mention — bioavailability. Just because the leaf contains 28mg iron per 100g doesnt mean your body absorbs all of that. There are anti-nutritional factors like phytates that reduce absorption. The phytate:iron ratio in our samples was around 3-4:1, which means moderate bioavailability. Not bad pero not the miracle numbers people claim online.",
        "Also, processing matters a lot. Drying at high temperatures can degrade vitamin C and some B vitamins. But interestingly, it can also reduce anti-nutritional factors so it's a tradeoff.",
        "Thoughts? Is it realistic to base community nutrition programs on malunggay or is it better as a supplementary ingredient? Curious what the nutrition people here think. Also if anyone has data on bioavailability from human feeding trials, I'd love to see it.",
      ],
      bodyText: "Ok so malunggay has been getting a LOT of attention as a 'superfood' and I see it everywhere na — supplements, powder, capsules, pandesal na may malunggay, even smoothies. But how much of this is backed by actual science? We just finished a phytochemical analysis of three Philippine moringa varieties here in Laguna and yes, the nutrient content is genuinely impressive. The native PH variety had the highest antioxidant activity and the mineral content across all varieties was consistently high — calcium at around 2,000 mg/100g dried leaves, iron at 28 mg/100g. These numbers are legit. BUT here's the thing that most health blogs dont mention — bioavailability. Just because the leaf contains 28mg iron per 100g doesnt mean your body absorbs all of that. There are anti-nutritional factors like phytates that reduce absorption. The phytate:iron ratio in our samples was around 3-4:1, which means moderate bioavailability. Not bad pero not the miracle numbers people claim online. Also, processing matters a lot. Drying at high temperatures can degrade vitamin C and some B vitamins. But interestingly, it can also reduce anti-nutritional factors so it's a tradeoff. Thoughts? Is it realistic to base community nutrition programs on malunggay or is it better as a supplementary ingredient? Curious what the nutrition people here think. Also if anyone has data on bioavailability from human feeding trials, I'd love to see it.",
      tags: ['moringa', 'malunggay', 'nutrition', 'phytochemistry', 'Philippines'],
      orgSlug: 'college-of-arts-and-science',
      authorGoogleId: 'SEED_004', // Engr. Torres
      type: 'post',
      publishedAt: new Date('2026-01-20T10:00:00Z'),
      images: [
        'https://images.unsplash.com/photo-1616484808498-b6b20a5b8b0e?w=800', // moringa leaves
      ],
    },

    // ── College of Arts and Science - Post 2 ──
    {
      title: 'Functional foods from Philippine native crops — untapped potential?',
      bodyParagraphs: [
        "Naisip ko lang — we have SO many native crops in the Philippines na may incredible nutritional profiles pero barely studied or commercialized. Camote, ube, adlai, kalabasa seeds, siling labuyo, talbos ng kamote... the list goes on.",
        "I've been reviewing literature on functional food development and most of the research is on Western or East Asian crops — blueberries, matcha, quinoa, acai. Meanwhile tayo we have crops that grow easily sa backyard na potentially just as nutritious or even better for our specific nutrient gaps.",
        "Take adlai (Coix lacryma-jobi) for example. It has higher protein content than rice (15% vs 7%), significant amounts of calcium and iron, and studies from Thailand and China show it has anti-inflammatory and antioxidant properties. But we barely grow it commercially in the PH despite it being native to us.",
        "Or how about talbos ng kamote? We eat it regularly in sinigang but barely anyone talks about its nutrient density — high in vitamins A, C, B6, and iron. It grows like crazy with minimal input.",
        "I think there's a huge opportunity here for food science research. What if we characterized the bioactive compounds in these native crops and developed functional food products from them? Not as expensive 'superfoods' pero as affordable, locally available nutrition solutions. Interested to hear if anyone else is working on this or has leads on existing research.",
      ],
      bodyText: "Naisip ko lang — we have SO many native crops in the Philippines na may incredible nutritional profiles pero barely studied or commercialized. Camote, ube, adlai, kalabasa seeds, siling labuyo, talbos ng kamote... the list goes on. I've been reviewing literature on functional food development and most of the research is on Western or East Asian crops — blueberries, matcha, quinoa, acai. Meanwhile tayo we have crops that grow easily sa backyard na potentially just as nutritious or even better for our specific nutrient gaps. Take adlai (Coix lacryma-jobi) for example. It has higher protein content than rice (15% vs 7%), significant amounts of calcium and iron, and studies from Thailand and China show it has anti-inflammatory and antioxidant properties. But we barely grow it commercially in the PH despite it being native to us. Or how about talbos ng kamote? We eat it regularly in sinigang but barely anyone talks about its nutrient density — high in vitamins A, C, B6, and iron. It grows like crazy with minimal input. I think there's a huge opportunity here for food science research. What if we characterized the bioactive compounds in these native crops and developed functional food products from them? Not as expensive 'superfoods' pero as affordable, locally available nutrition solutions. Interested to hear if anyone else is working on this or has leads on existing research.",
      tags: ['functional foods', 'native crops', 'adlai', 'food science', 'Philippines', 'nutrition'],
      orgSlug: 'college-of-arts-and-science',
      authorGoogleId: 'SEED_004', // Engr. Torres
      type: 'post',
      publishedAt: new Date('2026-03-12T09:45:00Z'),
      images: [
        'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800', // assorted vegetables/crops
      ],
    },

    // ── College of Forestry and Natural Resources - Post 1 ──
    {
      title: 'Wild edible plants sa Cordillera — food security resource na overlooked',
      bodyParagraphs: [
        "Sharing some findings from our ethnobotanical survey sa Ifugao. We spent 8 months documenting wild edible plants used by upland farming communities and honestly, na-amaze ako sa richness ng traditional food knowledge nila.",
        "We found 87 species of wild edible plants across 42 families. 34 of these are consumed regularly during lean months (June-August) when rice stores run low. Yung mga pako (fern fiddleheads), wild ginger, various species ng wild yam, and dozens of leafy greens na wala tayong common name in Tagalog.",
        "What's really interesting is the nutrient content. We analyzed the top 10 most consumed species and the calcium, iron, and beta-carotene levels are significantly higher than commonly cultivated vegetables. Some of these species have calcium content na 5-8x higher than kangkong.",
        "The sad part is these food resources are declining. Deforestation, conversion to monocrop agriculture, and younger generations losing interest in traditional foraging — lahat contributing to the loss of both the plants and the knowledge of how to use them.",
        "I really think we need to integrate wild edible plant conservation into our food security strategies for upland communities. Not just as a backup food source pero as a legitimate part of dietary diversity. Anyone here working on agroforestry systems that incorporate wild food plants? Would love to connect.",
      ],
      bodyText: "Sharing some findings from our ethnobotanical survey sa Ifugao. We spent 8 months documenting wild edible plants used by upland farming communities and honestly, na-amaze ako sa richness ng traditional food knowledge nila. We found 87 species of wild edible plants across 42 families. 34 of these are consumed regularly during lean months (June-August) when rice stores run low. Yung mga pako (fern fiddleheads), wild ginger, various species ng wild yam, and dozens of leafy greens na wala tayong common name in Tagalog. What's really interesting is the nutrient content. We analyzed the top 10 most consumed species and the calcium, iron, and beta-carotene levels are significantly higher than commonly cultivated vegetables. Some of these species have calcium content na 5-8x higher than kangkong. The sad part is these food resources are declining. Deforestation, conversion to monocrop agriculture, and younger generations losing interest in traditional foraging — lahat contributing to the loss of both the plants and the knowledge of how to use them. I really think we need to integrate wild edible plant conservation into our food security strategies for upland communities. Not just as a backup food source pero as a legitimate part of dietary diversity. Anyone here working on agroforestry systems that incorporate wild food plants? Would love to connect.",
      tags: ['wild edible plants', 'Ifugao', 'ethnobotany', 'food security', 'indigenous knowledge', 'Cordillera'],
      orgSlug: 'college-of-forestry-and-natural-resources',
      authorGoogleId: 'SEED_006', // Prof. Bautista
      type: 'post',
      publishedAt: new Date('2026-02-22T11:30:00Z'),
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', // lush green landscape/forest
      ],
    },
  ];
}

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
  // Build lookup maps
  const seedUsers = await User.find({ googleId: /^SEED_/ }).lean();
  if (seedUsers.length === 0) {
    console.log('ERROR: No seeded users found. Run seed-phase1.js first.');
    return;
  }

  const userByGoogleId = {};
  for (const u of seedUsers) userByGoogleId[u.googleId] = u;
  // Also fetch existing users
  const existingUsers = await User.find({ googleId: { $not: /^SEED_/ } }).lean();
  for (const u of existingUsers) userByGoogleId[u.googleId] = u;

  const orgBySlug = {};
  const allOrgs = await Organization.find({}).lean();
  for (const o of allOrgs) orgBySlug[o.slug] = o;

  // Check for existing seeded posts (by authorId being a SEED_ user with our specific titles)
  const postDefs = getPostDefinitions();
  const seedTitles = postDefs.map(p => p.title);
  const existingSeeded = await Post.find({ title: { $in: seedTitles } }).lean();
  if (existingSeeded.length > 0) {
    console.log(`Found ${existingSeeded.length} existing seeded posts:`);
    existingSeeded.forEach(p => console.log(`  - "${p.title}"`));
    console.log('Run with --rollback first to clean up, or skip this phase.');
    return;
  }

  console.log('=== Creating Discussion Posts ===\n');

  const createdPosts = [];

  for (let i = 0; i < postDefs.length; i++) {
    const def = postDefs[i];
    const org = orgBySlug[def.orgSlug];
    if (!org) {
      console.log(`  WARNING: Org "${def.orgSlug}" not found, skipping.`);
      continue;
    }

    const author = userByGoogleId[def.authorGoogleId];
    if (!author) {
      console.log(`  WARNING: Author "${def.authorGoogleId}" not found, skipping.`);
      continue;
    }

    // Ensure author is a member of the org (add if not)
    const isMember = org.memberIds.some(id => id.toString() === author._id.toString());
    const isAdmin = org.adminIds.some(id => id.toString() === author._id.toString());
    const isOwner = org.ownerId.toString() === author._id.toString();
    if (!isMember && !isAdmin && !isOwner) {
      console.log(`  Adding ${author.displayName} as member of ${org.name}...`);
      await Organization.findByIdAndUpdate(org._id, {
        $addToSet: { memberIds: author._id },
        $inc: { memberCount: 1 },
      });
    }

    // Download and upload images
    const mediaUrls = [];
    if (def.images && def.images.length > 0) {
      for (const imgUrl of def.images) {
        process.stdout.write(`  Downloading image for post ${i + 1}...`);
        const uploadedUrl = await downloadAndUploadImage(imgUrl);
        if (uploadedUrl) {
          mediaUrls.push(uploadedUrl);
          process.stdout.write(' OK\n');
        } else {
          process.stdout.write(' FAILED (skipping image)\n');
        }
      }
    }

    // Create the post
    const post = await Post.create({
      title: def.title,
      body: buildBody(def.bodyParagraphs),
      bodyText: def.bodyText,
      tags: def.tags,
      authorId: author._id,
      organizationId: org._id,
      status: 'published',
      type: def.type,
      publishedAt: def.publishedAt,
      mediaUrls,
    });

    // Update org postCount
    await Organization.findByIdAndUpdate(org._id, { $inc: { postCount: 1 } });

    console.log(`  Post ${i + 1}: "${def.title.substring(0, 60)}..." -> ${org.name}`);
    console.log(`    ID: ${post._id} | Author: ${author.displayName} | Media: ${mediaUrls.length} images`);
    createdPosts.push(post);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Posts created: ${createdPosts.length}`);
  for (const post of createdPosts) {
    const org = allOrgs.find(o => o._id.toString() === post.organizationId.toString());
    console.log(`  - "${post.title.substring(0, 50)}..." | ${org?.name} | ${post.status}`);
  }
}

async function rollback() {
  console.log('=== Rolling Back Phase 3 Posts ===\n');

  const postDefs = getPostDefinitions();
  const seedTitles = postDefs.map(p => p.title);
  const seededPosts = await Post.find({ title: { $in: seedTitles } }).lean();

  if (seededPosts.length === 0) {
    console.log('No seeded posts found. Nothing to rollback.');
    return;
  }

  for (const post of seededPosts) {
    // Decrement org postCount
    if (post.organizationId) {
      await Organization.findByIdAndUpdate(post.organizationId, { $inc: { postCount: -1 } });
    }

    await Post.deleteOne({ _id: post._id });
    console.log(`  Deleted: "${post.title.substring(0, 60)}..."`);
  }

  console.log(`\nDeleted ${seededPosts.length} posts.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
