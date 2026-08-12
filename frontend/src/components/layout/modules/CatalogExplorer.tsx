import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';
import LibraryTransactionRules, { type LibraryTransactionType } from './LibraryTransactionRules';
import {
  Search, CheckCircle, XCircle, MapPin, Bookmark, Loader2, BookOpen
} from 'lucide-react';

interface BookCopy {
  id: number;
  barcode: string;
  status: 'AVAILABLE' | 'CHECKED_OUT' | 'RESERVED' | 'DAMAGED';
}

interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description?: string;
  publisher?: string;
  publishYear?: number;
  shelfLocation: string;
  coverImage?: string;
  coverUrl?: string;
  totalCopies: number;
  availableCopies: number;
  copies?: BookCopy[];
}
