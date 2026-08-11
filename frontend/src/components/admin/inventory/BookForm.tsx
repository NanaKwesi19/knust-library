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
    barcode: '',
    tags: book?.tags?.join(', ') || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: Record<string, any> = {
        title: data.title.trim(),
        author: data.author.trim(),
        isbn: data.isbn.trim(),
        category: data.category,
        shelfLocation: data.shelfLocation.trim(),
        description: data.description.trim() || undefined,
        publisher: data.publisher.trim() || undefined,
        publishYear: data.publishYear ? Number(data.publishYear) : undefined,
        pages: data.pages ? Number(data.pages) : undefined,
        edition: data.edition.trim() || undefined,
        tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (isEditing && book) {
        delete payload.barcode;
        const res = await API.patch(`/books/${book.id}`, payload);
        return res.data;
      }

      if (!data.barcode.trim()) {
        throw new Error('Barcode is required for new books.');
      }
      payload.barcode = data.barcode.trim();

      const res = await API.post('/books', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      
      addToast(isEditing
        ? `Book Updated: "${book?.title}" has been updated.`
        : `Book Added: "${formData.title}" has been added to the catalog.`
      );
      
      clearFormData(); // Wipe the draft on successful submit
      
      // Delay modal close so toast is visible
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
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.author.trim()) newErrors.author = 'Author is required';
    if (!formData.isbn.trim()) newErrors.isbn = 'ISBN is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.shelfLocation.trim()) newErrors.shelfLocation = 'Shelf location is required';
    if (!isEditing && !formData.barcode.trim()) newErrors.barcode = 'Barcode is required for new books';
    
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
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            className={inputClass('title')}
            placeholder="Introduction to Algorithms"
          />
          {errors.title && <p className="text-[10px] text-rose-500 mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Author *
          </label>
          <input
            type="text"
            value={formData.author}
            onChange={e => setFormData(p => ({ ...p, author: e.target.value }))}
            className={inputClass('author')}
            placeholder="Thomas H. Cormen"
          />
          {errors.author && <p className="text-[10px] text-rose-500 mt-1">{errors.author}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            ISBN *
          </label>
          <input
            type="text"
            value={formData.isbn}
            onChange={e => setFormData(p => ({ ...p, isbn: e.target.value }))}
            className={inputClass('isbn')}
            placeholder="978-0-262-03384-8"
          />
          {errors.isbn && <p className="text-[10px] text-rose-500 mt-1">{errors.isbn}</p>}
        </div>
        {!isEditing && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Barcode *
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={e => setFormData(p => ({ ...p, barcode: e.target.value }))}
              className={inputClass('barcode')}
              placeholder="KNUST-BK-00001"
            />
            {errors.barcode && <p className="text-[10px] text-rose-500 mt-1">{errors.barcode}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
            className={inputClass('category')}
          >
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
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Shelf Location *
          </label>
          <input
            type="text"
            value={formData.shelfLocation}
            onChange={e => setFormData(p => ({ ...p, shelfLocation: e.target.value }))}
            className={inputClass('shelfLocation')}
            placeholder="CS-A-12"
          />
          {errors.shelfLocation && <p className="text-[10px] text-rose-500 mt-1">{errors.shelfLocation}</p>}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          className={inputClass('description')}
          placeholder="Brief description of the book..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Publisher
          </label>
          <input
            type="text"
            value={formData.publisher}
            onChange={e => setFormData(p => ({ ...p, publisher: e.target.value }))}
            className={inputClass('publisher')}
            placeholder="MIT Press"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Publish Year
          </label>
          <input
            type="number"
            value={formData.publishYear}
            onChange={e => setFormData(p => ({ ...p, publishYear: e.target.value }))}
            className={inputClass('publishYear')}
            placeholder="2009"
            min={1800}
            max={2100}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Pages
          </label>
          <input
            type="number"
            value={formData.pages}
            onChange={e => setFormData(p => ({ ...p, pages: e.target.value }))}
            className={inputClass('pages')}
            placeholder="1312"
            min={1}
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Tags (comma separated)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
          className={inputClass('tags')}
          placeholder="algorithms, data structures, computer science"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="submit"
          isLoading={mutation.isPending}
        >
          {isEditing ? 'Update Book' : 'Add Book'}
        </Button>
      </div>
    </form>
  );
};