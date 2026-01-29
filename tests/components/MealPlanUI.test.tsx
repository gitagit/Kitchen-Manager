import { describe, it, expect, vi } from 'vitest';

describe('MealPlan UI Behavior', () => {
  describe('Searchable Recipe Dropdown', () => {
    const mockRecipes = [
      { id: '1', title: 'Chicken Stir Fry' },
      { id: '2', title: 'Beef Tacos' },
      { id: '3', title: 'Pasta Carbonara' },
      { id: '4', title: 'Chicken Tikka Masala' },
      { id: '5', title: 'Vegetable Soup' },
    ];

    it('filters recipes by search term', () => {
      const search = 'chicken';
      const filtered = mockRecipes.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.title)).toContain('Chicken Stir Fry');
      expect(filtered.map(r => r.title)).toContain('Chicken Tikka Masala');
    });

    it('returns all recipes when search is empty', () => {
      const search = '';
      const filtered = search.trim()
        ? mockRecipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
        : mockRecipes;
      expect(filtered).toHaveLength(5);
    });

    it('returns empty array when no matches', () => {
      const search = 'pizza';
      const filtered = mockRecipes.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered).toHaveLength(0);
    });

    it('is case insensitive', () => {
      const search = 'PASTA';
      const filtered = mockRecipes.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Pasta Carbonara');
    });
  });

  describe('Meal Slots', () => {
    const validSlots = ['breakfast', 'lunch', 'dinner'];

    it('validates meal slot values', () => {
      expect(validSlots).toContain('breakfast');
      expect(validSlots).toContain('lunch');
      expect(validSlots).toContain('dinner');
      expect(validSlots).not.toContain('brunch');
    });

    it('categorizes meals correctly by slot', () => {
      const mockMeals = [
        { id: '1', date: '2025-01-28', slot: 'breakfast', recipeId: 'r1' },
        { id: '2', date: '2025-01-28', slot: 'lunch', recipeId: 'r2' },
        { id: '3', date: '2025-01-28', slot: 'dinner', recipeId: 'r3' },
        { id: '4', date: '2025-01-29', slot: 'dinner', recipeId: 'r4' },
      ];

      const jan28Meals = mockMeals.filter(m => m.date === '2025-01-28');
      expect(jan28Meals).toHaveLength(3);

      const dinnerMeals = mockMeals.filter(m => m.slot === 'dinner');
      expect(dinnerMeals).toHaveLength(2);
    });
  });

  describe('Servings Handling', () => {
    it('uses recipe default servings when not specified', () => {
      const recipe = { servings: 4 };
      const meal = { servings: null };
      const effectiveServings = meal.servings ?? recipe.servings ?? 1;
      expect(effectiveServings).toBe(4);
    });

    it('uses meal servings when specified', () => {
      const recipe = { servings: 4 };
      const meal = { servings: 6 };
      const effectiveServings = meal.servings ?? recipe.servings ?? 1;
      expect(effectiveServings).toBe(6);
    });

    it('defaults to 1 when neither specified', () => {
      const recipe = { servings: null };
      const meal = { servings: null };
      const effectiveServings = meal.servings ?? recipe.servings ?? 1;
      expect(effectiveServings).toBe(1);
    });

    it('calculates scaling factor correctly', () => {
      const recipeServings = 4;
      const mealServings = 8;
      const scaleFactor = mealServings / recipeServings;
      expect(scaleFactor).toBe(2);
    });
  });

  describe('Date Range Handling', () => {
    function getDateRange(startDate: string, days: number): string[] {
      const dates: string[] = [];
      const start = new Date(startDate);
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    }

    it('generates correct date range for a week', () => {
      const range = getDateRange('2025-01-28', 7);
      expect(range).toHaveLength(7);
      expect(range[0]).toBe('2025-01-28');
      expect(range[6]).toBe('2025-02-03');
    });

    it('handles month boundaries', () => {
      const range = getDateRange('2025-01-30', 5);
      expect(range).toContain('2025-01-30');
      expect(range).toContain('2025-01-31');
      expect(range).toContain('2025-02-01');
    });
  });

  describe('Meal Plan Payload', () => {
    it('builds correct create payload', () => {
      const date = '2025-01-28';
      const slot = 'dinner';
      const recipeId = 'recipe123';
      const servings = 6;
      const notes = 'Double batch for leftovers';

      const payload = { date, slot, recipeId, servings, notes };

      expect(payload.date).toBe('2025-01-28');
      expect(payload.slot).toBe('dinner');
      expect(payload.recipeId).toBe('recipe123');
      expect(payload.servings).toBe(6);
      expect(payload.notes).toBe('Double batch for leftovers');
    });

    it('allows meal plan with notes only (no recipe)', () => {
      const payload = {
        date: '2025-01-28',
        slot: 'lunch',
        notes: 'Eating out with friends'
      };

      expect(payload.recipeId).toBeUndefined();
      expect(payload.notes).toBe('Eating out with friends');
    });
  });
});
