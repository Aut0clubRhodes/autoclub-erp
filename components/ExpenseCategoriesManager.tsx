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
  const [errorMessage, setErrorMessage] = useState('');

  const loadCategories = async () => {
    const loadedCategories = await fetchExpenseCategories();
    if (loadedCategories.length === 0) {
      const seededCategories = await seedDefaultExpenseCategories();
      setCategories(seededCategories);
      return;
    }

    setCategories(loadedCategories);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;

    const created = await addExpenseCategory(name);
    if (!created) return;

    setNewCategory('');
    loadCategories();
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    const confirmed = window.confirm(`Να διαγραφεί η κατηγορία "${category.name}";`);
    if (!confirmed) return;

    setErrorMessage('');
    const deleted = await deleteExpenseCategory(category.id);
    if (!deleted) {
      const message = 'Η διαγραφή της κατηγορίας απέτυχε.';
      console.error(message, category);
      setErrorMessage(message);
      return;
    }

    loadCategories();
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
        {errorMessage && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}
        {categories.map((category) => (
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
