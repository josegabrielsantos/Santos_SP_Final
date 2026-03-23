/**
 * Phase 4: Create comments on existing (non-seeded) posts
 *
 * 20 comments across ~10 posts, 1-3 per post
 * Comments are taglish, informal but substantive, with minor grammar quirks
 *
 * Run: node scripts/seed-phase4.js
 * Rollback: node scripts/seed-phase4.js --rollback
 */

import dotenv from 'dotenv';
dotenv.config();

const { default: mongoose } = await import('mongoose');
const { default: User } = await import('../models/user_model.js');
const { default: Post } = await import('../models/post_model.js');
const { default: Comment } = await import('../models/comment_model.js');

const ROLLBACK = process.argv.includes('--rollback');

// ─── Comment Definitions ───
// Each entry: { postId, comments: [{ authorGoogleId, body, replies: [{ authorGoogleId, body, replyToUser }] }] }

function getCommentDefinitions() {
  return [

    // ── 1. "What are your thoughts on the findings of this paper about Pest management?" ──
    // Paper: Rodent management and cereal production in Asia (EBRM, rice, maize)
    // Org: College of Agriculture and Food Science
    {
      postId: '69c13df9f7070432a671d028',
      comments: [
        {
          authorGoogleId: 'SEED_002', // Prof. Dela Cruz
          body: "This is really relevant sa situation natin sa rice farming areas in Nueva Ecija and Isabela. Yung ecologically-based rodent management (EBRM) approach na mentioned dito is actually what PhilRice has been trying to promote, pero adoption rate is still low kasi most farmers default to rodenticides. The 6-15% yield increase is significant though — thats a strong argument for EBRM.",
          replies: [
            {
              authorGoogleId: 'SEED_005', // Dr. Aquino
              body: "True, and from an economics perspective, the cost-benefit ratio of EBRM vs chemical control would be interesting to see. If the savings on rodenticides plus yield gains outweigh the labor costs of EBRM, mas madali i-convince yung farmers. Do you know if PhilRice has that data?",
              replyToUser: 'Prof. Ricardo Dela Cruz',
            },
          ],
        },
        {
          authorGoogleId: 'SEED_006', // Prof. Bautista
          body: "Interesting that they framed it as balancing food security AND conservation. Most pest management studies focus purely on maximizing yield. Yung biodiversity angle is important kasi some rodent species actually play ecological roles sa mga ecosystems natin. Not all rodents are pests.",
        },
      ],
    },

    // ── 2. "UPLB Launches Executive Course in Culinary Science and Nutrition" ──
    // Org: College of Human Ecology
    {
      postId: '69c13fbbf7070432a671d153',
      comments: [
        {
          authorGoogleId: 'SEED_003', // Dr. Villanueva
          body: "This is great news! Na-excite ako sa emphasis on healthy and sustainable food preparation. I hope they incorporate local indigenous ingredients din sa curriculum — like camote tops, adlai, malunggay — not just Western culinary techniques. Would be a perfect blend of nutrition science and Filipino food culture.",
        },
        {
          authorGoogleId: 'SEED_001', // Dr. Reyes
          body: "I wonder if they'll cover community nutrition applications too, like how to prepare nutrient-dense meals on a limited budget. That would be super useful for barangay nutrition scholars and feeding program coordinators. 13 weeks is a good length for an executive course. Sana may scholarships for LGU nutrition workers!",
        },
      ],
    },

    // ── 3. "Growing Food, Growing Hope: Edible Landscaping During Pandemic" ──
    // Paper: Edible Landscaping (EL) Technology, food self-sufficiency during COVID-19
    // Org: College of Forestry and Natural Resources
    {
      postId: '69c144acf7070432a671d66b',
      comments: [
        {
          authorGoogleId: 'SEED_006', // Prof. Bautista
          body: "Nice paper share! Edible landscaping is such a practical concept. During the pandemic, nakita namin sa Laguna na yung households with even small vegetable gardens coped much better with food insecurity. The question is how to sustain it beyond the crisis — most people stop gardening once things go back to normal.",
          replies: [
            {
              authorGoogleId: 'SEED_002', // Prof. Dela Cruz
              body: "Agree. I think the sustainability issue is partly about motivation — during the pandemic there was a clear need, pero pagkatapos nawala na yung urgency. Maybe if we frame it as cost savings rather than emergency preparedness, mas ma-sustain? Like tracking how much you save monthly from your garden.",
              replyToUser: 'Prof. Juan Carlos Bautista',
            },
          ],
        },
      ],
    },

    // ── 4. "Organic Farming Sounds Good… But Why Is It So Hard to Support?" ──
    // Paper: Enhancing Organic Agricultural Inputs Sector, RA 10068, certification challenges
    // Org: College of Agriculture and Food Science
    {
      postId: '69c145bef7070432a671d70d',
      comments: [
        {
          authorGoogleId: 'SEED_005', // Dr. Aquino
          body: "This paper really highlights yung gap between policy intent and reality. RA 10068 sounds great on paper pero yung P100k+ certification cost is insane for smallholder farmers. Most Filipino farmers are operating on less than 3 hectares — they cant afford that. I think the government needs to subsidize organic certification for small farmers if they're serious about reaching that 5% target.",
        },
        {
          authorGoogleId: 'SEED_002', // Prof. Dela Cruz
          body: "The irony is yung mga consumers willing to pay premium for organic are mostly in urban areas, pero yung production infrastructure and certification bodies are centralized sa Metro Manila din. So rural farmers who are more likely to already practice organic-by-default kasi they cant afford chemicals, they dont have access to the certification process. It's a structural problem talaga.",
          replies: [
            {
              authorGoogleId: 'SEED_006', // Prof. Bautista
              body: "Exactly. And from a governance perspective, the LGUs should be more involved in facilitating certification at the local level. Right now ang centralized ng process. If DILG mandates local organic agriculture offices similar to nutrition action offices, baka mas accessible sya.",
              replyToUser: 'Prof. Ricardo Dela Cruz',
            },
          ],
        },
      ],
    },

    // ── 5. "CAFS peeps, worth it ba mag-focus on organic inputs production?" ──
    // Discussion post about organic inputs, biocontrol agents
    // Org: College of Agriculture and Food Science
    {
      postId: '69c14655f7070432a671d76d',
      comments: [
        {
          authorGoogleId: 'SEED_002', // Prof. Dela Cruz
          body: "As someone who works on food safety, I'd say yes its worth pursuing pero with realistic expectations. Organic inputs like compost and vermicast are straightforward but biocontrol agents require more R&D investment and quality control. The key challenge is consistency — farmers need reliable results every season, not hit-or-miss biological control.",
        },
        {
          authorGoogleId: 'SEED_004', // Engr. Torres
          body: "From an engineering perspective, the production side is actually solvable. We can design simple, low-cost bioreactors for Trichoderma production and standardized composting systems. The bottleneck is really the regulatory framework and quality testing. If DOST or PCAARRD can set up regional testing labs for organic inputs, that would be a game changer.",
        },
      ],
    },

    // ── 6. "Here is the Agro-Industrial Park" ──
    // Post about AIP in UPLB
    // Org: College of Agriculture and Food Science
    {
      postId: '69c147c4f7070432a671d8b9',
      comments: [
        {
          authorGoogleId: 'SEED_004', // Engr. Torres
          body: "The AIP is honestly one of UPLB's most underrated facilities. I've been there a couple of times for our food processing experiments and the equipment is decent. Ang ganda ng concept na bridge between research and commercialization. Sana lang mas accessible sya for students na gusto mag-pilot test ng food products — right now medyo complicated yung process to book the facilities.",
        },
      ],
    },

    // ── 7. "Analyzing Consumer Preferences for Credence Attributes of Fish" ──
    // Paper: Conjoint analysis of fish preferences in Davao, food safety, environmental sustainability
    // Org: College of Engineering and Agro-Industrial Technology
    {
      postId: '69c15ab7f7070432a671dfa1',
      comments: [
        {
          authorGoogleId: 'SEED_005', // Dr. Aquino
          body: "Good study! Conjoint analysis is really the right method for this kind of research. Im curious about the willingness-to-pay estimates — how much premium are Davao consumers actually willing to pay for sustainably caught fish? Kasi in our experience with other food products, stated preferences dont always translate to actual purchasing behavior, especially for lower-income households.",
        },
        {
          authorGoogleId: 'SEED_002', // Prof. Dela Cruz
          body: "The food safety angle here is interesting. In most wet markets, consumers have very limited information about how fish was caught or handled. No labeling, no traceability. So these 'credence attributes' are exactly that — you have to take it on faith. Maybe QR-code based traceability could bridge that gap? Some pilot projects in Thailand have done this already.",
        },
      ],
    },

    // ── 8. "Bt Corn and Food Security: Safe solution or long-term risk?" ──
    // Paper: Bt toxin, Asian corn borer Ostrinia furnacalis, midgut receptor characterization
    // Org: College of Arts and Science
    {
      postId: '69c15db0f7070432a671e20e',
      comments: [
        {
          authorGoogleId: 'SEED_002', // Prof. Dela Cruz
          body: "Maganda yung question about long-term sustainability. The biochemistry in this paper is solid — understanding how Cry1Ab binds to midgut receptors is crucial for predicting resistance development. From the agricultural side, the key is implementing refuge strategies properly. If you plant non-Bt corn strips alongside Bt corn, you maintain a susceptible insect population that slows down resistance evolution. Pero in practice ang hirap i-enforce yun sa smallholder farms.",
          replies: [
            {
              authorGoogleId: 'SEED_004', // Engr. Torres
              body: "True. And sa Philippines, most corn farmers are smallholders with less than 2 hectares. Asking them to devote 20% of their land to non-Bt refuge corn that yields less is a hard sell economically. Maybe there's a community-level approach where the refuge areas are shared across neighboring farms?",
              replyToUser: 'Prof. Ricardo Dela Cruz',
            },
          ],
        },
      ],
    },

    // ── 9. "RTL & Food Security: Affordable Rice vs. Kawawang Magsasaka?" ──
    // Discussion on Rice Tariffication Law, RCEF extension
    // Org: College of Agriculture and Food Science
    {
      postId: '69c15ed9f7070432a671e272',
      comments: [
        {
          authorGoogleId: 'SEED_005', // Dr. Aquino
          body: "This hits close to home sa research namin. The data shows na yes, consumer prices went down initially pero the local farmers took the hit. Yung RCEF is supposed to cushion that pero ang bagal ng disbursement. And honestly, the fund amount is not enough to make our farmers competitive against Vietnamese and Thai imports. We need a more holistic approach — not just cash aid pero actual mechanization and irrigation investment.",
        },
        {
          authorGoogleId: 'SEED_006', // Prof. Bautista
          body: "I think the fundamental problem is we're trying to use one policy instrument to achieve two conflicting goals — cheap rice for consumers AND fair income for farmers. These need to be decoupled. Let the market handle consumer prices through trade, then use separate direct income support programs for farmers. The 4Ps model could actually be adapted for this — conditional transfers to farming households linked to productivity improvements.",
        },
      ],
    },

    // ── 10. "How should we Ensure Food Security in the Philippines?" ──
    // Paper: Ensuring Food Security - ASEAN Integration, agricultural trade, regional cooperation
    // Org: College of Human Ecology
    {
      postId: '69c1605cf7070432a671e2bc',
      comments: [
        {
          authorGoogleId: 'SEED_001', // Dr. Reyes
          body: "Great question and relevant paper. From the nutrition side, I think we put too much emphasis on food availability (production and trade) and not enough on food utilization. Even if may sapat na pagkain, kung ang diet is mostly rice and processed food, food security pa ba yun? We need to integrate dietary quality metrics into our food security assessments, not just caloric sufficiency.",
          replies: [
            {
              authorGoogleId: 'SEED_003', // Dr. Villanueva
              body: "Super agree. The ASEAN integration angle is interesting pero locally, the biggest challenge is really at the household level — access, affordability, and dietary diversity. A family can live near a palengke full of vegetables pero kung hindi nila afford or hindi nila alam how to prepare them nutritiously, the food availability doesnt matter.",
              replyToUser: 'Dr. Maria Lourdes Reyes',
            },
          ],
        },
      ],
    },

    // ── 11. "How poor Nutrition can affect the education of our kids" ──
    // Discussion post about nutrition and youth education (with video)
    // Org: College of Human Ecology
    {
      postId: '69c160e1f7070432a671e2d8',
      comments: [
        {
          authorGoogleId: 'SEED_003', // Dr. Villanueva
          body: "Thanks for sharing this! The link between nutrition and cognitive development is so well-established pero somehow it still doesnt get the policy attention it deserves. Sa mga schools na pinapasukan namin for research, you can literally see the difference — kids who come to school without breakfast have lower attention spans and test scores. The school feeding program helps pero its not reaching all schools consistently.",
        },
        {
          authorGoogleId: 'SEED_001', // Dr. Reyes
          body: "This is why the First 1000 Days framework is so important. By the time a child enters school at age 5-6, if they've been chronically malnourished since infancy, the cognitive damage is already partially irreversible. We need to invest much earlier — maternal nutrition during pregnancy, exclusive breastfeeding for 6 months, and adequate complementary feeding from 6-23 months. School interventions are important pero they're not enough if we miss that early window.",
        },
      ],
    },

    // ── 12. "Interesting Paper on Agricultural Expansion and Business" ──
    // Paper: Operational Policy Needs for Organic Agriculture Expansion, vegetables, certification/labeling
    // Org: College of Agriculture and Food Science
    {
      postId: '69c15b44f7070432a671e049',
      comments: [
        {
          authorGoogleId: 'SEED_006', // Prof. Bautista
          body: "The policy analysis here is solid. The gap between the 5% target and the actual 0.7% organic land area really shows how far behind we are. Whats interesting is the focus on vegetables — that's actually the most promising entry point for organic expansion kasi the price premiums are higher for organic vegetables than for organic rice, so the economics make more sense for farmers.",
        },
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
  // Build user lookup
  const allUsers = await User.find({}).lean();
  const userByGoogleId = {};
  for (const u of allUsers) userByGoogleId[u.googleId] = u;

  // Check for existing seeded comments (by authorId being a SEED_ user)
  const seedUserIds = allUsers.filter(u => u.googleId?.startsWith('SEED_')).map(u => u._id);
  const existingSeeded = await Comment.find({ authorId: { $in: seedUserIds } }).lean();
  if (existingSeeded.length > 0) {
    console.log(`Found ${existingSeeded.length} existing seeded comments.`);
    console.log('Run with --rollback first to clean up, or skip this phase.');
    return;
  }

  const commentDefs = getCommentDefinitions();
  let totalCreated = 0;

  console.log('=== Creating Comments ===\n');

  for (const postDef of commentDefs) {
    const postId = new mongoose.Types.ObjectId(postDef.postId);
    const post = await Post.findById(postId).lean();
    if (!post) {
      console.log(`  WARNING: Post ${postDef.postId} not found, skipping.`);
      continue;
    }

    console.log(`  Post: "${post.title.substring(0, 60)}..."`);

    for (const commentDef of postDef.comments) {
      const author = userByGoogleId[commentDef.authorGoogleId];
      if (!author) {
        console.log(`    WARNING: Author "${commentDef.authorGoogleId}" not found, skipping.`);
        continue;
      }

      // Create top-level comment
      const comment = await Comment.create({
        postId,
        authorId: author._id,
        body: commentDef.body,
        parentId: null,
      });
      totalCreated++;
      console.log(`    Comment by ${author.displayName} (${comment._id})`);

      // Increment post commentCount
      await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

      // Create replies if any
      if (commentDef.replies) {
        for (const replyDef of commentDef.replies) {
          const replyAuthor = userByGoogleId[replyDef.authorGoogleId];
          if (!replyAuthor) {
            console.log(`      WARNING: Reply author "${replyDef.authorGoogleId}" not found, skipping.`);
            continue;
          }

          const reply = await Comment.create({
            postId,
            authorId: replyAuthor._id,
            body: replyDef.body,
            parentId: comment._id,
            replyToUser: replyDef.replyToUser || null,
          });
          totalCreated++;
          console.log(`      Reply by ${replyAuthor.displayName} -> ${replyDef.replyToUser || 'parent'} (${reply._id})`);

          // Increment post commentCount
          await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total comments created: ${totalCreated}`);

  // Verify comment counts
  console.log('\nPost comment counts (updated):');
  for (const postDef of commentDefs) {
    const post = await Post.findById(postDef.postId).lean();
    if (post) {
      const actualCount = await Comment.countDocuments({ postId: post._id });
      console.log(`  "${post.title.substring(0, 50)}..." — commentCount: ${post.commentCount}, actual: ${actualCount}`);
    }
  }
}

async function rollback() {
  console.log('=== Rolling Back Phase 4 Comments ===\n');

  const seedUsers = await User.find({ googleId: /^SEED_/ }).lean();
  const seedUserIds = seedUsers.map(u => u._id);

  const seededComments = await Comment.find({ authorId: { $in: seedUserIds } }).lean();
  if (seededComments.length === 0) {
    console.log('No seeded comments found. Nothing to rollback.');
    return;
  }

  // Group by post to decrement commentCount
  const postCommentCounts = {};
  for (const c of seededComments) {
    const pid = c.postId.toString();
    postCommentCounts[pid] = (postCommentCounts[pid] || 0) + 1;
  }

  // Delete comments
  for (const comment of seededComments) {
    await Comment.deleteOne({ _id: comment._id });
  }
  console.log(`Deleted ${seededComments.length} comments.`);

  // Decrement post commentCounts
  for (const [postId, count] of Object.entries(postCommentCounts)) {
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -count } });
    console.log(`  Decremented commentCount by ${count} for post ${postId}`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
