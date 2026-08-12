import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { getMyBookReservations, reserveBookForStudent } from '../controllers/student-reservation.controller.js';

const router = Router();

router.use(protect);

router.post('/books/:bookId', reserveBookForStudent);
router.get('/my', getMyBookReservations);

export default router;
