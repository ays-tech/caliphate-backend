import { PrismaClient, Role, BookStatus, BookType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helper for media URLs ───────────────────────────────────────────
// Store relative paths so frontend can construct full URLs
// Local:  frontend at http://localhost:3000 → API at http://localhost:3001/api
// Prod:   frontend at vercel.app → API at render.com
const media = (filename: string) => `/media/${filename}`;

// ── Scholars ─────────────────────────────────────────────────────────
const SCHOLARS = [
  {
    name: 'Ibn Khaldun',
    biography:
      'Abd al-Rahman ibn Khaldun (1332–1406) was a North African Arab historiographer and historian, widely regarded as one of the greatest philosophers and social scientists in history. Born in Tunis, he served as a statesman, jurist, and scholar across the Islamic world. His masterwork, the Muqaddimah, introduced a scientific method to the study of history and is considered a forerunner of modern sociology, historiography, and economics.',
    pictureUrl: media('ibn_khaldun.webp'),
  },
  {
    name: 'Imam Al-Ghazali',
    biography:
      'Abu Hamid Muhammad al-Ghazali (1058–1111), known as Hujjat al-Islam (Proof of Islam), was one of the most celebrated Islamic philosophers, theologians, and mystics. Born in Tus, Khorasan, he taught at the Nizamiyya in Baghdad before embarking on a spiritual journey that produced his magnum opus, Ihya Ulum al-Din (Revival of the Religious Sciences). His works profoundly shaped Islamic thought and Sufi spirituality.',
    pictureUrl: media('imam_al_ghazali.webp'),
  },
  {
    name: 'Ibn Rushd (Averroes)',
    biography:
      'Abu al-Walid Muhammad ibn Rushd (1126–1198), known in the West as Averroes, was an Andalusian polymath — physician, philosopher, and jurist. Born in Córdoba, he wrote extensive commentaries on Aristotle that were so authoritative they earned him the title "The Commentator" in medieval Europe. His works on medicine, law, and philosophy profoundly influenced both Islamic and European scholastic thought.',
    pictureUrl: media('ibn_rushd.jpg'),
  },
  {
    name: 'Ibn Sina (Avicenna)',
    biography:
      'Abu Ali al-Husayn ibn Sina (980–1037), known in the West as Avicenna, was a Persian polymath regarded as one of the most significant physicians, astronomers, philosophers, and writers of the Islamic Golden Age. His Canon of Medicine remained a standard medical textbook in Europe and the Islamic world for centuries. He wrote nearly 450 works, of which around 240 have survived.',
    pictureUrl: media('ibn sina.webp'),
  },
  {
    name: 'Imam Al-Bukhari',
    biography:
      'Muhammad ibn Ismail al-Bukhari (810–870) was a 9th-century Islamic scholar born in Bukhara (present-day Uzbekistan). He is best known for his Hadith collection, Sahih al-Bukhari, which Sunni Muslims consider the most authentic collection of hadiths after the Quran. He spent 16 years travelling across the Islamic world collecting narrations, selecting only 7,275 hadiths from an estimated 600,000 he examined.',
    pictureUrl: media('muhammed_albuhari.png'),
  },
  {
    name: 'Ibn Battuta',
    biography:
      'Abu Abdallah Muhammad ibn Battuta (1304–1368/1369) was a Moroccan scholar and explorer who is widely recognised as one of the greatest travellers of all time. Over a period of thirty years, he visited most of the known Islamic world as well as many non-Muslim lands, covering a distance of roughly 117,000 km — far surpassing his near-contemporary Marco Polo. His journey is recorded in the Rihla (The Travels).',
    pictureUrl: media('ibn_batuta.jpg'),
  },
];

// ── Books ─────────────────────────────────────────────────────────────
const BOOKS = [
  // Ibn Khaldun (index 0)
  {
    scholarIndex: 0,
    title: 'Muqaddimah (Introduction to History)',
    description:
      'The Muqaddimah, also known as the Prolegomena, is a landmark work of world history written in 1377. Ibn Khaldun introduces his theory of Asabiyyah (social cohesion) and presents a cyclical model of the rise and fall of civilisations. It is widely considered the first work to lay the groundwork for several social scientific disciplines: demography, cultural history, historiography, the philosophy of history, and economics.',
    type: BookType.PUBLISHED,
    coverUrl: media('muqadimmah.jpg'),
  },
  {
    scholarIndex: 0,
    title: 'Kitab al-Ibar (Book of Lessons)',
    description:
      "A universal history in seven volumes of which the Muqaddimah forms the introduction. It covers the history of the Arabs, Berbers, and neighbouring peoples, drawing on Ibn Khaldun's experience as a statesman and jurist to provide unique insights into the political dynamics of medieval Islamic civilisation.",
    type: BookType.PUBLISHED,
    coverUrl: media('alibar.jpg'),
  },

  // Imam Al-Ghazali (index 1)
  {
    scholarIndex: 1,
    title: 'Ihya Ulum al-Din (Revival of the Religious Sciences)',
    description:
      "Widely regarded as al-Ghazali's magnum opus, the Ihya is a comprehensive guide to Islamic ethics, spirituality, and jurisprudence across 40 books in 4 volumes. It covers the pillars of worship, the customs of daily life, destructive vices and saving virtues, and the path to divine love. Translated into numerous languages, it remains one of the most read works in the Islamic world.",
    type: BookType.PUBLISHED,
    coverUrl: media('ihyaulumaddin.jpg'),
  },
  {
    scholarIndex: 1,
    title: 'Tahafut al-Falasifa (Incoherence of the Philosophers)',
    description:
      "Written in 1095, this celebrated work critiques the Greek-influenced Islamic philosophers — particularly al-Farabi and Ibn Sina — on twenty philosophical points, three of which al-Ghazali declares heretical. The work prompted Ibn Rushd's famous rebuttal, Tahafut al-Tahafut, making the two works cornerstones of medieval philosophical debate.",
    type: BookType.PUBLISHED,
    coverUrl: media('tahafut.jpg'),
  },
  {
    scholarIndex: 1,
    title: 'Deliverance From Error (Al-Munqidh min al-Dalal)',
    description:
      "An intellectual autobiography in which al-Ghazali recounts his spiritual and philosophical crisis, his abandonment of his prestigious teaching post in Baghdad, and his eventual return to faith through Sufi practice. One of the most personal and candid works of Islamic literature, often compared to Augustine's Confessions.",
    type: BookType.PUBLISHED,
    coverUrl: media('general_1.jpg'),
  },

  // Ibn Rushd (index 2)
  {
    scholarIndex: 2,
    title: 'Tahafut al-Tahafut (Incoherence of the Incoherence)',
    description:
      "Ibn Rushd's brilliant point-by-point rebuttal of al-Ghazali's Tahafut al-Falasifa, defending Aristotelian philosophy within an Islamic framework. Written around 1180, it argues that philosophy and religion are compatible and that al-Ghazali misunderstood the philosophers he criticised. The work was hugely influential in both the Islamic and Christian scholastic traditions.",
    type: BookType.PUBLISHED,
    coverUrl: media('tahafut.jpg'),
  },
  {
    scholarIndex: 2,
    title: "Bidayat al-Mujtahid (The Distinguished Jurist's Primer)",
    description:
      'A masterwork of comparative Islamic jurisprudence in which Ibn Rushd systematically examines the points of agreement and disagreement between the major Sunni schools of law, explaining the reasoning behind each position. It is considered one of the finest introductions to Islamic legal theory ever written.',
    type: BookType.PUBLISHED,
    coverUrl: media('bidiyatul-mutahajid.jpg'),
  },

  // Ibn Sina (index 3)
  {
    scholarIndex: 3,
    title: 'Al-Qanun fi al-Tibb (The Canon of Medicine)',
    description:
      'A comprehensive medical encyclopedia completed around 1025, the Canon synthesised Greek, Islamic, and Indian medical knowledge into a systematic whole. Divided into five books covering general principles of medicine, simple drugs, diseases organised by organ, conditions affecting the whole body, and compound medicines. It remained the standard medical textbook in both Europe and the Islamic world until the 17th century.',
    type: BookType.PUBLISHED,
    coverUrl: media('general_3.jpg'),
  },
  {
    scholarIndex: 3,
    title: 'Kitab al-Shifa (The Book of Healing)',
    description:
      "A vast philosophical and scientific encyclopedia covering logic, natural sciences, mathematics, and metaphysics — Ibn Sina's most important philosophical work. Despite its title, it is not primarily a medical text but an attempt to heal the soul through understanding. Its sections on metaphysics and the soul were particularly influential in medieval European philosophy.",
    type: BookType.PUBLISHED,
    coverUrl: media('general_1.jpg'),
  },

  // Imam Al-Bukhari (index 4)
  {
    scholarIndex: 4,
    title: 'Sahih al-Bukhari',
    description:
      'Considered the most authentic book after the Quran by Sunni Muslims, Sahih al-Bukhari is a collection of 7,275 hadiths (sayings and actions of the Prophet Muhammad) carefully selected from approximately 600,000 narrations over 16 years of travel and verification. Organised into 97 books and 3,450 chapters, it covers all aspects of Islamic life from worship to commerce, warfare, and ethics.',
    type: BookType.PUBLISHED,
    coverUrl: media('Sahih-al-Bukhari.jpg'),
  },
  {
    scholarIndex: 4,
    title: 'Al-Adab al-Mufrad (A Code for Everyday Living)',
    description:
      'A collection of 1,322 hadiths compiled by Imam al-Bukhari focusing exclusively on Islamic ethics and social conduct — covering topics such as respect for parents, kindness to neighbours, treatment of servants, hospitality, and noble character. Less well-known than the Sahih but deeply practical, it provides a rich portrait of the moral teachings of the Prophet.',
    type: BookType.PUBLISHED,
    coverUrl: media('al-adab-al-muffarad.webp'),
  },

  // Ibn Battuta (index 5)
  {
    scholarIndex: 5,
    title: 'Rihla (Travels of Ibn Battuta)',
    description:
      "Formally titled 'A Gift to Those Who Contemplate the Wonders of Cities and the Marvels of Travelling', the Rihla is Ibn Battuta's account of his 29-year journey covering approximately 117,000 km across Africa, the Middle East, South Asia, Central Asia, Southeast Asia, and China. Dictated to the scholar Ibn Juzayy in 1355, it remains an incomparable primary source for 14th-century history, geography, and ethnography.",
    type: BookType.PUBLISHED,
    coverUrl: media('rihla.png'),
  },
];

// ── Events ────────────────────────────────────────────────────────────
const EVENTS = [
  {
    title: "Weekly Qur'an Circle",
    description:
      "A weekly gathering for the study and recitation of the Holy Qur'an, open to all levels. This week's focus: Surah Al-Baqarah verses 255–257 (Ayat al-Kursi and the following verses).",
    daysFromNow: 3,
  },
  {
    title: 'Islamic History Lecture Series: The Golden Age',
    description:
      'A monthly lecture series exploring the intellectual achievements of the Islamic Golden Age (8th–13th centuries). This session covers the House of Wisdom in Baghdad and its role in preserving and advancing human knowledge.',
    daysFromNow: 10,
  },
  {
    title: 'Fiqh Study Circle: Purification & Prayer',
    description:
      'An in-depth study of Islamic jurisprudence covering the chapters of Taharah (purification) and Salah (prayer) according to the major schools of law. Suitable for beginners and intermediate students.',
    daysFromNow: 17,
  },
  {
    title: 'New Book Launch: Translations of Ibn Khaldun',
    description:
      "Celebrating the addition of newly translated and annotated volumes of Ibn Khaldun's Muqaddimah to the Makhtaba collection. Join us for a discussion of his theories of civilisation and their relevance today.",
    daysFromNow: 24,
  },
  {
    title: 'Youth Islamic Knowledge Competition',
    description:
      "An annual knowledge competition for young Muslims aged 12–25 covering Qur'anic recitation, hadith, Islamic history, and jurisprudence. Registration is now open through the library.",
    daysFromNow: 45,
  },
];

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting CaliphateMakhtaba seed...\n');

  // ── Super Admin ───────────────────────────────────────────────────
  let superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@makhtaba.com' },
  });

  if (!superAdmin) {
    const hashed = await bcrypt.hash('SuperAdmin@123', 10);
    superAdmin = await prisma.user.create({
      data: {
        name:     'Super Admin',
        email:    'superadmin@makhtaba.com',
        password: hashed,
        role:     Role.SUPER_ADMIN,
        approved: true,
      },
    });
    console.log('✅ Super admin created: superadmin@makhtaba.com / SuperAdmin@123');
  } else {
    console.log('✓  Super admin already exists — skipping');
  }

  // ── Scholars ─────────────────────────────────────────────────────
  console.log('\n📚 Seeding scholars...');
  const scholarRecords: any[] = [];

  for (const s of SCHOLARS) {
    const existing = await prisma.scholar.findFirst({
      where: { name: s.name },
    });

    if (existing) {
      // Always update pictureUrl so switching from local → VPS works
      const updated = await prisma.scholar.update({
        where: { id: existing.id },
        data:  { pictureUrl: s.pictureUrl },
      });
      scholarRecords.push(updated);
      console.log(`  ✓  Updated: ${s.name} → ${s.pictureUrl}`);
    } else {
      const record = await prisma.scholar.create({ data: s });
      scholarRecords.push(record);
      console.log(`  ✅ Created scholar: ${s.name}`);
    }
  }

  // ── Books ─────────────────────────────────────────────────────────
  console.log('\n📖 Seeding books...');

  for (const b of BOOKS) {
    const scholar = scholarRecords[b.scholarIndex];
    if (!scholar) continue;

    const existing = await prisma.book.findFirst({
      where: { title: b.title },
    });

    if (existing) {
      // Always update coverUrl so switching from local → VPS works
      await prisma.book.update({
        where: { id: existing.id },
        data:  { coverUrl: b.coverUrl },
      });
      console.log(`  ✓  Updated coverUrl: ${b.title}`);
      continue;
    }

    await prisma.book.create({
      data: {
        title:        b.title,
        description:  b.description,
        type:         b.type,
        coverUrl:     b.coverUrl,
        status:       BookStatus.APPROVED,
        readCount:    Math.floor(Math.random() * 480) + 20,
        scholarId:    scholar.id,
        uploadedById: superAdmin.id,
      },
    });
    console.log(`  ✅ Created book: ${b.title}`);
  }

  // ── Events ────────────────────────────────────────────────────────
  console.log('\n📅 Seeding events...');

  for (const e of EVENTS) {
    const existing = await prisma.event.findFirst({
      where: { title: e.title },
    });

    if (existing) {
      console.log(`  ✓  Event already exists: ${e.title}`);
      continue;
    }

    const date = new Date();
    date.setDate(date.getDate() + e.daysFromNow);
    date.setHours(18, 0, 0, 0);

    await prisma.event.create({
      data: {
        title:       e.title,
        description: e.description,
        date,
        createdById: superAdmin.id,
      },
    });
    console.log(`  ✅ Created event: ${e.title}`);
  }

  // ── Summary ───────────────────────────────────────────────────────
  const [sc, bk, ev] = await Promise.all([
    prisma.scholar.count(),
    prisma.book.count(),
    prisma.event.count(),
  ]);

  console.log('\n─────────────────────────────────────────');
  console.log('🎉 Seed complete!');
  console.log(`   Scholars : ${sc}`);
  console.log(`   Books    : ${bk}`);
  console.log(`   Events   : ${ev}`);
  console.log('\n🔑 Login: superadmin@makhtaba.com / SuperAdmin@123');
  console.log('   ⚠️  Change this password after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());