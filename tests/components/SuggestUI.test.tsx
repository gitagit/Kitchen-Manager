import { describe, it, expect } from 'vitest';

describe('Suggest UI Behavior', () => {
  describe('Technique Filtering', () => {
    const mockRecipes = [
      {
        id: '1',
        title: 'Chicken Stir Fry',
        techniques: [{ technique: { name: 'stir-frying' } }, { technique: { name: 'knife skills' } }]
      },
      {
        id: '2',
        title: 'Grilled Steak',
        techniques: [{ technique: { name: 'grilling' } }, { technique: { name: 'seasoning' } }]
      },
      {
        id: '3',
        title: 'Braised Short Ribs',
        techniques: [{ technique: { name: 'braising' } }, { technique: { name: 'searing' } }]
      },
      {
        id: '4',
        title: 'Pan-Seared Salmon',
        techniques: [{ technique: { name: 'searing' } }, { technique: { name: 'seasoning' } }]
      },
    ];

    function normName(s: string): string {
      return s.toLowerCase().trim();
    }

    it('filters recipes by single technique', () => {
      const techniqueFilter = ['searing'];

      const filtered = mockRecipes.filter(r => {
        const recipeTechniques = r.techniques.map(rt => normName(rt.technique.name));
        return techniqueFilter.some(t => recipeTechniques.includes(normName(t)));
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.title)).toContain('Braised Short Ribs');
      expect(filtered.map(r => r.title)).toContain('Pan-Seared Salmon');
    });

    it('filters recipes by multiple techniques (OR logic)', () => {
      const techniqueFilter = ['grilling', 'braising'];

      const filtered = mockRecipes.filter(r => {
        const recipeTechniques = r.techniques.map(rt => normName(rt.technique.name));
        return techniqueFilter.some(t => recipeTechniques.includes(normName(t)));
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.title)).toContain('Grilled Steak');
      expect(filtered.map(r => r.title)).toContain('Braised Short Ribs');
    });

    it('returns all recipes when no technique filter', () => {
      const techniqueFilter: string[] = [];

      const filtered = techniqueFilter.length === 0
        ? mockRecipes
        : mockRecipes.filter(r => {
            const recipeTechniques = r.techniques.map(rt => normName(rt.technique.name));
            return techniqueFilter.some(t => recipeTechniques.includes(normName(t)));
          });

      expect(filtered).toHaveLength(4);
    });

    it('returns empty when technique not found', () => {
      const techniqueFilter = ['sous-vide'];

      const filtered = mockRecipes.filter(r => {
        const recipeTechniques = r.techniques.map(rt => normName(rt.technique.name));
        return techniqueFilter.some(t => recipeTechniques.includes(normName(t)));
      });

      expect(filtered).toHaveLength(0);
    });

    it('is case insensitive for technique matching', () => {
      const techniqueFilter = ['GRILLING'];

      const filtered = mockRecipes.filter(r => {
        const recipeTechniques = r.techniques.map(rt => normName(rt.technique.name));
        return techniqueFilter.some(t => recipeTechniques.includes(normName(t)));
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Grilled Steak');
    });
  });

  describe('Suggestion Scoring', () => {
    // Mock scoring logic similar to suggest API
    interface ScoredRecipe {
      recipe: { id: string; title: string };
      havePercent: number;
      usingExpiring: number;
      missingIngredients: string[];
    }

    it('prioritizes recipes with higher ingredient coverage', () => {
      const suggestions: ScoredRecipe[] = [
        { recipe: { id: '1', title: 'Recipe A' }, havePercent: 100, usingExpiring: 0, missingIngredients: [] },
        { recipe: { id: '2', title: 'Recipe B' }, havePercent: 75, usingExpiring: 0, missingIngredients: ['onion'] },
        { recipe: { id: '3', title: 'Recipe C' }, havePercent: 50, usingExpiring: 0, missingIngredients: ['onion', 'garlic'] },
      ];

      const sorted = [...suggestions].sort((a, b) => b.havePercent - a.havePercent);

      expect(sorted[0].recipe.title).toBe('Recipe A');
      expect(sorted[1].recipe.title).toBe('Recipe B');
      expect(sorted[2].recipe.title).toBe('Recipe C');
    });

    it('prioritizes recipes using expiring ingredients', () => {
      const suggestions: ScoredRecipe[] = [
        { recipe: { id: '1', title: 'Recipe A' }, havePercent: 80, usingExpiring: 0, missingIngredients: [] },
        { recipe: { id: '2', title: 'Recipe B' }, havePercent: 80, usingExpiring: 2, missingIngredients: [] },
        { recipe: { id: '3', title: 'Recipe C' }, havePercent: 80, usingExpiring: 1, missingIngredients: [] },
      ];

      const sorted = [...suggestions].sort((a, b) => {
        if (b.usingExpiring !== a.usingExpiring) return b.usingExpiring - a.usingExpiring;
        return b.havePercent - a.havePercent;
      });

      expect(sorted[0].recipe.title).toBe('Recipe B');
      expect(sorted[1].recipe.title).toBe('Recipe C');
      expect(sorted[2].recipe.title).toBe('Recipe A');
    });
  });

  describe('Technique Selection UI', () => {
    it('tracks selected techniques correctly', () => {
      let selectedTechniques: string[] = [];

      // Add technique
      selectedTechniques = [...selectedTechniques, 'grilling'];
      expect(selectedTechniques).toContain('grilling');

      // Add another
      selectedTechniques = [...selectedTechniques, 'braising'];
      expect(selectedTechniques).toHaveLength(2);

      // Remove technique
      selectedTechniques = selectedTechniques.filter(t => t !== 'grilling');
      expect(selectedTechniques).not.toContain('grilling');
      expect(selectedTechniques).toContain('braising');

      // Clear all
      selectedTechniques = [];
      expect(selectedTechniques).toHaveLength(0);
    });

    it('toggles technique correctly', () => {
      let selected: string[] = [];

      function toggleTechnique(tech: string) {
        if (selected.includes(tech)) {
          selected = selected.filter(t => t !== tech);
        } else {
          selected = [...selected, tech];
        }
      }

      toggleTechnique('searing');
      expect(selected).toContain('searing');

      toggleTechnique('searing');
      expect(selected).not.toContain('searing');
    });
  });

  describe('Available Techniques Extraction', () => {
    const mockTechniques = [
      { id: '1', name: 'grilling' },
      { id: '2', name: 'braising' },
      { id: '3', name: 'searing' },
      { id: '4', name: 'knife skills' },
    ];

    it('extracts technique names', () => {
      const names = mockTechniques.map(t => t.name);
      expect(names).toEqual(['grilling', 'braising', 'searing', 'knife skills']);
    });

    it('sorts techniques alphabetically', () => {
      const sorted = [...mockTechniques].sort((a, b) => a.name.localeCompare(b.name));
      expect(sorted[0].name).toBe('braising');
      expect(sorted[1].name).toBe('grilling');
      expect(sorted[2].name).toBe('knife skills');
      expect(sorted[3].name).toBe('searing');
    });
  });
});
