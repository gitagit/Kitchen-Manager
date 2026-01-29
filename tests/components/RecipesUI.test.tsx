import { describe, it, expect, vi } from 'vitest';

describe('Recipes UI Behavior', () => {
  describe('Filtering Logic', () => {
    const mockRecipes = [
      { id: '1', title: 'Chicken Stir Fry', cuisine: 'Chinese', source: 'PERSONAL', ingredients: [], techniques: [] },
      { id: '2', title: 'Beef Tacos', cuisine: 'Mexican', source: 'WEB', ingredients: [], techniques: [] },
      { id: '3', title: 'Pasta Carbonara', cuisine: 'Italian', source: 'COOKBOOK', ingredients: [], techniques: [] },
      { id: '4', title: 'Chicken Tikka', cuisine: 'Indian', source: 'PERSONAL', ingredients: [], techniques: [] },
    ];

    it('filters recipes by search query', () => {
      const searchQuery = 'chicken';
      const filtered = mockRecipes.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.title)).toContain('Chicken Stir Fry');
      expect(filtered.map(r => r.title)).toContain('Chicken Tikka');
    });

    it('filters recipes by cuisine', () => {
      const filterCuisine = 'Italian';
      const filtered = mockRecipes.filter(r => r.cuisine === filterCuisine);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Pasta Carbonara');
    });

    it('filters recipes by source', () => {
      const filterSource = 'PERSONAL';
      const filtered = mockRecipes.filter(r => r.source === filterSource);
      expect(filtered).toHaveLength(2);
    });

    it('combines multiple filters', () => {
      const searchQuery = 'chicken';
      const filterCuisine = 'Chinese';

      const filtered = mockRecipes.filter(r => {
        if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterCuisine && r.cuisine !== filterCuisine) return false;
        return true;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Chicken Stir Fry');
    });

    it('returns all recipes when no filters applied', () => {
      const searchQuery = '';
      const filterCuisine = '';

      const filtered = mockRecipes.filter(r => {
        if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterCuisine && r.cuisine !== filterCuisine) return false;
        return true;
      });

      expect(filtered).toHaveLength(4);
    });
  });

  describe('Recipe Scaling', () => {
    function scaleQuantity(qty: string, factor: number): string {
      const match = qty.match(/^([\d./]+)\s*(.*)$/);
      if (!match) return qty;

      const numStr = match[1];
      const unit = match[2];

      let num: number;
      if (numStr.includes('/')) {
        const [n, d] = numStr.split('/').map(Number);
        num = n / d;
      } else {
        num = parseFloat(numStr);
      }

      const scaled = num * factor;

      // Format nicely
      if (Number.isInteger(scaled)) {
        return `${scaled} ${unit}`.trim();
      }
      return `${scaled.toFixed(2).replace(/\.?0+$/, '')} ${unit}`.trim();
    }

    it('scales integer quantities', () => {
      expect(scaleQuantity('2 cups', 2)).toBe('4 cups');
      expect(scaleQuantity('1 lb', 3)).toBe('3 lb');
    });

    it('scales decimal quantities', () => {
      expect(scaleQuantity('0.5 cup', 2)).toBe('1 cup');
      expect(scaleQuantity('1.5 tsp', 2)).toBe('3 tsp');
    });

    it('scales fraction quantities', () => {
      expect(scaleQuantity('1/2 cup', 2)).toBe('1 cup');
      expect(scaleQuantity('1/4 tsp', 4)).toBe('1 tsp');
    });

    it('handles quantities without units', () => {
      expect(scaleQuantity('2', 3)).toBe('6');
    });

    it('handles non-numeric quantities gracefully', () => {
      expect(scaleQuantity('pinch of salt', 2)).toBe('pinch of salt');
      expect(scaleQuantity('to taste', 2)).toBe('to taste');
    });
  });

  describe('Substitutions Display', () => {
    const mockIngredients = [
      { name: 'butter', quantityText: '2 tbsp', substitutions: ['margarine', 'coconut oil'] },
      { name: 'milk', quantityText: '1 cup', substitutions: ['oat milk', 'almond milk'] },
      { name: 'salt', quantityText: '1 tsp', substitutions: [] },
      { name: 'garlic', quantityText: '2 cloves', substitutions: null },
    ];

    it('identifies ingredients with substitutions', () => {
      const withSubs = mockIngredients.filter(i =>
        i.substitutions && i.substitutions.length > 0
      );
      expect(withSubs).toHaveLength(2);
    });

    it('formats substitutions list correctly', () => {
      const ing = mockIngredients[0];
      const subsText = ing.substitutions?.join(', ') || '';
      expect(subsText).toBe('margarine, coconut oil');
    });

    it('handles null substitutions', () => {
      const ing = mockIngredients[3];
      const subs = ing.substitutions ?? [];
      expect(subs).toHaveLength(0);
    });
  });

  describe('Edit Mode Logic', () => {
    it('tracks editing state correctly', () => {
      let editingId: string | null = null;

      const recipe = { id: 'recipe1', title: 'Test Recipe' };

      // Start editing
      editingId = recipe.id;
      expect(editingId).toBe('recipe1');

      // Cancel editing
      editingId = null;
      expect(editingId).toBeNull();
    });

    it('builds correct update payload', () => {
      const editingId = 'recipe1';
      const title = 'Updated Recipe';
      const servings = 4;
      const handsOnMin = 20;
      const totalMin = 45;
      const difficulty = 3;
      const cuisine = 'Italian';
      const source = 'PERSONAL';
      const instructions = 'Updated instructions';
      const ingredients = [{ name: 'pasta', quantityText: '1 lb' }];

      const payload = {
        id: editingId,
        title,
        servings,
        handsOnMin,
        totalMin,
        difficulty,
        cuisine,
        source,
        instructions,
        ingredients
      };

      expect(payload.id).toBe('recipe1');
      expect(payload.title).toBe('Updated Recipe');
      expect(payload.servings).toBe(4);
      expect(payload.ingredients).toHaveLength(1);
    });
  });

  describe('Unique Values Extraction', () => {
    const mockRecipes = [
      { cuisine: 'Italian', source: 'PERSONAL' },
      { cuisine: 'Mexican', source: 'WEB' },
      { cuisine: 'Italian', source: 'COOKBOOK' },
      { cuisine: 'Chinese', source: 'PERSONAL' },
    ];

    it('extracts unique cuisines', () => {
      const cuisines = [...new Set(mockRecipes.map(r => r.cuisine))].sort();
      expect(cuisines).toEqual(['Chinese', 'Italian', 'Mexican']);
    });

    it('extracts unique sources', () => {
      const sources = [...new Set(mockRecipes.map(r => r.source))].sort();
      expect(sources).toEqual(['COOKBOOK', 'PERSONAL', 'WEB']);
    });
  });
});
