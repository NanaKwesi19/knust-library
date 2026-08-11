import os

cron_path = "C:/Users/hp/knust-library/backend/src/jobs/cron.ts"
with open(cron_path, "r", encoding="utf-8") as f:
    content = f.read()

open_library_crons = """
  // 24. Open Library Nightly Auto-Enrichment (Runs Daily at 2:00 AM)
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Cron] Running Open Library Nightly Auto-Enrichment...');
      // Find books without a cover URL or missing metadata
      const booksToEnrich = await prisma.book.findMany({
        where: {
          OR: [
            { coverUrl: null },
            { publishYear: null },
            { publisher: null }
          ]
        },
        take: 50 // Limit to prevent API rate limiting
      });
      
      let enrichedCount = 0;
      for (const book of booksToEnrich) {
        if (!book.isbn && !book.title) continue;
        
        const query = book.isbn ? `isbn:${book.isbn}` : `title:${book.title}`;
        try {
          const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
          const data = await res.json();
          if (data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            const updates: any = {};
            
            if (!book.coverUrl && doc.cover_i) {
              const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
              updates.coverUrl = url;
              updates.coverImage = url;
            }
            if (!book.publishYear && doc.first_publish_year) {
              updates.publishYear = doc.first_publish_year;
            }
            if (!book.publisher && doc.publisher && doc.publisher.length > 0) {
              updates.publisher = doc.publisher[0];
            }
            
            if (Object.keys(updates).length > 0) {
              await prisma.book.update({
                where: { id: book.id },
                data: updates
              });
              enrichedCount++;
            }
          }
        } catch (fetchError) {
           // Silently continue on API failure
        }
        
        // Sleep slightly to respect rate limits
        await new Promise(r => setTimeout(r, 500));
      }
      
      console.log(`[Cron] Auto-enriched ${enrichedCount} books from Open Library.`);
      
      if (enrichedCount > 0) {
        await prisma.auditLog.create({
          data: {
            action: 'AUTO_ENRICHMENT',
            description: `Automatically fetched missing metadata for ${enrichedCount} books from Open Library.`,
            severity: 'INFO'
          }
        });
      }
    } catch (error) {
      console.error('[Cron] Auto-enrichment failed:', error);
    }
  });

  // 25. Open Library Weekly Auto-Curator (Runs Sundays at 3:00 AM)
  cron.schedule('0 3 * * 0', async () => {
    try {
      console.log('[Cron] Running Open Library Weekly Auto-Curator...');
      
      const subjects = ['engineering', 'computer_science', 'medicine', 'business', 'mathematics'];
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      const res = await fetch(`https://openlibrary.org/search.json?subject=${randomSubject}&limit=5&sort=new`);
      const data = await res.json();
      
      let importedCount = 0;
      if (data.docs) {
        for (const doc of data.docs) {
          if (!doc.title || !doc.author_name) continue;
          
          const existing = await prisma.book.findFirst({
            where: {
              OR: [
                ...(doc.isbn ? [{ isbn: doc.isbn[0] }] : []),
                { title: doc.title }
              ]
            }
          });
          
          if (!existing) {
            const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;
            await prisma.book.create({
              data: {
                title: doc.title,
                author: doc.author_name[0],
                isbn: doc.isbn ? doc.isbn[0] : null,
                publishYear: doc.first_publish_year || null,
                coverUrl: coverUrl,
                coverImage: coverUrl,
                openLibraryKey: doc.key,
                category: randomSubject.charAt(0).toUpperCase() + randomSubject.slice(1).replace('_', ' '),
                publisher: doc.publisher ? doc.publisher[0] : null,
                shelfLocation: 'New Arrivals',
              }
            });
            importedCount++;
          }
        }
      }
      
      console.log(`[Cron] Auto-curated and imported ${importedCount} new ${randomSubject} books from Open Library.`);
      
      if (importedCount > 0) {
        await prisma.auditLog.create({
          data: {
            action: 'AUTO_CURATION_IMPORT',
            description: `Weekly Auto-Curator imported ${importedCount} new books in ${randomSubject}.`,
            severity: 'INFO'
          }
        });
      }
    } catch (error) {
      console.error('[Cron] Auto-curation failed:', error);
    }
  });

"""

if "24. Open Library Nightly Auto-Enrichment" not in content:
    content = content.replace("  console.log('[Cron] Background automation jobs successfully scheduled.');", open_library_crons + "\n  console.log('[Cron] Background automation jobs successfully scheduled.');")
    with open(cron_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added Open Library Cron Jobs!")
else:
    print("Cron jobs already exist!")
