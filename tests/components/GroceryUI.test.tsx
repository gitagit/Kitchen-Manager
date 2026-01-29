import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Grocery UI Behavior', () => {
  describe('List Generation', () => {
    const mockMeals = [
      {
        id: 'm1',
        date: '2025-01-28',
        slot: 'dinner',
        servings: 4,
        recipe: {
          id: 'r1',
          title: 'Chicken Stir Fry',
          servings: 4,
          ingredients: [
            { name: 'chicken breast', quantityText: '1 lb', required: true },
            { name: 'soy sauce', quantityText: '2 tbsp', required: true },
            { name: 'rice', quantityText: '2 cups', required: true },
          ]
        }
      },
      {
        id: 'm2',
        date: '2025-01-29',
        slot: 'dinner',
        servings: 4,
        recipe: {
          id: 'r2',
          title: 'Beef Tacos',
          servings: 4,
          ingredients: [
            { name: 'ground beef', quantityText: '1 lb', required: true },
            { name: 'taco seasoning', quantityText: '1 packet', required: true },
            { name: 'tortillas', quantityText: '8', required: true },
          ]
        }
      }
    ];

    it('extracts all ingredients from meals', () => {
      const ingredients = mockMeals.flatMap(m =>
        m.recipe.ingredients.map(i => ({
          ...i,
          recipeTitle: m.recipe.title,
          mealDate: m.date
        }))
      );

      expect(ingredients).toHaveLength(6);
      expect(ingredients.map(i => i.name)).toContain('chicken breast');
      expect(ingredients.map(i => i.name)).toContain('tortillas');
    });

    it('groups ingredients by name', () => {
      const ingredients = [
        { name: 'rice', quantityText: '2 cups' },
        { name: 'chicken', quantityText: '1 lb' },
        { name: 'rice', quantityText: '1 cup' },
      ];

      const grouped = new Map<string, typeof ingredients>();
      for (const ing of ingredients) {
        const key = ing.name.toLowerCase();
        grouped.set(key, [...(grouped.get(key) ?? []), ing]);
      }

      expect(grouped.get('rice')).toHaveLength(2);
      expect(grouped.get('chicken')).toHaveLength(1);
    });
  });

  describe('Ship vs In-Person Separation', () => {
    const mockItems = [
      { name: 'rice', category: 'PANTRY' },
      { name: 'chicken', category: 'MEAT' },
      { name: 'frozen peas', category: 'FROZEN' },
      { name: 'milk', category: 'DAIRY' },
      { name: 'canned beans', category: 'PANTRY' },
      { name: 'lettuce', category: 'PRODUCE' },
    ];

    // Categories that need in-person shopping
    const inPersonCategories = ['MEAT', 'PRODUCE', 'DAIRY', 'FROZEN'];

    it('separates ship-able items', () => {
      const shipItems = mockItems.filter(i => !inPersonCategories.includes(i.category));
      expect(shipItems).toHaveLength(2);
      expect(shipItems.map(i => i.name)).toContain('rice');
      expect(shipItems.map(i => i.name)).toContain('canned beans');
    });

    it('separates in-person items', () => {
      const inPersonItems = mockItems.filter(i => inPersonCategories.includes(i.category));
      expect(inPersonItems).toHaveLength(4);
      expect(inPersonItems.map(i => i.name)).toContain('chicken');
      expect(inPersonItems.map(i => i.name)).toContain('milk');
    });
  });

  describe('Inventory Check', () => {
    const mockInventory = [
      { name: 'rice', batches: [{ quantityText: '5 lbs' }] },
      { name: 'soy sauce', batches: [{ quantityText: '1 bottle' }] },
    ];

    const neededIngredients = [
      { name: 'rice', quantityText: '2 cups' },
      { name: 'chicken', quantityText: '1 lb' },
      { name: 'soy sauce', quantityText: '2 tbsp' },
    ];

    it('identifies items already in inventory', () => {
      const inventoryNames = mockInventory.map(i => i.name.toLowerCase());
      const inStock = neededIngredients.filter(i =>
        inventoryNames.includes(i.name.toLowerCase())
      );
      expect(inStock).toHaveLength(2);
      expect(inStock.map(i => i.name)).toContain('rice');
      expect(inStock.map(i => i.name)).toContain('soy sauce');
    });

    it('identifies items to buy', () => {
      const inventoryNames = mockInventory.map(i => i.name.toLowerCase());
      const toBuy = neededIngredients.filter(i =>
        !inventoryNames.includes(i.name.toLowerCase())
      );
      expect(toBuy).toHaveLength(1);
      expect(toBuy[0].name).toBe('chicken');
    });
  });

  describe('Clipboard Formatting', () => {
    it('formats list for clipboard', () => {
      const items = [
        { name: 'chicken breast', quantityText: '2 lbs' },
        { name: 'rice', quantityText: '1 bag' },
        { name: 'soy sauce', quantityText: '1 bottle' },
      ];

      const formatted = items.map(i => `- ${i.name}: ${i.quantityText}`).join('\n');

      expect(formatted).toContain('- chicken breast: 2 lbs');
      expect(formatted).toContain('- rice: 1 bag');
      expect(formatted.split('\n')).toHaveLength(3);
    });

    it('formats grouped list', () => {
      const groups = {
        'PANTRY': [{ name: 'rice' }, { name: 'beans' }],
        'MEAT': [{ name: 'chicken' }],
      };

      let formatted = '';
      for (const [category, items] of Object.entries(groups)) {
        formatted += `${category}:\n`;
        for (const item of items) {
          formatted += `  - ${item.name}\n`;
        }
      }

      expect(formatted).toContain('PANTRY:');
      expect(formatted).toContain('  - rice');
      expect(formatted).toContain('MEAT:');
    });
  });

  describe('Date Range Selection', () => {
    it('calculates date range correctly', () => {
      const startDate = new Date('2025-01-28');
      const endDate = new Date('2025-02-04');

      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(days).toBe(7);
    });

    it('filters meals within date range', () => {
      const meals = [
        { date: '2025-01-27', recipe: { title: 'Before' } },
        { date: '2025-01-28', recipe: { title: 'Start' } },
        { date: '2025-01-30', recipe: { title: 'Middle' } },
        { date: '2025-02-04', recipe: { title: 'End' } },
        { date: '2025-02-05', recipe: { title: 'After' } },
      ];

      const startDate = '2025-01-28';
      const endDate = '2025-02-04';

      const filtered = meals.filter(m =>
        m.date >= startDate && m.date <= endDate
      );

      expect(filtered).toHaveLength(3);
      expect(filtered.map(m => m.recipe.title)).not.toContain('Before');
      expect(filtered.map(m => m.recipe.title)).not.toContain('After');
    });
  });

  describe('Checked Items Tracking', () => {
    it('tracks checked state correctly', () => {
      let checked: Set<string> = new Set();

      // Check item
      checked.add('chicken');
      expect(checked.has('chicken')).toBe(true);

      // Check another
      checked.add('rice');
      expect(checked.size).toBe(2);

      // Uncheck item
      checked.delete('chicken');
      expect(checked.has('chicken')).toBe(false);
      expect(checked.has('rice')).toBe(true);
    });

    it('filters out checked items from list', () => {
      const items = ['chicken', 'rice', 'beans', 'milk'];
      const checked = new Set(['rice', 'milk']);

      const remaining = items.filter(i => !checked.has(i));
      expect(remaining).toEqual(['chicken', 'beans']);
    });
  });
});
