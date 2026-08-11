import { Router, Request, Response } from 'express';
import { Role, CopyStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);

// ==========================================
// PUBLIC / STUDENT ROUTES
// ==========================================

/**
 * GET: /api/v1/books?page=1&limit=10
 * Paginated list of all books
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, category, status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { isbn: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (category && category !== 'ALL') where.category = category as string;
    if (status && status !== 'ALL') where.status = status as string;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          copies: {
            select: {
              id: true,
              barcode: true,
              status: true
            }
          },
          _count: {
            select: {
              copies: true
            }
          }
        }
      }),
      prisma.book.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: books,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Books fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve books.' });
  }
});

/**
 * POST: /api/v1/books
 * Create a new book (Admin/Librarian only)
 */
router.post('/', restrictTo(Role.LIBRARIAN, Role.ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, author, isbn, category, shelfLocation, description, publisher, publishYear, barcode, copies } = req.body;

    if (!title || !author || !isbn || !category || !shelfLocation) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, author, isbn, category, shelfLocation.'
      });
      return;
    }

    const newBook = await prisma.$transaction(async (tx) => {
      const existingBook = await tx.book.findUnique({ where: { isbn } });
      if (existingBook) {
        throw new Error('A book with this ISBN already exists.');
      }

      // If single barcode provided, check it
      if (barcode) {
        const existingCopy = await tx.bookCopy.findUnique({ where: { barcode } });
        if (existingCopy) {
          throw new Error('This barcode is already in use.');
        }
      }

      const createdBook = await tx.book.create({
        data: {
          title,
          author,
          isbn,
          category,
          shelfLocation,
          description: description || null,
          publisher: publisher || null,
          publishYear: publishYear ? parseInt(publishYear) : null
        }
      });

      // Create copies if provided, otherwise create one with generated barcode
      const copiesToCreate = copies && copies.length > 0
        ? copies.map((copy: any) => ({
            barcode: copy.barcode,
            status: copy.status || CopyStatus.AVAILABLE,
            condition: copy.condition || 'GOOD'
          }))
        : barcode
          ? [{ barcode, status: CopyStatus.AVAILABLE, condition: 'GOOD' }]
          : [{ barcode: `${isbn}-001`, status: CopyStatus.AVAILABLE, condition: 'GOOD' }];

      for (const copyData of copiesToCreate) {
        await tx.bookCopy.create({
          data: {
            barcode: copyData.barcode,
            status: copyData.status,
            condition: copyData.condition,
            bookId: createdBook.id
          }
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE_BOOK',
          description: `Created book: "${title}" (ISBN: ${isbn})`,
          userId: req.user!.id
        }
      });

      return createdBook;
    });

    const bookWithCopies = await prisma.book.findUnique({
      where: { id: newBook.id },
      include: {
        copies: {
          select: { id: true, barcode: true, status: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Book created successfully.',
      data: bookWithCopies
    });
  } catch (error: any) {
    console.error('Book creation error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create book.' });
  }
});

/**
 * GET: /api/v1/books/inventory
 * Streams complete library book collection with copy status
 */
router.get('/inventory', restrictTo(Role.LIBRARIAN, Role.ADMIN, Role.STUDENT, Role.STAFF), async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { isbn: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (category && category !== 'ALL') where.category = category as string;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          copies: {
            select: { id: true, barcode: true, status: true }
          }
        },
        orderBy: { title: 'asc' },
        skip,
        take
      }),
      prisma.book.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: { data: books, total, page: parseInt(page as string), totalPages: Math.ceil(total / take) }
    });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve inventory.' });
  }
});

/**
 * GET: /api/v1/books/:id
 * Single book detail
 */
router.get('/:id', restrictTo(Role.LIBRARIAN, Role.ADMIN, Role.STUDENT, Role.STAFF), async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = req.params.id;
    const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        copies: {
          select: { id: true, barcode: true, status: true }
        }
      }
    });

    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found.' });
      return;
    }

    res.status(200).json({ success: true, data: book });
  } catch (error) {
    console.error('Book detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve book.' });
  }
});

// ==========================================
// ADMIN / LIBRARIAN ROUTES
// ==========================================

router.use(restrictTo(Role.LIBRARIAN, Role.ADMIN));

/**
 * POST: /api/v1/books/register
 * Register new book with first copy (legacy endpoint, redirects to POST /)
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, author, isbn, category, shelfLocation, description, publisher, publishYear, barcode } = req.body;

    if (!title || !author || !isbn || !category || !shelfLocation || !barcode) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, author, isbn, category, shelfLocation, barcode.'
      });
      return;
    }

    const newCatalogEntry = await prisma.$transaction(async (tx) => {
      const existingBook = await tx.book.findUnique({ where: { isbn } });
      if (existingBook) {
        throw new Error('A book with this ISBN already exists.');
      }

      const existingCopy = await tx.bookCopy.findUnique({ where: { barcode } });
      if (existingCopy) {
        throw new Error('This barcode is already in use.');
      }

      const createdBook = await tx.book.create({
        data: {
          title,
          author,
          isbn,
          category,
          shelfLocation,
          description: description || null,
          publisher: publisher || null,
          publishYear: publishYear ? parseInt(publishYear) : null
        }
      });

      await tx.bookCopy.create({
        data: {
          barcode,
          status: CopyStatus.AVAILABLE,
          bookId: createdBook.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'REGISTER_NEW_BOOK',
          description: `Cataloged "${title}" (ISBN: ${isbn}) with barcode ${barcode}`,
          userId: req.user!.id
        }
      });

      return createdBook;
    });

    res.status(201).json({
      success: true,
      message: 'Book cataloged successfully.',
      data: newCatalogEntry
    });
  } catch (error: any) {
    console.error('Book registration error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to catalog book.' });
  }
});

/**
 * PATCH: /api/v1/books/:id
 * Update book details
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const { title, author, isbn, category, shelfLocation, description, publisher, publishYear } = req.body;

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Book not found.' });
      return;
    }

    if (isbn && isbn !== existing.isbn) {
      const duplicate = await prisma.book.findUnique({ where: { isbn } });
      if (duplicate) {
        res.status(400).json({ success: false, error: 'ISBN already in use by another book.' });
        return;
      }
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(isbn && { isbn }),
        ...(category && { category }),
        ...(shelfLocation && { shelfLocation }),
        ...(description !== undefined && { description }),
        ...(publisher !== undefined && { publisher }),
        ...(publishYear !== undefined && { publishYear: parseInt(publishYear) })
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_BOOK',
        description: `Updated "${updated.title}" (ID: ${id})`,
        userId: req.user!.id
      }
    });

    res.status(200).json({ success: true, message: 'Book updated.', data: updated });
  } catch (error) {
    console.error('Book update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update book.' });
  }
});

/**
 * DELETE: /api/v1/books/:id
 * Delete a book and all its copies
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);

    const book = await prisma.book.findUnique({
      where: { id },
      include: { copies: true }
    });

    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found.' });
      return;
    }

    const activeLoans = await prisma.loan.count({
      where: {
        copy: { bookId: id },
        status: { in: ['BORROWED', 'RENEWED'] }
      }
    });

    if (activeLoans > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete: ${activeLoans} active loan(s) exist for this book.`
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.bookCopy.deleteMany({ where: { bookId: id } });
      await tx.book.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_BOOK',
          description: `Deleted "${book.title}" (ISBN: ${book.isbn}) and ${book.copies.length} copies`,
          userId: req.user!.id
        }
      });
    });

    res.status(200).json({ success: true, message: 'Book deleted.' });
  } catch (error) {
    console.error('Book deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete book.' });
  }
});

/**
 * POST: /api/v1/books/bulk-delete
 * Delete multiple books
 */
router.post('/bulk-delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'Array of book IDs required.' });
      return;
    }

    const activeLoans = await prisma.loan.count({
      where: {
        copy: { bookId: { in: ids } },
        status: { in: ['BORROWED', 'RENEWED'] }
      }
    });

    if (activeLoans > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete: ${activeLoans} active loan(s) exist for selected books.`
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.bookCopy.deleteMany({ where: { bookId: { in: ids } } });
      await tx.book.deleteMany({ where: { id: { in: ids } } });

      await tx.auditLog.create({
        data: {
          action: 'BULK_DELETE_BOOKS',
          description: `Bulk deleted ${ids.length} books`,
          userId: req.user!.id
        }
      });
    });

    res.status(200).json({ success: true, message: `${ids.length} books deleted.` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete books.' });
  }
});

/**
 * POST: /api/v1/books/import-csv
 * Bulk import books from CSV
 */
router.post('/import-csv', async (req: Request, res: Response): Promise<void> => {
  try {
    const { books } = req.body;

    if (!Array.isArray(books) || books.length === 0) {
      res.status(400).json({ success: false, error: 'Array of book objects required.' });
      return;
    }

    const results = { created: 0, failed: 0, errors: [] as string[] };

    for (const bookData of books) {
      try {
        const { title, author, isbn, category, shelfLocation, barcode } = bookData;

        if (!title || !author || !isbn || !category || !shelfLocation || !barcode) {
          results.failed++;
          results.errors.push(`Missing fields for: ${title || 'unknown'}`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          const existing = await tx.book.findUnique({ where: { isbn } });
          if (existing) {
            const copyExists = await tx.bookCopy.findUnique({ where: { barcode } });
            if (copyExists) throw new Error(`Barcode ${barcode} already exists`);

            await tx.bookCopy.create({
              data: { barcode, status: CopyStatus.AVAILABLE, bookId: existing.id }
            });
          } else {
            const newBook = await tx.book.create({
              data: {
                title,
                author,
                isbn,
                category,
                shelfLocation,
                description: bookData.description || null,
                publisher: bookData.publisher || null,
                publishYear: bookData.publishYear ? parseInt(bookData.publishYear) : null
              }
            });

            await tx.bookCopy.create({
              data: { barcode, status: CopyStatus.AVAILABLE, bookId: newBook.id }
            });
          }
        });

        results.created++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${bookData.title || 'unknown'}: ${err.message}`);
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'IMPORT_CSV',
        description: `CSV import: ${results.created} created, ${results.failed} failed`,
        userId: req.user!.id
      }
    });

    res.status(200).json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.failed} failed.`,
      data: results
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ success: false, error: 'Failed to import books.' });
  }
});
/**
 * POST /api/v1/books/import-open-library
 * Import a book from Open Library into the catalog
 */
router.post('/import-open-library', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, author, isbn, publishedYear, coverUrl, openLibraryKey, genre } = req.body;

    if (!title || !author) {
      res.status(400).json({ success: false, error: 'Title and author are required.' });
      return;
    }

    // Check if book already exists by ISBN or Open Library key
    const existing = await prisma.book.findFirst({
      where: {
        OR: [
          ...(isbn ? [{ isbn }] : []),
          { openLibraryKey: openLibraryKey || undefined },
        ].filter(Boolean) as any,
      },
    });

    if (existing) {
      res.status(409).json({ success: false, error: 'This book already exists in the catalog.' });
      return;
    }

    const fallbackIsbn = isbn || `OL-${openLibraryKey || Date.now()}`;
    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn: fallbackIsbn,
        publishYear: publishedYear || null,
        coverUrl: coverUrl || null,
        coverImage: coverUrl || null,
        openLibraryKey: openLibraryKey || null,
        category: genre || 'Uncategorized',
        publisher: null,
        shelfLocation: 'New Arrivals',
        copies: {
          create: [
            { barcode: `LIB-${Date.now().toString().slice(-6)}-1` },
            { barcode: `LIB-${Date.now().toString().slice(-6)}-2` },
            { barcode: `LIB-${Date.now().toString().slice(-6)}-3` }
          ]
        }
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'IMPORT',
        description: `Imported "${title}" from Open Library`,
        userId: req.user!.id,
      },
    });

    res.status(201).json({ success: true, message: 'Book imported.', data: book });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: 'Failed to import book.' });
  }
});

export default router;