import React, { useState } from 'react';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Button } from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import type { BookRecord } from '../../../types/admin';

interface BookFormProps {
  book?: BookRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const safeString = (value: unknown): string => (value == null ? '' : String(value));

export const BookForm: React.FC<BookFormProps> = ({ book, onSuccess, onCancel }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!book;

  const [formData, setFormData, clearFormData] = useAutoSave('knust_book_form', {
    title: book?.title || '',
    author: book?.author || '',
    isbn: book?.isbn || '',
    category: book?.category || '',
    shelfLocation: book?.shelfLocation || '',
    description: book?.description || '',
    publisher: book?.publisher || '',
    publishYear: book?.publishYear ? String(book.publishYear) : '',
    edition: book?.edition || '',
    pages: book?.pages ? String(book.pages) : '',
    copiesCount: '1',
    barcodePrefix: '',
    tags: book?.tags?.join(', ') || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const title = safeString(data.title);
      const author = safeString(data.author);
      const isbn = safeString(data.isbn);
      const category = safeString(data.category);
      const shelfLocation = safeString(data.shelfLocation);
      const description = safeString(data.description);
      const publisher = safeString(data.publisher);
      const publishYear = safeString(data.publishYear);
      const pages = safeString(data.pages);
      const edition = safeString(data.edition);
      const tags = safeString(data.tags);
      const copiesCountValue = safeString(data.copiesCount);
      const barcodePrefix = safeString(data.barcodePrefix);

      const payload: Record<string, any> = {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        category,
        shelfLocation: shelfLocation.trim(),
        description: description.trim() || undefined,
        publisher: publisher.trim() || undefined,
        publishYear: publishYear ? Number(publishYear) : undefined,
        pages: pages ? Number(pages) : undefined,
        edition: edition.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (isEditing && book) {
        const res = await API.patch(`/books/${book.id}`, payload);
        return res.data;
      }

      const copiesCount = Math.max(1, Math.min(1000, Number(copiesCountValue) || 1));
      const prefix = barcodePrefix.trim() || isbn.trim() || 'BOOK';

      payload.copies = Array.from({ length: copiesCount }, (_, index) => ({
        barcode: `${prefix}-${String(index + 1).padStart(3, '0')}`,
        status: 'AVAILABLE',
        condition: 'GOOD',
      }));

      const res = await API.post('/books', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.refetchQueries({ queryKey: ['books'], type: 'active' });

      addToast(isEditing
        ? `Book Updated: "${safeString(book?.title)}" has been updated.`
        : `Book Added: "${safeString(formData.title)}" with ${Math.max(1, Number(safeString(formData.copiesCount)) || 1)} physical copy/copies has been added to the catalog.`
      );

      clearFormData();

      setTimeout(() => {
        onSuccess();
      }, 300);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error
        || error?.message
        || 'Something went wrong while saving the book.';
      addToast(`Error: ${message}`);
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!safeString(formData.title).trim()) newErrors.title = 'Title is required';
    if (!safeString(formData.author).trim()) newErrors.author = 'Author is required';
    if (!safeString(formData.isbn).trim()) newErrors.isbn = 'ISBN is required';
    if (!safeString(formData.category)) newErrors.category = 'Category is required';
    if (!safeString(formData.shelfLocation).trim()) newErrors.shelfLocation = 'Shelf location is required';

    if (!isEditing) {
      const copiesCount = Number(safeString(formData.copiesCount));
      if (!Number.isInteger(copiesCount) || copiesCount < 1 || copiesCount > 1000) {
        newErrors.copiesCount = 'Enter a whole number from 1 to 1000';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Validation Error: Please fill in all required fields.');
      return;
    }
    mutation.mutate(formData);
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all ${
      errors[field] ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Title *</label>
          <input type="text" value={safeString(formData.title)} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className={inputClass('title')} placeholder="Introduction to Algorithms" />
          {errors.title && <p className="text-[10px] text-rose-500 mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Author *</label>
          <input type="text" value={safeString(formData.author)} onChange={e => setFormData(p => ({ ...p, author: e.target.value }))} className={inputClass('author')} placeholder="Thomas H. Cormen" />
          {errors.author && <p className="text-[10px] text-rose-500 mt-1">{errors.author}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">ISBN *</label>
          <input type="text" value={safeString(formData.isbn)} onChange={e => setFormData(p => ({ ...p, isbn: e.target.value }))} className={inputClass('isbn')} placeholder="978-0-262-03384-8" />
          {errors.isbn && <p className="text-[10px] text-rose-500 mt-1">{errors.isbn}</p>}
        </div>
        {!isEditing && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Number of Copies *</label>
            <input type="number" min={1} max={1000} step={1} value={safeString(formData.copiesCount)} onChange={e => setFormData(p => ({ ...p, copiesCount: e.target.value }))} className={inputClass('copiesCount')} placeholder="10" />
            {errors.copiesCount && <p className="text-[10px] text-rose-500 mt-1">{errors.copiesCount}</p>}
            <p className="text-[9px] text-slate-400 mt-1">Physical copies to add to inventory.</p>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Copy Identification</div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Barcode Prefix</label>
          <input type="text" value={safeString(formData.barcodePrefix)} onChange={e => setFormData(p => ({ ...p, barcodePrefix: e.target.value }))} className={inputClass('barcodePrefix')} placeholder="Leave blank to use ISBN" />
          <p className="text-[9px] text-slate-400 mt-1">Copies will be generated as PREFIX-001, PREFIX-002, etc.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category *</label>
          <select value={safeString(formData.category)} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputClass('category')}>
            <option value="">Select category</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Engineering">Engineering</option>
            <option value="Medicine">Medicine</option>
            <option value="Business">Business</option>
            <option value="Arts">Arts</option>
            <option value="Science">Science</option>
            <option value="Law">Law</option>
            <option value="Agriculture">Agriculture</option>
          </select>
          {errors.category && <p className="text-[10px] text-rose-500 mt-1">{errors.category}</p>}
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Shelf Location *</label>
          <input type="text" value={safeString(formData.shelfLocation)} onChange={e => setFormData(p => ({ ...p, shelfLocation: e.target.value }))} className={inputClass('shelfLocation')} placeholder="CS-A-12" />
          {errors.shelfLocation && <p className="text-[10px] text-rose-500 mt-1">{errors.shelfLocation}</p>}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Description</label>
        <textarea value={safeString(formData.description)} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className={inputClass('description')} placeholder="Brief description of the book..." rows={3} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Publisher</label>
          <input type="text" value={safeString(formData.publisher)} onChange={e => setFormData(p => ({ ...p, publisher: e.target.value }))} className={inputClass('publisher')} placeholder="MIT Press" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Publish Year</label>
          <input type="number" value={safeString(formData.publishYear)} onChange={e => setFormData(p => ({ ...p, publishYear: e.target.value }))} className={inputClass('publishYear')} placeholder="2009" min={1800} max={2100} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Pages</label>
          <input type="number" value={safeString(formData.pages)} onChange={e => setFormData(p => ({ ...p, pages: e.target.value }))} className={inputClass('pages')} placeholder="1312" min={1} />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tags (comma separated)</label>
        <input type="text" value={safeString(formData.tags)} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} className={inputClass('tags')} placeholder="algorithms, data structures, computer science" />
      </div>

      {!isEditing && Number(safeString(formData.copiesCount)) > 0 && Number(safeString(formData.copiesCount)) <= 1000 && (
        <div className="rounded-xl border border-[#7A1C2C]/10 bg-[#7A1C2C]/5 p-3">
          <div className="text-[10px] font-black text-[#7A1C2C] uppercase tracking-wider">Inventory Preview</div>
          <p className="text-[10px] text-slate-500 mt-1">
            {safeString(formData.copiesCount)} physical {Number(safeString(formData.copiesCount)) === 1 ? 'copy' : 'copies'} will be created as Available.
          </p>
          <p className="text-[9px] text-slate-400 mt-1">
            Example: {(safeString(formData.barcodePrefix).trim() || safeString(formData.isbn).trim() || 'ISBN')}-001, {(safeString(formData.barcodePrefix).trim() || safeString(formData.isbn).trim() || 'ISBN')}-002
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">Cancel</Button>
        <Button variant="primary" size="sm" type="submit" isLoading={mutation.isPending}>
          {isEditing ? 'Update Book' : 'Add Book & Inventory'}
        </Button>
      </div>
    </form>
  );
};