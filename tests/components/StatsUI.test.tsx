import { describe, it, expect } from 'vitest';

describe('Stats UI Behavior', () => {
  describe('Cuisine Statistics', () => {
    const mockMeals = [
      { recipe: { id: 'r1', title: 'Chicken Stir Fry', cuisine: 'Chinese' } },
      { recipe: { id: 'r2', title: 'Beef Tacos', cuisine: 'Mexican' } },
      { recipe: { id: 'r3', title: 'Kung Pao Chicken', cuisine: 'Chinese' } },
      { recipe: { id: 'r4', title: 'Pasta Carbonara', cuisine: 'Italian' } },
      { recipe: { id: 'r5', title: 'Fried Rice', cuisine: 'Chinese' } },
    ];

    it('counts meals by cuisine', () => {
      const counts = new Map<string, number>();
      for (const meal of mockMeals) {
        const cuisine = meal.recipe.cuisine || 'Unknown';
        counts.set(cuisine, (counts.get(cuisine) || 0) + 1);
      }

      expect(counts.get('Chinese')).toBe(3);
      expect(counts.get('Mexican')).toBe(1);
      expect(counts.get('Italian')).toBe(1);
    });

    it('sorts cuisines by count descending', () => {
      const counts = new Map<string, number>();
      for (const meal of mockMeals) {
        const cuisine = meal.recipe.cuisine || 'Unknown';
        counts.set(cuisine, (counts.get(cuisine) || 0) + 1);
      }

      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      expect(sorted[0][0]).toBe('Chinese');
      expect(sorted[0][1]).toBe(3);
    });

    it('calculates percentage correctly', () => {
      const total = mockMeals.length;
      const chineseCount = 3;
      const percentage = Math.round((chineseCount / total) * 100);
      expect(percentage).toBe(60);
    });
  });

  describe('Recipe Frequency', () => {
    const mockMeals = [
      { recipe: { id: 'r1', title: 'Chicken Stir Fry' } },
      { recipe: { id: 'r2', title: 'Beef Tacos' } },
      { recipe: { id: 'r1', title: 'Chicken Stir Fry' } },
      { recipe: { id: 'r1', title: 'Chicken Stir Fry' } },
      { recipe: { id: 'r3', title: 'Pasta' } },
    ];

    it('counts recipe occurrences', () => {
      const counts = new Map<string, { title: string; count: number }>();
      for (const meal of mockMeals) {
        const existing = counts.get(meal.recipe.id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(meal.recipe.id, { title: meal.recipe.title, count: 1 });
        }
      }

      expect(counts.get('r1')?.count).toBe(3);
      expect(counts.get('r2')?.count).toBe(1);
    });

    it('identifies most cooked recipes', () => {
      const counts = new Map<string, { title: string; count: number }>();
      for (const meal of mockMeals) {
        const existing = counts.get(meal.recipe.id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(meal.recipe.id, { title: meal.recipe.title, count: 1 });
        }
      }

      const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
      expect(sorted[0].title).toBe('Chicken Stir Fry');
      expect(sorted[0].count).toBe(3);
    });
  });

  describe('Technique Statistics', () => {
    const mockRecipes = [
      {
        id: 'r1',
        techniques: [
          { technique: { name: 'stir-frying' } },
          { technique: { name: 'knife skills' } }
        ]
      },
      {
        id: 'r2',
        techniques: [
          { technique: { name: 'grilling' } }
        ]
      },
      {
        id: 'r3',
        techniques: [
          { technique: { name: 'stir-frying' } },
          { technique: { name: 'seasoning' } }
        ]
      },
    ];

    it('counts technique usage', () => {
      const counts = new Map<string, number>();
      for (const recipe of mockRecipes) {
        for (const t of recipe.techniques) {
          const name = t.technique.name;
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      }

      expect(counts.get('stir-frying')).toBe(2);
      expect(counts.get('grilling')).toBe(1);
    });

    it('identifies most practiced techniques', () => {
      const counts = new Map<string, number>();
      for (const recipe of mockRecipes) {
        for (const t of recipe.techniques) {
          const name = t.technique.name;
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      }

      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      expect(sorted[0][0]).toBe('stir-frying');
    });
  });

  describe('Link Generation', () => {
    it('generates correct recipe search link', () => {
      const recipeTitle = 'Chicken Stir Fry';
      const link = `/recipes?search=${encodeURIComponent(recipeTitle)}`;
      expect(link).toBe('/recipes?search=Chicken%20Stir%20Fry');
    });

    it('handles special characters in recipe titles', () => {
      const recipeTitle = "Grandma's Famous Pie & Cookies";
      const link = `/recipes?search=${encodeURIComponent(recipeTitle)}`;
      // Note: apostrophe ' is not encoded by encodeURIComponent
      expect(link).toContain("Grandma's");
      expect(link).toContain('%26'); // & is encoded
    });
  });

  describe('Time Period Filtering', () => {
    const mockMeals = [
      { date: '2025-01-01', recipe: { title: 'A' } },
      { date: '2025-01-15', recipe: { title: 'B' } },
      { date: '2025-01-28', recipe: { title: 'C' } },
      { date: '2024-12-15', recipe: { title: 'D' } },
    ];

    it('filters meals by month', () => {
      const targetMonth = '2025-01';
      const filtered = mockMeals.filter(m => m.date.startsWith(targetMonth));
      expect(filtered).toHaveLength(3);
    });

    it('filters meals within date range', () => {
      const startDate = '2025-01-10';
      const endDate = '2025-01-31';
      const filtered = mockMeals.filter(m =>
        m.date >= startDate && m.date <= endDate
      );
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Cost Statistics', () => {
    const mockMeals = [
      { recipe: { costEstimateCents: 1500 } },
      { recipe: { costEstimateCents: 2000 } },
      { recipe: { costEstimateCents: 1200 } },
      { recipe: { costEstimateCents: null } },
    ];

    it('calculates total cost', () => {
      const total = mockMeals.reduce((sum, m) =>
        sum + (m.recipe.costEstimateCents || 0), 0
      );
      expect(total).toBe(4700);
    });

    it('calculates average cost', () => {
      const mealsWithCost = mockMeals.filter(m => m.recipe.costEstimateCents);
      const total = mealsWithCost.reduce((sum, m) =>
        sum + (m.recipe.costEstimateCents || 0), 0
      );
      const average = Math.round(total / mealsWithCost.length);
      expect(average).toBe(1567); // 4700 / 3 rounded
    });

    it('formats cost correctly', () => {
      const costCents = 1567;
      const formatted = `$${(costCents / 100).toFixed(2)}`;
      expect(formatted).toBe('$15.67');
    });
  });
});
