/**
 * Phase 2: Create research papers with PDFs uploaded to DigitalOcean Spaces
 *
 * Run: node scripts/seed-phase2.js
 * Rollback: node scripts/seed-phase2.js --rollback
 */

// dotenv must be loaded before any module that reads process.env at import time
import dotenv from 'dotenv';
dotenv.config();

// Dynamic imports to ensure env vars are available when S3 client initializes
const { default: mongoose } = await import('mongoose');
const { default: PDFDocument } = await import('pdfkit');
const { default: User } = await import('../models/user_model.js');
const { default: Organization } = await import('../models/organization_model.js');
const { default: Paper } = await import('../models/paper_model.js');
const { uploadToSpaces, deleteFromSpaces, keyFromUrl } = await import('../lib/spaces.js');

const ROLLBACK = process.argv.includes('--rollback');

// ─── Helper: Generate a professional-looking research paper PDF ───

function generatePaperPDF(paper) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 72 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.font('Helvetica-Bold').fontSize(16)
      .text(paper.title, { align: 'center' });
    doc.moveDown(0.5);

    // Authors
    doc.font('Helvetica').fontSize(11)
      .text(paper.authors.join(', '), { align: 'center' });
    doc.moveDown(0.3);

    // Journal + Year
    doc.font('Helvetica-Oblique').fontSize(10)
      .text(`${paper.journal} (${paper.year})`, { align: 'center' });

    if (paper.doi) {
      doc.font('Helvetica').fontSize(9)
        .text(`DOI: ${paper.doi}`, { align: 'center' });
    }

    doc.moveDown(1);

    // Horizontal rule
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(1);

    // Abstract
    doc.font('Helvetica-Bold').fontSize(11).text('Abstract');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10)
      .text(paper.abstract, { align: 'justify', lineGap: 3 });
    doc.moveDown(0.8);

    // Keywords
    doc.font('Helvetica-Bold').fontSize(10).text('Keywords: ', { continued: true });
    doc.font('Helvetica').fontSize(10)
      .text(paper.keywords.join(', '));
    doc.moveDown(1.5);

    // Horizontal rule
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(1);

    // Introduction section
    doc.font('Helvetica-Bold').fontSize(12).text('1. Introduction');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10)
      .text(paper.introText, { align: 'justify', lineGap: 3 });
    doc.moveDown(1);

    // Methodology section
    doc.font('Helvetica-Bold').fontSize(12).text('2. Methodology');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10)
      .text(paper.methodText, { align: 'justify', lineGap: 3 });
    doc.moveDown(1);

    // Results section
    doc.font('Helvetica-Bold').fontSize(12).text('3. Results and Discussion');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10)
      .text(paper.resultsText, { align: 'justify', lineGap: 3 });
    doc.moveDown(1);

    // Conclusion section
    doc.font('Helvetica-Bold').fontSize(12).text('4. Conclusion');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10)
      .text(paper.conclusionText, { align: 'justify', lineGap: 3 });
    doc.moveDown(1.5);

    // References header
    doc.font('Helvetica-Bold').fontSize(12).text('References');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9);
    for (const ref of paper.references) {
      doc.text(ref, { lineGap: 2 });
      doc.moveDown(0.2);
    }

    doc.end();
  });
}

// ─── Paper Definitions ───

function getPaperDefinitions() {
  return [
    {
      paperNum: 1,
      title: 'Prevalence of Stunting Among Filipino Children Under Five: Evidence from the 2018-2019 Expanded National Nutrition Survey',
      authors: ['Maria Lourdes Reyes', 'Angela Mae Villanueva'],
      abstract: 'This study examines the prevalence and determinants of stunting among Filipino children aged 0-59 months using data from the 2018-2019 Expanded National Nutrition Survey (ENNS). Results show 28.8% stunting prevalence with significant disparities between urban and rural areas in Luzon, Visayas, and Mindanao. Key risk factors include low household income, maternal education, and inadequate dietary diversity.',
      journal: 'Philippine Journal of Nutrition',
      year: 2023,
      keywords: ['stunting', 'malnutrition', 'Filipino children', 'ENNS', 'nutrition survey'],
      doi: '10.55556/pjn.2023.0142',
      orgSlug: 'ihnf',
      authorGoogleId: 'SEED_001',
      introText: 'Stunting remains one of the most significant public health challenges facing the Philippines. Defined as height-for-age below minus two standard deviations from the WHO Child Growth Standards median, stunting reflects chronic undernutrition and has long-term consequences for cognitive development, school performance, and economic productivity. The Philippines has consistently recorded stunting prevalence rates above the global average, prompting national and local government interventions through various nutrition programs. Despite decades of effort, progress has been slow and uneven across regions.',
      methodText: 'This study utilized secondary data from the 2018-2019 Expanded National Nutrition Survey (ENNS), a nationally representative cross-sectional survey conducted by the Food and Nutrition Research Institute (FNRI) of the Department of Science and Technology. The analysis included anthropometric measurements of 25,460 children aged 0-59 months. Stunting was assessed using WHO Anthro software. Multivariate logistic regression was employed to identify determinants, controlling for child age, sex, birth order, household income quintile, maternal education, dietary diversity score, access to improved water and sanitation, and geographic region.',
      resultsText: 'Overall stunting prevalence was 28.8% (95% CI: 27.4-30.2). Prevalence was significantly higher in rural areas (33.1%) compared to urban areas (23.7%, p<0.001). By island group, Mindanao recorded the highest prevalence at 35.2%, followed by Visayas (29.8%) and Luzon (25.4%). Children in the lowest income quintile had 2.8 times higher odds of stunting compared to the highest quintile (AOR=2.83, 95% CI: 2.21-3.62). Maternal education below secondary level was associated with 1.9 times higher odds (AOR=1.92, 95% CI: 1.58-2.33). Low dietary diversity score (<4 food groups) increased odds by 1.6 times.',
      conclusionText: 'Stunting among Filipino children under five remains a critical public health concern with pronounced geographic and socioeconomic disparities. Interventions must be targeted toward rural communities, particularly in Mindanao, with emphasis on improving household income, maternal education, and dietary diversity. Multi-sectoral approaches integrating health, agriculture, education, and social protection are needed to address the complex determinants of stunting in the Philippine context.',
      references: [
        '[1] FNRI-DOST. (2020). Philippine Nutrition Facts and Figures: 2018-2019 Expanded National Nutrition Survey. Taguig City.',
        '[2] WHO. (2006). WHO Child Growth Standards: Length/height-for-age. Geneva: World Health Organization.',
        '[3] Black, R.E. et al. (2013). Maternal and child undernutrition and overweight in low-income and middle-income countries. The Lancet, 382(9890), 427-451.',
        '[4] Perlas, L.A. et al. (2019). Nutritional status of Filipino children and other population groups. Philippine Journal of Science, 148(4), 729-738.',
        '[5] Capanzana, M.V. et al. (2018). Determinants of stunting among Filipino preschool children. Philippine Journal of Nutrition, 65(1), 1-12.',
      ],
    },
    {
      paperNum: 2,
      title: 'Iron Deficiency Anemia Among Pregnant Filipino Women: Prevalence, Dietary Correlates, and Supplementation Adherence',
      authors: ['Maria Lourdes Reyes', 'Sofia Carmen Aquino'],
      abstract: 'A cross-sectional study assessing iron deficiency anemia (IDA) prevalence among pregnant women in selected provinces of Laguna and Quezon. Using hemoglobin and serum ferritin measurements from 850 participants, the study found 26.2% IDA prevalence. Dietary assessment revealed inadequate iron-rich food consumption and low adherence to iron supplementation programs.',
      journal: 'Acta Medica Philippina',
      year: 2022,
      keywords: ['iron deficiency anemia', 'pregnancy', 'Philippines', 'supplementation', 'maternal health'],
      doi: '10.47895/amp.v56i12.4892',
      orgSlug: 'ihnf',
      authorGoogleId: 'SEED_001',
      introText: 'Iron deficiency anemia (IDA) during pregnancy is a major contributor to maternal morbidity and adverse birth outcomes in the Philippines. The condition affects oxygen transport to fetal tissues, increasing risks of preterm delivery, low birth weight, and maternal mortality. Despite the Department of Health\'s iron supplementation program providing free iron-folic acid tablets to pregnant women through barangay health stations, adherence remains suboptimal. Understanding the dietary patterns and barriers to supplementation among pregnant Filipino women is crucial for designing effective interventions.',
      methodText: 'A cross-sectional study was conducted among 850 pregnant women (all trimesters) attending prenatal care at rural health units and barangay health stations in Laguna and Quezon provinces from January to December 2021. Blood samples were collected for hemoglobin (cyanmethemoglobin method) and serum ferritin (ELISA) analysis. IDA was defined as hemoglobin <11 g/dL with serum ferritin <15 ng/mL. Dietary intake was assessed using 24-hour food recall (2 non-consecutive days) and a food frequency questionnaire focused on iron-rich foods. Supplementation adherence was assessed via structured interview.',
      resultsText: 'IDA prevalence was 26.2% (n=223), with highest rates in the third trimester (31.4%). Mean dietary iron intake was 8.2 mg/day, well below the recommended 27 mg/day for pregnant women. Only 34% of women consumed iron-rich animal-source foods (liver, red meat, shellfish) at least twice per week. While 89% of participants had received iron-folic acid supplements from their health center, only 42% reported taking them daily as prescribed. Common reasons for non-adherence included nausea/side effects (56%), forgetfulness (28%), and beliefs about supplements being unnecessary if eating well (16%).',
      conclusionText: 'IDA remains prevalent among pregnant Filipino women in Calabarzon, driven by inadequate dietary iron intake and poor supplementation adherence. Interventions should combine nutrition education emphasizing iron-rich local foods with strategies to improve supplement tolerance and adherence. Community health workers play a critical role in follow-up and counseling. Future studies should evaluate the effectiveness of alternative supplementation strategies such as intermittent dosing and micronutrient powders.',
      references: [
        '[1] WHO. (2015). The global prevalence of anaemia in 2011. Geneva: World Health Organization.',
        '[2] DOH. (2019). National Objectives for Health Philippines 2017-2022. Manila: Department of Health.',
        '[3] Angeles-Agdeppa, I. et al. (2019). Dietary iron intake and food sources of Filipino pregnant women. Nutrition Journal, 18(1), 56.',
        '[4] Pasricha, S.R. et al. (2013). Control of iron deficiency anemia in low- and middle-income countries. Blood, 121(14), 2607-2617.',
      ],
    },
    {
      paperNum: 3,
      title: 'Dietary Diversity and Nutritional Status of Indigenous Aeta Communities in Zambales, Philippines',
      authors: ['Maria Lourdes Reyes', 'Juan Carlos Bautista'],
      abstract: 'This ethnographic nutrition study examines dietary diversity scores and anthropometric indicators among Aeta communities in Zambales, Philippines. Results indicate lower dietary diversity compared to non-indigenous populations, with heavy reliance on root crops and foraged foods. The study recommends culturally sensitive nutrition interventions that integrate traditional food knowledge.',
      journal: 'Food and Nutrition Bulletin',
      year: 2023,
      keywords: ['indigenous peoples', 'Aeta', 'dietary diversity', 'food security', 'Philippines'],
      doi: '10.1177/03795721231165',
      orgSlug: 'ihnf',
      authorGoogleId: 'SEED_001',
      introText: 'Indigenous peoples in the Philippines, collectively known as IPs, face persistent food insecurity and malnutrition rooted in historical marginalization, land dispossession, and limited access to public services. The Aeta, one of the oldest indigenous groups in the Philippines, reside primarily in the mountainous regions of Zambales, Pampanga, and Tarlac in Central Luzon. Their traditional food system, once centered on hunting, gathering, and swidden agriculture, has been disrupted by environmental degradation, particularly the 1991 Mount Pinatubo eruption, and encroachment on ancestral lands.',
      methodText: 'An ethnographic nutrition study was conducted in five Aeta communities in Zambales Province from March to August 2022. The study combined quantitative dietary assessment (n=180 households, using the Minimum Dietary Diversity for Women indicator and 24-hour recall) with qualitative methods (12 focus group discussions, 25 key informant interviews, and participant observation of food procurement and preparation). Anthropometric measurements were taken for children under 5 (n=94) and women of reproductive age (n=112). A comparison group of 60 lowland non-indigenous households in adjacent barangays was included.',
      resultsText: 'Mean dietary diversity score among Aeta women was 3.8 food groups (out of 10), compared to 5.4 in the lowland comparison group (p<0.001). Only 28% of Aeta women met the minimum dietary diversity threshold of 5 food groups, versus 62% in the comparison group. The Aeta diet was dominated by starchy staples (camote, cassava, rice) and dark green leafy vegetables, with limited consumption of animal-source foods. However, qualitative data revealed that Aeta communities utilize at least 47 species of wild edible plants not commonly consumed by lowland populations, providing important micronutrient contributions during lean months.',
      conclusionText: 'Aeta communities in Zambales experience lower dietary diversity and higher malnutrition rates compared to non-indigenous populations. However, their traditional food knowledge represents a valuable but underutilized nutritional resource. Nutrition interventions targeting Aeta communities should adopt a rights-based, culturally sensitive approach that respects and integrates indigenous food systems rather than replacing them with externally imposed dietary models.',
      references: [
        '[1] Eder, J.F. (2007). On the Road to Tribal Extinction: Depopulation, Deculturation, and Adaptive Well-being among the Batak of the Philippines. University of California Press.',
        '[2] FAO. (2009). Indigenous Peoples\' Food Systems: The many dimensions of culture, diversity and environment for nutrition and health. Rome.',
        '[3] Shimizu, H. (1989). Pinatubo Aytas: Continuity and change. Quezon City: Ateneo de Manila University Press.',
        '[4] NCIP. (2020). Philippine Indigenous Peoples Ethnography. National Commission on Indigenous Peoples.',
      ],
    },
    {
      paperNum: 4,
      title: 'Biofortification of Rice with Zinc and Iron Under Philippine Lowland Conditions: Agronomic Performance and Consumer Acceptance',
      authors: ['Ricardo Dela Cruz', 'Paolo Miguel Torres'],
      abstract: 'Field trials of zinc- and iron-biofortified rice varieties (NSIC Rc 460 and Rc 480) were conducted across three seasons in Laguna, Philippines. Grain zinc concentrations reached 28-32 ppm compared to 16 ppm in conventional varieties. Agronomic performance was comparable, with yields of 4.8-5.2 t/ha. Consumer acceptance testing among 200 Filipino households showed no significant difference in taste preference.',
      journal: 'Philippine Journal of Crop Science',
      year: 2023,
      keywords: ['biofortification', 'rice', 'zinc', 'iron', 'Philippines', 'food security'],
      doi: '10.55556/pjcs.2023.0098',
      orgSlug: 'college-of-agriculture-and-food-science',
      authorGoogleId: 'SEED_002',
      introText: 'Hidden hunger — micronutrient deficiency without caloric insufficiency — affects an estimated 2 billion people globally, with zinc and iron deficiency being the most prevalent forms in Southeast Asia. In the Philippines, where rice provides 60-70% of daily caloric intake for low-income households, biofortification of rice represents a promising strategy to deliver essential micronutrients through a staple food without requiring changes in dietary behavior. The International Rice Research Institute (IRRI) and Philippine Rice Research Institute (PhilRice) have developed several biofortified rice lines, but field validation under Philippine conditions remains limited.',
      methodText: 'Multi-location field trials were conducted at the UPLB Central Experiment Station in Laguna across three consecutive cropping seasons (2021 wet season, 2022 dry season, 2022 wet season). Two zinc-biofortified varieties (NSIC Rc 460, NSIC Rc 480) and one conventional check variety (NSIC Rc 222) were evaluated in a randomized complete block design with four replications. Grain mineral content was analyzed using inductively coupled plasma optical emission spectrometry (ICP-OES). Consumer acceptance was assessed through central-location test with 200 households in Bay and Los Banos municipalities using cooked rice samples with 9-point hedonic scale.',
      resultsText: 'Mean grain zinc concentrations across seasons were 28.4 ppm (Rc 460) and 31.7 ppm (Rc 480), compared to 15.8 ppm in the conventional check. Iron concentrations were 9.2 ppm and 11.4 ppm respectively, versus 7.1 ppm in the check. Grain yield was not significantly different among varieties, ranging from 4.8 to 5.2 t/ha (p=0.34). Consumer acceptance scores for appearance, aroma, taste, and overall acceptability showed no significant differences between biofortified and conventional varieties (p>0.05 for all attributes). Retention analysis showed 85% zinc retention after cooking.',
      conclusionText: 'Zinc- and iron-biofortified rice varieties can be successfully grown under Philippine lowland conditions without yield penalty, and are well-accepted by Filipino consumers. These varieties offer a sustainable, cost-effective approach to reducing hidden hunger, particularly in rice-dependent rural communities. Scaling biofortified rice through the Philippine seed system and integrating it into national food security programs should be prioritized.',
      references: [
        '[1] Bouis, H.E. & Saltzman, A. (2017). Improving nutrition through biofortification. Global Food Security, 12, 49-57.',
        '[2] PhilRice. (2021). Rice-Based Biosystems Journal. Science City of Munoz.',
        '[3] HarvestPlus. (2020). Biofortified Rice in Asia: Progress and Prospects. Washington, DC.',
        '[4] Vergara, G.V. et al. (2018). Zinc-biofortified rice in the Philippines. Philippine Journal of Crop Science, 43(2), 45-52.',
      ],
    },
    {
      paperNum: 5,
      title: 'Post-Harvest Losses of Highland Vegetables in the Benguet to Metro Manila Supply Chain',
      authors: ['Ricardo Dela Cruz'],
      abstract: 'Quantitative assessment of post-harvest losses in the highland vegetable supply chain from Benguet to Metro Manila. The study tracked cabbage, carrots, and lettuce across farm gate, trading post, wholesale, and retail stages. Total losses ranged from 25-40% by weight, with mechanical damage during transport being the primary cause. Cold chain gaps at trading posts accounted for 12% of total losses.',
      journal: 'Philippine Agricultural Scientist',
      year: 2024,
      keywords: ['post-harvest losses', 'vegetables', 'supply chain', 'Benguet', 'cold chain'],
      doi: '10.55556/pas.2024.0076',
      orgSlug: 'college-of-agriculture-and-food-science',
      authorGoogleId: 'SEED_002',
      introText: 'The Cordillera Administrative Region, particularly Benguet Province, is the primary source of temperate and semi-temperate vegetables for Metro Manila and other urban centers in Luzon. The La Trinidad Vegetable Trading Post serves as the main consolidation point, handling an estimated 300-400 metric tons of vegetables daily. However, the extended supply chain from highland farms to urban retail markets involves multiple handling stages, long transport distances over mountainous terrain, and limited cold storage facilities, resulting in substantial post-harvest losses that reduce farmer income and food availability.',
      methodText: 'A supply chain tracking study was conducted from June to November 2023, covering wet and dry season conditions. Three vegetable commodities — cabbage (n=60 lots), carrots (n=60 lots), and lettuce (n=40 lots) — were tracked from farm gate in Atok, Buguias, and Mankayan municipalities through the La Trinidad Trading Post, Divisoria wholesale market, and selected retail outlets in Metro Manila. Weight measurements and quality grading were performed at each node. Temperature data loggers were placed in transport vehicles and storage areas. Semi-structured interviews with 40 farmers, 15 traders, and 20 retailers documented handling practices and loss perceptions.',
      resultsText: 'Total post-harvest losses from farm gate to retail were: cabbage 25.3%, carrots 31.7%, and lettuce 39.8%. The transport stage from Benguet to Manila (6-10 hours) accounted for the largest share of losses: 38% for cabbage, 42% for carrots, and 45% for lettuce, primarily due to mechanical damage from overloading and rough handling. Temperature monitoring revealed that vegetables experienced ambient temperatures of 28-35°C for an average of 14 hours during transit and at trading posts, compared to recommended 4-8°C for these commodities. Cold storage was available at only 2 of 8 trading post facilities surveyed.',
      conclusionText: 'Post-harvest losses in the Benguet highland vegetable supply chain are substantial and primarily driven by inadequate transport practices and cold chain infrastructure gaps. Reducing these losses requires investment in improved packaging, standardized crating systems, temperature-controlled transport, and cold storage at trading posts. These interventions would simultaneously improve farmer incomes and increase vegetable availability for urban consumers, contributing to food security and nutrition outcomes.',
      references: [
        '[1] Rapusas, R.S. et al. (2017). Postharvest losses in the Philippine vegetable supply chain. ACIAR Proceedings.',
        '[2] DA-BAR. (2020). Philippine Vegetable Industry Roadmap 2021-2025. Quezon City.',
        '[3] Kitinoja, L. (2013). Use of cold chains for reducing food losses in developing countries. PEF White Paper 13-03.',
        '[4] BAS-DA. (2023). Vegetables: Volume of Production by Region. Philippine Statistics Authority.',
      ],
    },
    {
      paperNum: 6,
      title: 'Aflatoxin Contamination in Corn and Peanut Products Sold in Wet Markets of Calabarzon and Central Luzon',
      authors: ['Ricardo Dela Cruz', 'Maria Lourdes Reyes'],
      abstract: 'Survey of aflatoxin B1 levels in corn and peanut products sold in wet markets across Calabarzon and Central Luzon. Of 320 samples, 18% exceeded the Philippine regulatory limit of 20 ppb. Peanut butter products showed the highest contamination rates (34%). Seasonal variation was observed with higher levels during wet season storage. The study highlights the need for improved drying and storage practices among smallholder farmers.',
      journal: 'Food Control',
      year: 2023,
      keywords: ['aflatoxin', 'food safety', 'corn', 'peanuts', 'Philippines', 'mycotoxin'],
      doi: '10.1016/j.foodcont.2023.109876',
      orgSlug: 'college-of-agriculture-and-food-science',
      authorGoogleId: 'SEED_002',
      introText: 'Aflatoxins are toxic secondary metabolites produced by Aspergillus flavus and A. parasiticus fungi that contaminate a wide range of agricultural commodities, particularly corn (maize) and peanuts. These mycotoxins are potent hepatocarcinogens classified as Group 1 carcinogens by IARC. The tropical climate of the Philippines — characterized by high temperature and humidity — creates optimal conditions for Aspergillus growth, particularly during storage. Corn and peanuts are widely consumed in the Philippines both as staple foods and processed products sold in traditional wet markets, where quality monitoring is limited.',
      methodText: 'A total of 320 samples were collected from 40 wet markets across Calabarzon (Cavite, Laguna, Batangas, Rizal, Quezon) and Central Luzon (Bulacan, Pampanga, Tarlac) during wet season (July-September 2022) and dry season (February-April 2023). Samples included raw corn grits (n=80), corn meal (n=40), raw peanuts (n=80), roasted peanuts (n=40), peanut butter (n=40), and cornick (n=40). Aflatoxin B1 was quantified using HPLC with fluorescence detection following immunoaffinity column cleanup. Results were compared against the Philippine regulatory limit of 20 ppb for total aflatoxins.',
      resultsText: 'Overall, 18.1% (58/320) of samples exceeded the 20 ppb regulatory limit. By product type, peanut butter had the highest violation rate at 34% (14/40), followed by raw peanuts at 25% (20/80), corn grits at 15% (12/80), and cornick at 10% (4/40). Mean aflatoxin B1 concentrations were significantly higher in wet season samples (14.8 ppb) compared to dry season (8.3 ppb, p<0.01). Among positive samples, concentrations ranged from 5.2 to 187 ppb, with the highest levels found in peanut butter from small-scale processors. Market type analysis showed that products from roadside vendors had 2.1 times higher contamination than those from established market stalls.',
      conclusionText: 'Aflatoxin contamination in corn and peanut products in Philippine wet markets is a significant food safety concern, with nearly one-fifth of samples exceeding regulatory limits. The high contamination rates in peanut butter and raw peanuts warrant targeted interventions including training on proper drying to 8-10% moisture content, use of hermetic storage bags, and regular monitoring by FDA regional offices. Consumer awareness campaigns about proper food storage at household level should complement supply-side interventions.',
      references: [
        '[1] IARC. (2012). Aflatoxins. IARC Monographs on the Evaluation of Carcinogenic Risks to Humans, 100F.',
        '[2] Acuin, C.S. et al. (2018). Aflatoxin exposure in the Philippines: A review. Food Additives & Contaminants, 35(1), 44-56.',
        '[3] FDA Philippines. (2013). Administrative Order No. 2013-0009: Guidelines on Maximum Levels of Contaminants in Food.',
        '[4] Villar, E.M. et al. (2020). Drying practices and mycotoxin contamination in Philippine corn. Philippine Agricultural Scientist, 103(2), 145-155.',
      ],
    },
    {
      paperNum: 7,
      title: 'Household Food Security and Coping Strategies During COVID-19 Lockdowns in Rural Laguna',
      authors: ['Angela Mae Villanueva', 'Sofia Carmen Aquino'],
      abstract: 'Mixed-methods study of household food security impacts during COVID-19 lockdowns in 12 barangays of Laguna Province. Using the Household Food Insecurity Access Scale (HFIAS), 62% of households experienced moderate to severe food insecurity. Common coping strategies included dietary modification (78%), borrowing food (45%), and reliance on community pantries (38%). The study underscores the vulnerability of informal sector workers to food supply disruptions.',
      journal: 'Philippine Journal of Social Development',
      year: 2022,
      keywords: ['food security', 'COVID-19', 'coping strategies', 'rural Philippines', 'Laguna'],
      doi: '10.55556/pjsd.2022.0034',
      orgSlug: 'college-of-human-ecology',
      authorGoogleId: 'SEED_003',
      introText: 'The COVID-19 pandemic and associated lockdown measures severely disrupted food systems worldwide. In the Philippines, the Enhanced Community Quarantine (ECQ) imposed in March 2020 restricted mobility, closed wet markets and food establishments, and disrupted agricultural supply chains. While national-level assessments documented the pandemic\'s economic impact, community-level understanding of how rural households experienced and coped with food insecurity during lockdowns remains limited. Laguna Province, located in the Calabarzon region adjacent to Metro Manila, experienced stringent quarantine measures while being dependent on both local agriculture and supply chains from other provinces.',
      methodText: 'A mixed-methods study was conducted in 12 barangays across four municipalities of Laguna Province (San Pablo, Nagcarlan, Liliw, and Pagsanjan) from October to December 2021, covering the period of retrospective recall for ECQ and MECQ experiences. Quantitative data were collected from 480 households using the Household Food Insecurity Access Scale (HFIAS), socio-demographic questionnaire, and coping strategies index. Qualitative data were gathered through 8 focus group discussions (n=64 participants) and 24 key informant interviews with barangay nutrition scholars, health workers, and local officials.',
      resultsText: 'Using the HFIAS, 62.1% of households experienced moderate (38.5%) or severe (23.6%) food insecurity during the strictest quarantine period. Informal sector workers (vendors, construction workers, tricycle drivers) had 3.4 times higher odds of severe food insecurity compared to salaried employees (AOR=3.42, p<0.001). The most prevalent coping strategies were: reducing meal portion sizes (78%), switching to cheaper/less preferred foods (72%), borrowing food from relatives (45%), relying on community pantries (38%), and reducing the number of meals per day (31%). Community pantries, which emerged as a grassroots response, were cited by participants as critical safety nets, particularly during the first two months of ECQ.',
      conclusionText: 'The COVID-19 lockdowns exposed deep vulnerabilities in household food security in rural Laguna, particularly among informal sector workers who lacked social protection coverage. Community pantries and barangay-level food assistance emerged as important but insufficient responses. Strengthening local food systems resilience, expanding social protection coverage to informal workers, and pre-positioning emergency food supplies at the barangay level should be priorities for pandemic preparedness and food security planning.',
      references: [
        '[1] Coates, J. et al. (2007). Household Food Insecurity Access Scale (HFIAS) for Measurement of Food Access. FANTA III.',
        '[2] NEDA. (2021). Socioeconomic Impact Assessment of COVID-19 in the Philippines. Pasig City.',
        '[3] Bello, A.L. et al. (2021). Community pantries in the Philippines: Solidarity in crisis. Philippine Sociological Review, 69, 127-148.',
        '[4] PSA. (2021). Impacts of COVID-19 on employment and food security. Philippine Statistics Authority.',
      ],
    },
    {
      paperNum: 8,
      title: 'Effectiveness of a School-Based Nutrition Education Intervention on Dietary Knowledge and Vegetable Consumption Among Filipino Elementary Students',
      authors: ['Angela Mae Villanueva'],
      abstract: 'A quasi-experimental study evaluating a 12-week nutrition education program in 8 public elementary schools in Batangas. The intervention included classroom modules, cooking demonstrations, and school garden activities. Post-intervention, nutrition knowledge scores improved by 34%, and vegetable consumption frequency increased from 2.1 to 3.8 times per week. The program was most effective when parents were included in take-home activities.',
      journal: 'Philippine Journal of Education',
      year: 2024,
      keywords: ['nutrition education', 'school nutrition', 'Philippines', 'dietary behavior', 'intervention'],
      doi: '10.55556/pje.2024.0051',
      orgSlug: 'college-of-human-ecology',
      authorGoogleId: 'SEED_003',
      introText: 'School-based nutrition education is widely recognized as an effective strategy for promoting healthy eating habits among children, with potential for sustained impact through adulthood. In the Philippines, the Department of Education integrates nutrition topics into the Health and Edukasyon sa Pagpapakatao (EsP) curriculum, but implementation varies widely in quality and depth. Low vegetable consumption among Filipino children — averaging only 110g per day versus the WHO-recommended 400g — contributes to micronutrient deficiencies and the growing burden of diet-related non-communicable diseases.',
      methodText: 'A quasi-experimental pretest-posttest design with control group was implemented in 8 public elementary schools in Batangas Province (4 intervention, 4 control) from June to September 2023. The 12-week intervention included: weekly 45-minute classroom nutrition modules using interactive activities, monthly cooking demonstrations using locally available vegetables, school garden activities (planting, maintenance, harvesting), and bi-weekly take-home activity sheets for parent involvement. Participants were Grade 4-6 students (intervention n=240, control n=220). Outcomes were measured using a validated nutrition knowledge test (30 items) and a food frequency questionnaire for vegetable consumption.',
      resultsText: 'At baseline, nutrition knowledge scores and vegetable consumption did not differ significantly between groups (p>0.05). Post-intervention, the intervention group showed a 34% increase in mean nutrition knowledge score (from 14.2 to 19.0 out of 30), while the control group showed only 4% increase (14.5 to 15.1, p<0.001 for group difference). Vegetable consumption frequency increased from 2.1 to 3.8 times per week in the intervention group versus 2.0 to 2.3 in controls. Subgroup analysis revealed that students whose parents participated in take-home activities (68% of intervention group) showed significantly greater improvements in both knowledge (+41%) and consumption (+2.2 times/week) compared to those without parental engagement.',
      conclusionText: 'A multi-component school-based nutrition education program significantly improved dietary knowledge and vegetable consumption among Filipino elementary students. The critical role of parental involvement suggests that school nutrition programs should systematically incorporate family engagement strategies. Scaling this model through the DepEd Gulayan sa Paaralan program could amplify its impact on child nutrition nationally.',
      references: [
        '[1] DepEd. (2017). Gulayan sa Paaralan Program Guidelines. Department of Education, Philippines.',
        '[2] FNRI. (2020). Philippine Nutrition Facts and Figures: Dietary Survey. Taguig City.',
        '[3] Dudley, D.A. et al. (2015). A systematic review of the effectiveness of nutrition education programs. British Journal of Nutrition, 114(9), 1427-1436.',
        '[4] Acuin, C.E. et al. (2017). Diet diversity and nutritional status of Filipino children. Maternal & Child Nutrition, 13(4).',
      ],
    },
    {
      paperNum: 9,
      title: 'Rice Price Volatility and Household Nutrition Outcomes in the Philippines: Evidence from the Rice Tariffication Era',
      authors: ['Sofia Carmen Aquino', 'Juan Carlos Bautista'],
      abstract: 'Panel data analysis of rice price fluctuations and their impact on household dietary quality using Philippine Statistics Authority data from 2015-2023. A 10% increase in rice prices was associated with a 4.2% reduction in dietary diversity scores among bottom-quintile households. The rice tariffication law (RA 11203) initially reduced prices but subsequent global supply shocks offset gains. Policy simulations suggest targeted food vouchers are more cost-effective than price subsidies.',
      journal: 'Asian Journal of Agriculture and Development',
      year: 2024,
      keywords: ['rice prices', 'food security', 'tariffication', 'Philippines', 'nutrition economics'],
      doi: '10.37801/ajad2024.21.1.4',
      orgSlug: 'college-of-economics-and-management',
      authorGoogleId: 'SEED_005',
      introText: 'Rice is the dietary cornerstone of the Philippines, accounting for approximately 35% of total caloric intake and consuming 20-30% of household food budgets among low-income families. The enactment of the Rice Tariffication Law (Republic Act 11203) in 2019 replaced quantitative import restrictions with tariffs, aiming to reduce consumer rice prices through market liberalization. While the law successfully lowered average retail rice prices by 7-10% in its first year, the COVID-19 pandemic and the Russia-Ukraine conflict subsequently disrupted global grain markets, raising questions about the sustained impact on household food security.',
      methodText: 'This study employed panel data econometrics using quarterly household income and expenditure data from the Philippine Statistics Authority (PSA) Family Income and Expenditure Survey (FIES) for 2015, 2018, and 2021, supplemented with monthly PSA retail rice price monitoring data from 2015-2023. A fixed-effects instrumental variable model was estimated, using international rice prices (Thai 5% broken) as instruments for domestic rice prices to address endogeneity. Dietary diversity was measured using the Household Dietary Diversity Score (HDDS). The analysis covered approximately 40,000 household observations across all 17 regions.',
      resultsText: 'A 10% increase in real retail rice prices was associated with a 4.2% reduction in HDDS among bottom-quintile households (p<0.01), but only a 1.1% reduction among top-quintile households (p=0.23). The rice tariffication law was associated with an initial 0.38-point increase in HDDS among bottom-quintile households (2019-2020), but this gain was fully offset by price increases in 2022-2023. Food expenditure substitution analysis showed that when rice prices increase, poor households reduce spending on vegetables (-8.3%), meat (-6.7%), and fruits (-5.1%). Policy simulations indicated that targeted food vouchers (1,500 PHP/month to bottom-quintile households) would improve HDDS by 0.82 points at a fiscal cost 40% lower than equivalent universal price subsidies.',
      conclusionText: 'Rice price volatility disproportionately affects the dietary quality of the poorest Filipino households, with the gains from rice tariffication proving vulnerable to global supply shocks. Food security policy should shift from price-focused interventions toward targeted, nutrition-sensitive social protection mechanisms such as food vouchers that can be adjusted for local dietary needs and price conditions.',
      references: [
        '[1] PSA. (2023). Family Income and Expenditure Survey 2021. Philippine Statistics Authority.',
        '[2] Balisacan, A.M. et al. (2020). The rice tariffication law: Early assessment. Philippine Review of Economics, 57(1), 1-25.',
        '[3] Headey, D. & Alderman, H. (2019). The relative caloric prices of healthy and unhealthy foods differ systematically across income levels and continents. Journal of Nutrition, 149(11), 2020-2033.',
        '[4] NNC. (2022). Philippine Plan of Action for Nutrition 2023-2028. National Nutrition Council.',
      ],
    },
    {
      paperNum: 10,
      title: 'Smallholder Farmer Livelihoods and Food Security in Bukidnon and Davao del Sur, Mindanao',
      authors: ['Sofia Carmen Aquino'],
      abstract: 'Livelihood analysis of 400 smallholder farming households in Bukidnon and Davao del Sur, Philippines. Despite agricultural engagement, 45% of households were food insecure, primarily due to land tenure insecurity, limited market access, and high input costs. Diversified farming systems (integrating livestock and vegetables with staple crops) were associated with 28% higher food security scores compared to monocropping households.',
      journal: 'Journal of Rural Studies',
      year: 2023,
      keywords: ['smallholder farmers', 'Mindanao', 'food security', 'livelihoods', 'diversified farming'],
      doi: '10.1016/j.jrurstud.2023.103052',
      orgSlug: 'college-of-economics-and-management',
      authorGoogleId: 'SEED_005',
      introText: 'Mindanao, the Philippines\' second-largest island group, produces approximately 40% of the country\'s food supply and is often referred to as the nation\'s "food basket." Paradoxically, several Mindanao provinces record the highest malnutrition and poverty rates in the country. Smallholder farmers, who operate on fewer than 3 hectares of land and constitute the majority of the agricultural labor force, face a complex web of challenges including fragmented land tenure, limited access to credit and agricultural extension services, conflict-related displacement, and vulnerability to typhoons and droughts.',
      methodText: 'A cross-sectional livelihood analysis was conducted among 400 smallholder farming households in Bukidnon (n=200) and Davao del Sur (n=200) from January to June 2022. Household food security was assessed using the Food Insecurity Experience Scale (FIES). Livelihood assets were measured using the Sustainable Livelihood Framework, covering natural, physical, financial, human, and social capital. Farming system typology was classified into monocropping, mixed cropping, and diversified systems (crops + livestock + vegetables). Multiple regression analysis was used to identify determinants of food security, controlling for household demographics, land tenure status, distance to markets, and access to agricultural extension.',
      resultsText: 'Overall, 45% of households were classified as food insecure (moderate: 28%, severe: 17%). Food insecurity was significantly higher among households with insecure land tenure (58%) compared to titled landowners (31%, p<0.001). Diversified farming households had mean FIES scores 28% lower (more food secure) than monocropping households (p<0.01), after controlling for covariates. Access to agricultural extension services (available to only 22% of households) was associated with 18% lower food insecurity. Key constraints cited by farmers included high fertilizer costs (mentioned by 82%), lack of irrigation (67%), and distance to nearest market >15km (45% of Bukidnon households).',
      conclusionText: 'Smallholder farmers in Mindanao face significant food insecurity despite being primary food producers, highlighting the "farmer\'s paradox" evident across developing countries. Policies promoting farm diversification, securing land tenure through CARP implementation, improving rural road infrastructure, and expanding agricultural extension coverage could significantly improve food security outcomes in these communities.',
      references: [
        '[1] PSA. (2022). Census of Agriculture and Fisheries 2022. Philippine Statistics Authority.',
        '[2] DFID. (1999). Sustainable Livelihoods Guidance Sheets. Department for International Development.',
        '[3] FAO. (2021). The State of Food Security and Nutrition in the World 2021. Rome.',
        '[4] Reyes, C.M. et al. (2019). Assessment of CARP in Mindanao. Philippine Institute for Development Studies.',
      ],
    },
    {
      paperNum: 11,
      title: 'The Philippine Plan of Action for Nutrition 2023-2028: A Policy Analysis Using Kingdon\'s Multiple Streams Framework',
      authors: ['Juan Carlos Bautista', 'Angela Mae Villanueva'],
      abstract: 'Critical analysis of the Philippine Plan of Action for Nutrition (PPAN) 2023-2028 using Kingdon\'s Multiple Streams Framework. The study identifies gaps in local government unit (LGU) implementation capacity, fragmented coordination among NNC, DOH, DSWD, and DA, and insufficient budget allocation for community-level nutrition programs. Recommendations include strengthened LGU nutrition action offices and unified monitoring systems.',
      journal: 'Philippine Journal of Public Administration',
      year: 2024,
      keywords: ['nutrition policy', 'PPAN', 'governance', 'Philippines', 'local government'],
      doi: '10.55556/pjpa.2024.0023',
      orgSlug: 'college-of-public-affair-and-development',
      authorGoogleId: 'SEED_006',
      introText: 'The Philippine Plan of Action for Nutrition (PPAN) serves as the country\'s primary policy framework for addressing malnutrition in all its forms. Now in its latest iteration for 2023-2028, the PPAN aims to reduce stunting to 20%, wasting to 3%, and overweight among children under 5 to 3% by 2028. The plan is coordinated by the National Nutrition Council (NNC) and implemented through a multi-agency framework involving the Department of Health, Department of Social Welfare and Development, Department of Agriculture, and local government units. However, past PPAN cycles have been criticized for falling short of targets, raising questions about the current plan\'s design and implementation feasibility.',
      methodText: 'This study applied Kingdon\'s Multiple Streams Framework (MSF) — examining the problem, policy, and politics streams — to analyze the PPAN 2023-2028 through document review (PPAN text, NNC board resolutions, congressional budget records, DBM allocation data) and semi-structured interviews with 30 key informants from NNC, DOH, DSWD, DA, DILG, selected LGUs (15 municipalities and 5 provinces), and nutrition NGOs. Field visits to 10 LGU nutrition action offices assessed implementation readiness. The analysis covered policy formulation, institutional coordination mechanisms, budget allocation, and LGU implementation capacity.',
      resultsText: 'The problem stream analysis confirmed strong evidence-based recognition of malnutrition as a policy priority, supported by ENNS data and international pressure (SDG2). However, the policy stream revealed fragmentation: NNC coordinates across 8 agencies but lacks authority to enforce compliance or reallocate resources. Budget analysis showed that while the national nutrition budget increased by 15% (2023 vs 2022), 72% is absorbed by national agency operations, with only 28% reaching community-level programs. In the politics stream, nutrition competes for LGU attention against more politically visible priorities. Of 10 LGU nutrition offices visited, only 3 had dedicated full-time nutrition program coordinators; the remainder assigned nutrition as an additional responsibility to rural health midwives or social workers.',
      conclusionText: 'The PPAN 2023-2028 is technically sound but faces significant implementation challenges rooted in institutional fragmentation, insufficient community-level funding, and limited LGU capacity. Recommendations include: (1) granting NNC budget coordination authority, (2) mandating full-time municipal nutrition program coordinators through DILG guidelines, (3) establishing a unified nutrition monitoring dashboard linked to the CBMS, and (4) creating performance-based fiscal transfers to incentivize LGU nutrition outcomes.',
      references: [
        '[1] NNC. (2022). Philippine Plan of Action for Nutrition 2023-2028. National Nutrition Council, Manila.',
        '[2] Kingdon, J.W. (1984). Agendas, Alternatives, and Public Policies. Boston: Little, Brown.',
        '[3] Briones, R. et al. (2022). Nutrition governance assessment in the Philippines. PIDS Discussion Paper 2022-03.',
        '[4] DILG. (2021). Status of Local Nutrition Committees. Department of Interior and Local Government.',
      ],
    },
    {
      paperNum: 12,
      title: 'Community-Based Management of Acute Malnutrition in Post-Typhoon Samar Province: A Process Evaluation',
      authors: ['Juan Carlos Bautista', 'Maria Lourdes Reyes'],
      abstract: 'Process evaluation of the Community-Based Management of Acute Malnutrition (CMAM) program implementation in 15 municipalities of Samar Province following Typhoon Haiyan recovery. Program coverage reached 68% of severely acutely malnourished children, with a cure rate of 78%. Key enablers included barangay nutrition scholar networks and integration with 4Ps conditional cash transfer. Barriers included supply chain disruptions for ready-to-use therapeutic food (RUTF) and high volunteer turnover.',
      journal: 'Disasters',
      year: 2023,
      keywords: ['acute malnutrition', 'CMAM', 'disaster recovery', 'Philippines', 'Samar'],
      doi: '10.1111/disa.12567',
      orgSlug: 'college-of-public-affair-and-development',
      authorGoogleId: 'SEED_006',
      introText: 'Typhoon Haiyan (local name: Yolanda), which struck the Eastern Visayas in November 2013, was one of the strongest tropical cyclones ever recorded. Beyond the immediate devastation, the typhoon severely disrupted food systems and nutrition services in affected areas. In Samar Province, acute malnutrition rates among children under 5 surged to 12% in the months following the typhoon, prompting the implementation of Community-Based Management of Acute Malnutrition (CMAM) programs supported by UNICEF and the Department of Health. This process evaluation examines the implementation of CMAM in Samar from 2014 to 2022, covering the transition from emergency response to sustainable programming.',
      methodText: 'A process evaluation was conducted using the RE-AIM framework (Reach, Effectiveness, Adoption, Implementation, Maintenance) across 15 municipalities in Samar Province from March to September 2022. Data sources included program records from municipal health offices (2014-2022), direct observation of 30 outpatient therapeutic care (OTC) sessions, semi-structured interviews with 45 key informants (health workers, BNS, LGU officials, UNICEF staff), and focus group discussions with 8 groups of caregivers (n=72). CMAM performance was assessed against SPHERE standards for cure rate (>75%), death rate (<10%), and default rate (<15%).',
      resultsText: 'Program coverage (proportion of SAM children enrolled in treatment) was 68%, meeting the acceptable standard (>50% for rural areas) but below the target of 90%. The cure rate was 78.2%, meeting the SPHERE standard. Default rate was 18.3%, slightly above the 15% threshold, with distance to OTC sites (>5km for 34% of households) being the primary reason. The BNS network was identified as the most critical enabler — municipalities with active BNS screening achieved 82% coverage versus 54% in those with inactive networks. Integration with the 4Ps cash transfer program improved adherence, as mothers attending OTC sessions could simultaneously complete 4Ps health conditionalities. The primary barrier was RUTF supply chain disruption — 73% of OTC sites reported stockouts lasting >2 weeks during the study period.',
      conclusionText: 'The CMAM program in post-typhoon Samar demonstrates both the feasibility and the challenges of community-based malnutrition treatment in the Philippine context. Sustaining coverage and reducing default rates requires strengthening BNS networks through adequate compensation and training, establishing local RUTF production or buffer stocks, and maintaining integration with social protection programs. These lessons are relevant for disaster preparedness planning as the Philippines faces increasing climate-related disruptions to food and nutrition security.',
      references: [
        '[1] UNICEF. (2013). Community-Based Management of Acute Malnutrition: Technical Guidance. New York.',
        '[2] SPHERE Association. (2018). The Sphere Handbook. Geneva.',
        '[3] NDRRMC. (2014). Final Report on Typhoon Yolanda. National Disaster Risk Reduction and Management Council.',
        '[4] DOH. (2015). National Guidelines on CMAM Implementation in the Philippines. Department of Health.',
      ],
    },
    {
      paperNum: 13,
      title: 'Design and Performance Evaluation of an Indirect Solar Dryer for Small-Scale Mango Processing in Cebu Province',
      authors: ['Paolo Miguel Torres'],
      abstract: 'Design and performance evaluation of an indirect solar dryer for mango processing in Cebu, Philippines. The dryer achieved temperatures of 55-65°C with drying efficiency of 28%. Dried mango moisture content reached 14% within 8 hours compared to 16 hours for open-sun drying. Microbiological analysis showed coliform counts below 10 CFU/g, meeting Philippine FDA standards. Cost analysis showed payback period of 1.5 cropping seasons for small-scale processors.',
      journal: 'Philippine Journal of Agricultural Engineering',
      year: 2023,
      keywords: ['solar drying', 'mango', 'food processing', 'Philippines', 'post-harvest'],
      doi: '10.55556/pjae.2023.0041',
      orgSlug: 'college-of-engineering-and-agro-industrial-technology',
      authorGoogleId: 'SEED_004',
      introText: 'The Philippines is one of the world\'s top mango producers, with Cebu Province being a major production area known for the premium Cebu mango variety. However, approximately 30-40% of harvested mangoes are lost due to the fruit\'s highly perishable nature and limited post-harvest processing capacity among smallholder farmers and small-scale processors. Drying is one of the most effective preservation methods for extending mango shelf life, but open-sun drying — the most common method used by small processors in Cebu — exposes the product to contamination, insect infestation, and weather-dependent quality variations. Solar drying technology offers an improved alternative that harnesses abundant tropical solar radiation while protecting product quality.',
      methodText: 'An indirect solar dryer was designed and fabricated at the UPLB Agricultural Machinery Testing and Evaluation Center (AMTEC). The dryer consists of a flat-plate solar collector (2.5 m²), drying chamber with three trays (total capacity: 10 kg fresh mango slices), and a chimney for natural convection air flow. Performance evaluation was conducted over 20 drying runs during the dry season (March-May 2023) at a cooperating farm in Dalaguete, Cebu. Parameters measured included solar radiation, collector and chamber temperatures, air flow velocity, weight loss of mango slices over time, final moisture content, drying efficiency, and microbiological quality (total plate count, coliform count). Comparative trials with open-sun drying were conducted simultaneously.',
      resultsText: 'The solar collector raised air temperature by 15-25°C above ambient, achieving drying chamber temperatures of 55-65°C at peak solar radiation (800-1000 W/m²). Mango slices (5mm thickness) reached the target moisture content of 14% in an average of 8.2 hours, compared to 15.8 hours for open-sun drying. Overall drying efficiency was 28.3%. Microbiological analysis showed total plate counts of 2.1×10³ CFU/g and coliform counts of <10 CFU/g in solar-dried samples, both well within Philippine FDA limits. Open-sun dried samples had 5x higher microbial counts. Color retention (L*, a*, b* values) was significantly better in solar-dried samples. Economic analysis showed total fabrication cost of PHP 18,500, with an estimated payback period of 1.5 mango seasons for a processor handling 50 kg/week.',
      conclusionText: 'The indirect solar dryer offers a practical, low-cost improvement over open-sun drying for small-scale mango processors in Cebu. The technology reduces drying time by 48%, improves product safety and quality, and achieves payback within 1.5 seasons. Dissemination through DA\'s Agricultural Training Institute and PhilMech could benefit thousands of small-scale processors in mango-producing provinces.',
      references: [
        '[1] BAS-DA. (2023). Mango: Volume of Production by Province. Philippine Statistics Authority.',
        '[2] PhilMech. (2019). Solar drying technology for agricultural products. Philippine Center for Postharvest Development and Mechanization.',
        '[3] Jangam, S.V. et al. (2010). Drying of Foods, Vegetables and Fruits, Volume 1. Singapore.',
        '[4] FDA Philippines. (2013). Standards for dried fruits and vegetables. Food and Drug Administration.',
      ],
    },
    {
      paperNum: 14,
      title: 'Development and Nutritional Evaluation of Orange-Fleshed Sweet Potato Flour Fortified with Moringa for Complementary Feeding',
      authors: ['Paolo Miguel Torres', 'Maria Lourdes Reyes'],
      abstract: 'Development and nutritional evaluation of orange-fleshed sweet potato (OFSP) flour fortified with moringa leaf powder for use in complementary feeding of Filipino infants 6-23 months. The optimized blend (80% OFSP flour, 20% moringa powder) provided 45% of RDA for vitamin A and 30% for iron per serving. Sensory evaluation with 60 mothers showed acceptable palatability scores (7.2/9). Shelf-life studies indicated 6-month stability at ambient Philippine conditions.',
      journal: 'Food Science and Technology',
      year: 2024,
      keywords: ['sweet potato', 'moringa', 'complementary feeding', 'fortification', 'Philippines'],
      doi: '10.55556/fst.2024.0087',
      orgSlug: 'college-of-engineering-and-agro-industrial-technology',
      authorGoogleId: 'SEED_004',
      introText: 'Complementary feeding — the process of introducing nutritious foods alongside breastmilk from 6 months of age — is a critical window for preventing malnutrition. In the Philippines, inadequate complementary feeding contributes to the high prevalence of stunting and micronutrient deficiencies among children under 2 years. Commercial complementary food products are often unaffordable for low-income families, creating a need for locally produced, nutrient-dense alternatives. Orange-fleshed sweet potato (OFSP) is rich in beta-carotene (provitamin A), while Moringa oleifera leaves are abundant in iron, calcium, and protein — together, they offer a promising combination for addressing multiple micronutrient deficiencies using ingredients widely available in the Philippines.',
      methodText: 'OFSP (var. VitAA) was sourced from PhilRootcrops, Visayas State University, and processed into flour through washing, peeling, slicing (3mm), blanching (90°C, 2 min), cabinet drying (60°C, 8 hours), and milling. Moringa leaves were harvested from a UPLB campus plantation, dried at 50°C for 6 hours, and milled. Five blend ratios were evaluated (100:0, 90:10, 80:20, 70:30, 60:40 OFSP:moringa). Proximate analysis, mineral content (iron, calcium, zinc by AAS), beta-carotene (HPLC), and anti-nutritional factors (phytate, tannin) were determined. Sensory evaluation used 60 mothers of children 6-23 months as panelists, rating porridge preparations on a 9-point hedonic scale. Accelerated shelf-life testing was conducted at 35°C/75% RH for 6 months.',
      resultsText: 'The optimized blend (80:20 OFSP:moringa) provided per 30g serving: 467 µg RAE vitamin A (45% of RDA for 6-23 months), 3.6 mg iron (30% RDA), 180 mg calcium (28% RDA), and 2.8g protein. Beta-carotene content was 5,280 µg/100g. Phytate:iron molar ratio was 4.2:1, within the acceptable range for adequate iron bioavailability. Sensory evaluation scores for the 80:20 blend were: appearance 7.4/9, aroma 6.8/9, taste 7.2/9, texture 7.5/9, and overall acceptability 7.2/9 — all above the acceptability threshold of 5. Blends with >30% moringa received significantly lower taste scores due to bitterness. Shelf-life studies showed acceptable microbial counts, color, and nutrient retention through 6 months when stored in aluminum foil-laminated pouches.',
      conclusionText: 'The OFSP-moringa flour blend (80:20) is a nutritionally adequate, sensorily acceptable, and shelf-stable complementary food ingredient that can be produced using locally available raw materials at low cost. At approximately PHP 8 per serving, it is significantly more affordable than commercial complementary foods (PHP 25-40 per serving). Pilot production through LGU nutrition programs and women\'s cooperatives is recommended as a next step toward addressing complementary feeding gaps in the Philippines.',
      references: [
        '[1] Low, J.W. et al. (2017). A food-based approach introducing orange-fleshed sweet potatoes increased vitamin A intake. Journal of Nutrition, 137(5), 1320-1327.',
        '[2] Moyo, B. et al. (2011). Nutritional characterization of moringa leaf powder. African Journal of Biotechnology, 10(60), 12925-12933.',
        '[3] FNRI. (2019). Philippine Food Composition Tables. Food and Nutrition Research Institute.',
        '[4] WHO. (2003). Complementary feeding: Report of the global consultation. Geneva: World Health Organization.',
      ],
    },
    {
      paperNum: 15,
      title: 'Wild Edible Plants and Food Security of Upland Farming Communities in Ifugao Province, Philippines',
      authors: ['Juan Carlos Bautista', 'Ricardo Dela Cruz'],
      abstract: 'Ethnobotanical survey of wild edible plants utilized by upland farming communities in Ifugao Province, Philippines. A total of 87 species across 42 families were documented, with 34 species consumed regularly during lean months (June-August). Nutrient analysis of the 10 most commonly consumed species revealed high concentrations of calcium, iron, and beta-carotene. The study argues for integrating traditional food plant conservation into food security strategies for upland communities.',
      journal: 'Economic Botany',
      year: 2023,
      keywords: ['wild edible plants', 'Ifugao', 'ethnobotany', 'food security', 'indigenous knowledge'],
      doi: '10.1007/s12231-023-09578-3',
      orgSlug: 'college-of-forestry-and-natural-resources',
      authorGoogleId: 'SEED_006',
      introText: 'The Ifugao rice terraces, a UNESCO World Heritage Site, represent one of the most remarkable examples of indigenous agricultural engineering. However, the food system of Ifugao communities extends far beyond the terraces — the surrounding forests, swidden farms, and home gardens harbor a rich diversity of wild and semi-domesticated edible plants that have sustained these communities for centuries. These traditional food plants play a particularly critical role during lean months when rice stores are depleted, providing essential nutrients and caloric supplementation. As modernization and environmental change threaten traditional food systems, documenting and conserving these plant resources has become urgent.',
      methodText: 'Ethnobotanical surveys were conducted in 8 barangays across the municipalities of Banaue, Hungduan, Kiangan, and Mayoyao from February to October 2022. Participatory methods included: guided forest walks with 24 local plant experts (3 per barangay, selected by community elders), free-listing exercises (n=120 households), seasonal availability calendars, and voucher specimen collection. All specimens were identified at the UPLB Botanical Herbarium. For the 10 most frequently cited species, samples were collected for proximate analysis and mineral content determination (calcium, iron, zinc, beta-carotene) at the FNRI laboratory. Use frequency and seasonal consumption patterns were documented through monthly food recall visits to 40 focal households over 12 months.',
      resultsText: 'A total of 87 wild edible plant species belonging to 42 families were documented. By plant part consumed: leafy vegetables (38 species), fruits (22), roots/tubers (12), shoots/stems (9), and flowers (6). Of these, 34 species were consumed regularly during the lean months of June-August when rice stores are lowest. The most frequently cited species were fern fiddleheads (pako, Diplazium esculentum), wild pepper leaves (siling-labuyo, Capsicum frutescens), wild ginger (luy-a, Zingiber officinale), and several species of wild yam (ubi, Dioscorea spp.). Nutrient analysis of the top 10 species revealed calcium content ranging from 120-890 mg/100g, iron from 3.2-18.6 mg/100g, and beta-carotene from 1,200-8,400 µg/100g — substantially exceeding values of commonly cultivated vegetables.',
      conclusionText: 'The wild edible plant diversity of Ifugao represents an invaluable but threatened nutritional resource for upland communities. Conservation of forest areas that harbor these species, combined with promotion of home garden cultivation of the most nutritious species, should be integrated into local food security strategies. The traditional ecological knowledge of Ifugao communities regarding these plants is itself a heritage resource that merits documentation and intergenerational transmission.',
      references: [
        '[1] Acabado, S. (2017). The archaeology of periurban agriculture: Food, farming, and freedom in the Cordillera region. Philippine Studies, 65(2), 231-260.',
        '[2] Malabrigo, P.L. et al. (2019). Ethnobotanical survey of wild edible plants in Luzon island, Philippines. Philippine Journal of Science, 148(S1), 173-188.',
        '[3] Shumsky, S.A. et al. (2014). How conservation agriculture affects food and nutrition security. Food Security, 6(5), 671-684.',
        '[4] UNESCO. (2008). Rice Terraces of the Philippine Cordilleras. World Heritage Convention.',
      ],
    },
    {
      paperNum: 16,
      title: 'Social Media Nutrition Messaging and Its Influence on Filipino Mothers\' Infant Feeding Practices',
      authors: ['Angela Mae Villanueva', 'Franchesca Margarette Gonzales'],
      abstract: 'Content analysis and survey study examining the influence of nutrition-related social media content on feeding practices of Filipino mothers with children under 5 years. Analysis of 2,000 Facebook and TikTok posts revealed prevalent misinformation about complementary feeding (32% of posts contained inaccurate claims). Mothers who primarily relied on social media for nutrition information had lower infant and young child feeding (IYCF) practice scores compared to those who consulted health professionals.',
      journal: 'Philippine Journal of Development Communication',
      year: 2024,
      keywords: ['social media', 'nutrition communication', 'misinformation', 'infant feeding', 'Philippines'],
      doi: '10.55556/pjdc.2024.0019',
      orgSlug: 'college-of-developmental-communication',
      authorGoogleId: 'SEED_003',
      introText: 'Social media has become a primary source of health and nutrition information for Filipino parents, with 76% of Filipino adults using Facebook and an increasing number — particularly younger parents — using TikTok and YouTube for parenting advice. While these platforms can democratize access to nutrition knowledge, they also facilitate the rapid spread of misinformation, unverified health claims, and commercially motivated content that may undermine evidence-based feeding practices. The influence of social media on infant and young child feeding (IYCF) practices in the Philippine context has not been systematically studied.',
      methodText: 'This mixed-methods study comprised two components. First, a content analysis of 2,000 nutrition-related posts on Facebook (1,200 posts from Filipino parenting groups with >50,000 members) and TikTok (800 posts tagged with Filipino nutrition-related hashtags such as #BabyFoodPH, #ComplementaryFeeding, #NutritionTips) was conducted from January to June 2023. Posts were coded for accuracy against WHO/DOH IYCF guidelines by two trained nutritionists (inter-rater reliability: Cohen\'s kappa=0.81). Second, an online survey of 520 Filipino mothers with children aged 6-59 months assessed their information sources, social media nutrition content consumption, and IYCF practices using standardized WHO indicators.',
      resultsText: 'Of the 2,000 social media posts analyzed, 32% contained at least one inaccurate nutrition claim. Common misinformation included: premature introduction of complementary foods before 6 months (14% of posts), promotion of honey or commercial cereals for infants under 12 months (11%), and unsubstantiated health claims about specific "superfood" ingredients (18%). TikTok posts had higher misinformation rates (38%) than Facebook group posts (28%). In the survey, mothers who cited social media as their primary nutrition information source (42% of respondents) had significantly lower minimum acceptable diet scores for their children (34% vs. 52% for those consulting health professionals, p<0.01). However, mothers in nutrition-focused Facebook groups moderated by health professionals showed IYCF scores comparable to those receiving face-to-face counseling.',
      conclusionText: 'Social media is a double-edged sword for nutrition communication in the Philippines — while it expands information access, unmoderated platforms propagate misinformation that negatively influences feeding practices. Recommendations include: (1) DOH and NNC social media counter-messaging campaigns, (2) training health professionals to establish moderated online nutrition communities, (3) partnerships with social media platforms for nutrition misinformation labeling, and (4) integration of digital literacy into barangay-level nutrition counseling.',
      references: [
        '[1] We Are Social. (2023). Digital 2023: Philippines. Hootsuite.',
        '[2] WHO. (2021). Indicators for assessing infant and young child feeding practices. Geneva.',
        '[3] Villamor, G.J. et al. (2022). Social media use and health information seeking among Filipino parents. Philippine Journal of Health Research and Development, 26(3), 45-56.',
        '[4] DOH. (2020). Updated IYCF Guidelines. Department of Health, Philippines.',
      ],
    },
    {
      paperNum: 17,
      title: 'Antibiotic Residues in Poultry Products Sold in Wet Markets and Supermarkets of Calabarzon Region',
      authors: ['Ricardo Dela Cruz'],
      abstract: 'Surveillance study of antibiotic residues in broiler chicken meat and eggs collected from wet markets and supermarkets in Calabarzon region, Philippines. Using ELISA and HPLC screening, 22% of chicken meat samples and 8% of egg samples contained detectable antibiotic residues, with tetracycline and enrofloxacin most prevalent. Samples from wet markets had 3x higher violation rates than supermarket sources. The study supports strengthened antimicrobial resistance (AMR) surveillance in Philippine poultry production.',
      journal: 'Philippine Journal of Veterinary Medicine',
      year: 2023,
      keywords: ['antibiotic residues', 'poultry', 'food safety', 'AMR', 'Philippines'],
      doi: '10.55556/pjvm.2023.0056',
      orgSlug: 'college-of-veteriny-medicine',
      authorGoogleId: 'SEED_002',
      introText: 'Antimicrobial resistance (AMR) is recognized by the WHO as one of the top 10 global public health threats. In the livestock sector, the use of antibiotics for growth promotion, prophylaxis, and treatment contributes to the selection and spread of resistant bacteria. The Philippine poultry industry, the largest livestock subsector with over 180 million birds in inventory, relies heavily on antibiotics — including medically important antimicrobials such as tetracyclines, fluoroquinolones, and macrolides. While the Philippine FDA has issued guidelines on withdrawal periods before slaughter, compliance monitoring in the fragmented poultry value chain remains limited, particularly for products sold through traditional wet markets.',
      methodText: 'A cross-sectional surveillance study was conducted from January to December 2022. A total of 400 samples were collected: 200 chicken breast meat samples and 200 egg samples from 20 wet markets and 10 supermarkets across the five provinces of Calabarzon (Cavite, Laguna, Batangas, Rizal, Quezon). Samples were screened for six antibiotic classes using competitive ELISA (EuroProxima kits): tetracyclines, fluoroquinolones, sulfonamides, beta-lactams, aminoglycosides, and macrolides. Positive samples were confirmed and quantified using HPLC-UV/DAD. Results were compared against Philippine FDA maximum residue limits (MRLs) and Codex Alimentarius standards.',
      resultsText: 'Overall, 22% (44/200) of chicken meat samples and 8% (16/200) of egg samples contained antibiotic residues exceeding MRLs. The most frequently detected antibiotics were tetracycline (14% of meat samples, mean concentration 182 µg/kg vs MRL of 200 µg/kg) and enrofloxacin (10% of meat samples, mean 156 µg/kg vs MRL of 100 µg/kg). Wet market samples had significantly higher violation rates than supermarket samples: 28% vs 9% for chicken meat (OR=3.9, p<0.001) and 11% vs 3% for eggs (OR=4.0, p<0.01). Seasonal variation showed higher residue rates during the wet season (June-November: 26%) compared to dry season (January-May: 18%), potentially reflecting increased antibiotic use during disease-prone periods.',
      conclusionText: 'Antibiotic residues in poultry products sold in Calabarzon markets represent a significant food safety and AMR concern. The higher violation rates in wet markets suggest gaps in withdrawal period compliance and sourcing traceability. Strengthening the National Residue Monitoring Program, implementing market-level rapid screening, and educating poultry farmers on responsible antibiotic use and withdrawal periods are essential steps toward reducing consumer exposure and mitigating AMR transmission through the food chain.',
      references: [
        '[1] WHO. (2021). Global Action Plan on Antimicrobial Resistance. Geneva.',
        '[2] DA-BAI. (2019). Philippine AMR Surveillance Program Annual Report. Bureau of Animal Industry.',
        '[3] FDA Philippines. (2015). Administrative Order No. 2015-0030: Guidelines on maximum residue limits for veterinary drugs.',
        '[4] PSA. (2022). Chicken Industry Performance Report. Philippine Statistics Authority.',
      ],
    },
    {
      paperNum: 18,
      title: 'Comparative Phytochemical and Nutritional Analysis of Three Moringa oleifera Varieties Cultivated in Laguna, Philippines',
      authors: ['Paolo Miguel Torres', 'Maria Lourdes Reyes'],
      abstract: 'Comparative phytochemical and nutritional analysis of three Moringa oleifera varieties cultivated in Laguna, Philippines. Total phenolic content ranged from 45-68 mg GAE/g, with the native Philippine variety showing highest antioxidant activity (DPPH IC50 = 23.4 µg/mL). Mineral analysis confirmed high calcium (2,003 mg/100g) and iron (28.2 mg/100g) content in dried leaves. Results support the promotion of moringa as a locally available superfood for addressing micronutrient deficiencies.',
      journal: 'Philippine Journal of Science',
      year: 2024,
      keywords: ['moringa', 'phytochemistry', 'antioxidants', 'micronutrients', 'Philippines'],
      doi: '10.56899/pjs.152.1.2024.04',
      orgSlug: 'college-of-arts-and-science',
      authorGoogleId: 'SEED_004',
      introText: 'Moringa oleifera, locally known as malunggay, is one of the most widely cultivated and utilized plants in the Philippines. Found in virtually every Filipino backyard and commonly used in traditional dishes such as tinola and sinigang, moringa has gained international recognition as a "miracle tree" due to its exceptional nutritional profile. However, systematic comparison of the phytochemical and nutritional composition of different moringa varieties under Philippine growing conditions has been limited. Three varieties are commonly cultivated in the Philippines: the native Philippine variety, the Indian PKM-1 variety introduced through DOST programs, and the African perennial variety propagated through NGO initiatives.',
      methodText: 'Three Moringa oleifera varieties (native Philippine, Indian PKM-1, African perennial) were cultivated under uniform conditions at the UPLB Crop Science field laboratory in Laguna from January 2022 to March 2023. Mature leaves from 6-month-old trees (3rd-5th branch level) were harvested quarterly across four seasons. Analyses included: proximate composition (AOAC methods), mineral content (Ca, Fe, Zn, Mg by AAS), beta-carotene (HPLC), total phenolic content (Folin-Ciocalteu assay, expressed as mg gallic acid equivalents/g), total flavonoid content (aluminum chloride colorimetric method), and antioxidant activity (DPPH radical scavenging assay, ABTS assay, and FRAP). Anti-nutritional factors (phytate, oxalate, tannin) were also determined. All analyses were performed in triplicate.',
      resultsText: 'The native Philippine variety exhibited the highest total phenolic content (68.2 mg GAE/g dry weight) and antioxidant activity (DPPH IC50 = 23.4 µg/mL), followed by the African variety (52.7 mg GAE/g, IC50 = 31.2 µg/mL) and PKM-1 (45.1 mg GAE/g, IC50 = 38.7 µg/mL). Mineral content across all varieties was consistently high: calcium ranged from 1,845-2,003 mg/100g (highest in native variety), iron from 24.6-28.2 mg/100g, and zinc from 3.1-4.2 mg/100g. Beta-carotene content was highest in PKM-1 (18,720 µg/100g) compared to native (15,340 µg/100g) and African (14,890 µg/100g). Seasonal variation showed significantly higher phenolic and antioxidant levels during the dry season (March-May) compared to wet season. Phytate:iron molar ratios ranged from 2.8:1 to 3.6:1, suggesting moderate iron bioavailability.',
      conclusionText: 'All three moringa varieties cultivated in Laguna showed excellent nutritional profiles, with the native Philippine variety demonstrating superior antioxidant properties and mineral content. These findings support the promotion of moringa, particularly the locally adapted native variety, as a cost-effective strategy for addressing micronutrient deficiencies in Filipino communities. Future research should investigate the bioavailability of moringa nutrients in human feeding trials and optimize processing methods for maximizing nutrient retention in commercial moringa products.',
      references: [
        '[1] Siddhuraju, P. & Becker, K. (2003). Antioxidant properties of various solvent extracts of Moringa oleifera leaves. Journal of Agricultural and Food Chemistry, 51(8), 2144-2155.',
        '[2] DOST-PCARRD. (2016). Malunggay Production Guide. Philippine Council for Agriculture, Aquatic and Natural Resources Research and Development.',
        '[3] Amaglo, N.K. et al. (2010). Profiling selected phytochemicals and nutrients in moringa varieties. Food Chemistry, 122(4), 1047-1054.',
        '[4] FNRI. (2019). Philippine Food Composition Tables. Food and Nutrition Research Institute, DOST.',
      ],
    },
    {
      paperNum: 19,
      title: 'Machine Learning Models for Rice Crop Yield Prediction Using Climate and Remote Sensing Data Across Philippine Provinces',
      authors: ['JoJo Admin', 'Adrian Cueto'],
      abstract: 'Application of machine learning models (Random Forest, XGBoost, LSTM) for predicting rice crop yields using climate data, soil parameters, and satellite vegetation indices across 15 Philippine provinces. The XGBoost model achieved the highest accuracy (R² = 0.87, RMSE = 0.42 t/ha) using PAGASA weather data and MODIS NDVI. The tool is designed as a decision support system for local agricultural extension workers to anticipate production shortfalls and plan food security interventions.',
      journal: 'Philippine Information Technology Journal',
      year: 2024,
      keywords: ['machine learning', 'rice yield', 'crop prediction', 'Philippines', 'food security'],
      doi: '10.55556/pitj.2024.0012',
      orgSlug: 'uplb-computer-science-society',
      authorGoogleId: null, // JoJo Admin is an existing user
      authorId: '69a0672cdf765d1e77ebd281',
      introText: 'Rice yield prediction is critical for food security planning in the Philippines, where rice is the primary staple food and production is vulnerable to climate variability, typhoons, and pest outbreaks. Traditional yield estimation relies on crop cutting surveys conducted by the Philippine Statistics Authority, but these are labor-intensive, expensive, and available only after harvest. Machine learning approaches using freely available satellite remote sensing data and weather station records offer the potential for timely, cost-effective yield prediction that could support proactive food security interventions by local agricultural extension workers and disaster risk reduction officers.',
      methodText: 'Historical rice yield data for 15 major rice-producing provinces (2010-2023) were obtained from the Philippine Statistics Authority. Climate variables (temperature, rainfall, solar radiation, humidity) were sourced from 45 PAGASA weather stations interpolated to provincial level. Satellite-derived vegetation indices (NDVI, EVI) were computed from 16-day MODIS composites (MOD13Q1, 250m resolution) for rice-growing areas delineated using PhilRice land use maps. Soil parameters were extracted from the ISRIC SoilGrids 250m dataset. Three ML models were trained: Random Forest, XGBoost, and LSTM neural networks. Models were evaluated using 5-fold temporal cross-validation (train on 2010-2019, validate on 2020, test on 2021-2023), with R², RMSE, and MAE as performance metrics.',
      resultsText: 'XGBoost achieved the highest prediction accuracy with R² = 0.87, RMSE = 0.42 t/ha, and MAE = 0.31 t/ha on the held-out test set (2021-2023). Random Forest performed comparably (R² = 0.84, RMSE = 0.47 t/ha), while LSTM underperformed (R² = 0.78) likely due to limited temporal depth. Feature importance analysis revealed that cumulative rainfall during the reproductive stage (top 1, 18% importance), mean NDVI during the vegetative stage (15%), and maximum temperature during grain filling (12%) were the most predictive variables. Provincial-level analysis showed higher model accuracy in irrigated lowland provinces (Nueva Ecija R²=0.91) compared to rainfed provinces (Samar R²=0.72). The prototype dashboard allows extension workers to input current-season climate data and view predicted yields with confidence intervals at the provincial and municipal levels.',
      conclusionText: 'Machine learning-based rice yield prediction using publicly available climate and remote sensing data is feasible and accurate for the Philippine context. The XGBoost model provides actionable predictions that can help local agricultural officers anticipate shortfalls 1-2 months before harvest and coordinate food security responses. Next steps include expanding to municipal-level predictions, incorporating real-time weather forecasts for within-season updates, and deploying as a web-accessible decision support tool through the Department of Agriculture.',
      references: [
        '[1] PSA. (2023). Palay and Corn: Volume of Production. Philippine Statistics Authority.',
        '[2] PAGASA. (2023). Climate Data Archive. Philippine Atmospheric, Geophysical and Astronomical Services Administration.',
        '[3] Chen, T. & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. Proceedings of KDD 2016.',
        '[4] PhilRice. (2021). Rice-based farm household survey. Philippine Rice Research Institute.',
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
  // Check for existing seeded papers (by checking if uploadedBy is a SEED_ user)
  const seedUsers = await User.find({ googleId: /^SEED_/ }).lean();
  if (seedUsers.length === 0) {
    console.log('ERROR: No seeded users found. Run seed-phase1.js first.');
    return;
  }

  const seedUserIds = seedUsers.map(u => u._id.toString());
  const existingSeededPapers = await Paper.find({
    uploadedBy: { $in: seedUsers.map(u => u._id) },
  }).lean();

  if (existingSeededPapers.length > 0) {
    console.log(`Found ${existingSeededPapers.length} existing seeded papers.`);
    console.log('Run with --rollback first to clean up, or skip this phase.');
    return;
  }

  // Build lookup maps
  const userByGoogleId = {};
  for (const u of seedUsers) {
    userByGoogleId[u.googleId] = u;
  }

  // Also fetch existing users that may author papers (JoJo Admin, Adrian Cueto etc)
  const existingUsers = await User.find({ googleId: { $not: /^SEED_/ } }).lean();
  for (const u of existingUsers) {
    userByGoogleId[u.googleId] = u;
  }

  const orgBySlug = {};
  const allOrgs = await Organization.find({}).lean();
  for (const o of allOrgs) {
    orgBySlug[o.slug] = o;
  }

  const papers = getPaperDefinitions();
  const createdPapers = [];

  console.log('=== Generating and Uploading PDFs, Creating Paper Documents ===\n');

  for (const paperDef of papers) {
    const org = orgBySlug[paperDef.orgSlug];
    if (!org) {
      console.log(`  WARNING: Org "${paperDef.orgSlug}" not found, skipping paper #${paperDef.paperNum}.`);
      continue;
    }

    // Determine author
    let authorId;
    if (paperDef.authorId) {
      authorId = new mongoose.Types.ObjectId(paperDef.authorId);
    } else if (paperDef.authorGoogleId && userByGoogleId[paperDef.authorGoogleId]) {
      authorId = userByGoogleId[paperDef.authorGoogleId]._id;
    } else {
      console.log(`  WARNING: Author not found for paper #${paperDef.paperNum}, skipping.`);
      continue;
    }

    // Generate PDF
    process.stdout.write(`  Paper #${paperDef.paperNum}: Generating PDF...`);
    const pdfBuffer = await generatePaperPDF(paperDef);
    process.stdout.write(` ${(pdfBuffer.length / 1024).toFixed(0)}KB`);

    // Upload to DO Spaces
    process.stdout.write(' -> Uploading...');
    const { url, key, size } = await uploadToSpaces(
      pdfBuffer,
      `paper-${paperDef.paperNum}.pdf`,
      'papers',
      'application/pdf'
    );
    process.stdout.write(' OK\n');

    // Create Paper document
    const paper = await Paper.create({
      title: paperDef.title,
      authors: paperDef.authors,
      abstract: paperDef.abstract,
      keywords: paperDef.keywords,
      doi: paperDef.doi,
      publicationDate: new Date(`${paperDef.year}-06-15`),
      year: paperDef.year,
      journal: paperDef.journal,
      fileUrl: url,
      fileSize: size,
      uploadedBy: authorId,
      organizationId: org._id,
      isPublished: true,
      downloadCount: Math.floor(Math.random() * 30) + 5,
    });

    console.log(`    -> Created Paper: ${paper._id} | "${paperDef.title.substring(0, 60)}..."`);
    createdPapers.push({ paperNum: paperDef.paperNum, paper, key, url });
  }

  // Print summary
  console.log(`\n=== Summary ===\n`);
  console.log(`Papers created: ${createdPapers.length}`);
  console.log(`PDFs uploaded to DigitalOcean Spaces: ${createdPapers.length}`);
  console.log('\nPaper IDs (needed for Phase 3):');
  for (const { paperNum, paper } of createdPapers) {
    console.log(`  Paper #${paperNum}: ${paper._id} | ${paper.fileUrl}`);
  }

  // Verify a random PDF is accessible
  if (createdPapers.length > 0) {
    const sample = createdPapers[0];
    console.log(`\nVerifying PDF accessibility: ${sample.url}`);
    try {
      const resp = await fetch(sample.url, { method: 'HEAD' });
      console.log(`  HTTP ${resp.status} ${resp.statusText} — ${resp.status === 200 ? 'OK' : 'ISSUE'}`);
    } catch (err) {
      console.log(`  Fetch error: ${err.message} (CDN may take a moment to propagate)`);
    }
  }
}

async function rollback() {
  console.log('=== Rolling Back Phase 2 ===\n');

  // Find seed users
  const seedUsers = await User.find({ googleId: /^SEED_/ }).lean();
  const seedUserIds = seedUsers.map(u => u._id);

  // Also include JoJo Admin who authored paper #19
  const jojoAdmin = await User.findById('69a0672cdf765d1e77ebd281').lean();

  // Find papers uploaded by seed users (phase 2 papers)
  // We identify them by having a fileUrl containing our spaces CDN and being uploaded by seed users
  // For safety, also check if the paper was created after the seed users
  const allAuthorIds = [...seedUserIds];
  if (jojoAdmin) allAuthorIds.push(jojoAdmin._id);

  const seededPapers = await Paper.find({
    uploadedBy: { $in: allAuthorIds },
    fileUrl: { $regex: /uplb-kain-storage/ },
  }).lean();

  // Filter to only papers that match our seed DOI pattern or title pattern
  const seedDOIPatterns = ['10.55556/', '10.47895/', '10.1177/', '10.1016/', '10.37801/', '10.1007/', '10.1111/', '10.56899/'];
  const paperDefinitions = getPaperDefinitions();
  const seedTitles = new Set(paperDefinitions.map(p => p.title));

  const toDelete = seededPapers.filter(p => seedTitles.has(p.title));

  if (toDelete.length === 0) {
    console.log('No seeded papers found. Nothing to rollback.');
    return;
  }

  console.log(`Found ${toDelete.length} seeded papers to delete.\n`);

  // Delete PDFs from Spaces and Paper documents
  for (const paper of toDelete) {
    const key = keyFromUrl(paper.fileUrl);
    if (key) {
      try {
        await deleteFromSpaces(key);
        console.log(`  Deleted from Spaces: ${key}`);
      } catch (err) {
        console.log(`  WARNING: Could not delete ${key}: ${err.message}`);
      }
    }

    await Paper.deleteOne({ _id: paper._id });
    console.log(`  Deleted Paper: ${paper._id} | "${paper.title.substring(0, 60)}..."`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
