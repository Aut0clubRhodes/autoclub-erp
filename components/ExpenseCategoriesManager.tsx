'use client';

import { useEffect, useState } from 'react';
import {
  addExpenseCategory,
  deleteExpenseCategory,
  fetchExpenseCategories,
  seedDefaultExpenseCategories,
  type ExpenseCategory,
} from '@/lib/expenseCategoriesApi';

export default function ExpenseCategoriesManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadCategories = async (seedIfEmpty = true) => {
    const loadedCategories = await fetchExpenseCategories();
    if (seedIfEmpty && loadedCategories.length === 0) {
      const seededCategories = await seedDefaultExpenseCategories();
      setCategories(seededCategories);
      return;
    }

    setCategories(loadedCategories);
  };

  useEffect(() => {
    loadCategories(false);
  }, []);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;

    const created = await addExpenseCategory(name);
    if (!created) return;

    setNewCategory('');
    loadCategories(false);
  };
  const handleDeleteCategory = async (category: ExpenseCategory) => {
    const confirmed = window.confirm(`Να διαγραφεί η κατηγορία "${category.name}";`);
    if (!confirmed) return;

    const categoryId = Number(category.id);
    console.log('Deleting category id:', categoryId, category.name);
    setErrorMessage('');
    const result = await deleteExpenseCategory(categoryId);
    if (!result.success) {
      if (result.code === '401') {
        console.error('Delete expense category unauthorized. DELETE policy may be missing.', result);
      }

      const message =
        result.code === '409' || result.code === '23503'
          ? 'Δεν μπορεί να διαγραφεί γιατί χρησιμοποιείται σε καταχωρήσεις εξόδων.'
          : `Δεν έγινε διαγραφή: ${result.error || ''}`.trim();

      alert(message);
      setErrorMessage(message);
      return;
    }

    await loadCategories(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="Νέα κατηγορία εξόδου"
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white"
        />
        <button
          type="button"
          onClick={handleAddCategory}
          className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-3 rounded-xl font-medium"
        >
          Προσθήκη
        </button>
      </div>

      <div className="space-y-3">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Αναζήτηση κατηγορίας..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
        />
        {errorMessage && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"
          >
            <span className="text-white">{category.name}</span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleDeleteCategory(category);
              }}
              className="pointer-events-auto text-red-500 hover:text-red-400"
            >
              Διαγραφή
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
