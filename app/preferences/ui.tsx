"use client";

import { useEffect, useState } from "react";

const EQUIPMENT_OPTIONS = [
  "OVEN", "STOVETOP", "INSTANT_POT", "AIR_FRYER", "GRILL",
  "MICROWAVE", "SLOW_COOKER", "FOOD_PROCESSOR", "STAND_MIXER",
  "BLENDER", "TOASTER_OVEN"
];

const EQUIPMENT_LABELS: Record<string, string> = {
  OVEN: "Oven",
  STOVETOP: "Stovetop",
  INSTANT_POT: "Instant Pot",
  AIR_FRYER: "Air Fryer",
  GRILL: "Grill",
  MICROWAVE: "Microwave",
  SLOW_COOKER: "Slow Cooker",
  FOOD_PROCESSOR: "Food Processor",
  STAND_MIXER: "Stand Mixer",
  BLENDER: "Blender",
  TOASTER_OVEN: "Toaster Oven",
};

type Prefs = {
  equipment: string[];
  defaultServings: number;
  defaultMaxTimeMin: number;
  dietaryTagsExclude: string[];
  cuisinesExclude: string[];
  defaultComplexity: string;
  wantVariety: boolean;
  wantGrowth: boolean;
};

export default function PreferencesClient() {
  const [prefs, setPrefs] = useState<Prefs>({
    equipment: ["OVEN", "STOVETOP"],
    defaultServings: 2,
    defaultMaxTimeMin: 45,
    dietaryTagsExclude: [],
    cuisinesExclude: [],
    defaultComplexity: "ANY",
    wantVariety: true,
    wantGrowth: false,
  });
  const [dietaryInput, setDietaryInput] = useState("");
  const [cuisineInput, setCuisineInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/preferences")
      .then(res => res.json())
      .then((data: Prefs) => {
        setPrefs(data);
        setDietaryInput(data.dietaryTagsExclude.join(", "));
        setCuisineInput(data.cuisinesExclude.join(", "));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleEquipment(item: string) {
    setPrefs(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(e => e !== item)
        : [...prev.equipment, item],
    }));
  }

  function parseTags(raw: string): string[] {
    return raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  }

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const body = {
        ...prefs,
        dietaryTagsExclude: parseTags(dietaryInput),
        cuisinesExclude: parseTags(cuisineInput),
      };
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const saved: Prefs = await res.json();
        setPrefs(saved);
        setDietaryInput(saved.dietaryTagsExclude.join(", "));
        setCuisineInput(saved.cuisinesExclude.join(", "));
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p style={{ opacity: 0.5 }}>Loading preferences...</p>;
  }

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Kitchen Equipment */}
      <section className="card">
        <h3 style={{ margin: "0 0 12px 0" }}>Kitchen Equipment</h3>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, opacity: 0.65 }}>
          Check what you own. This pre-fills the equipment filter when finding and generating recipes.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EQUIPMENT_OPTIONS.map(eq => (
            <label
              key={eq}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${prefs.equipment.includes(eq) ? "rgba(100,150,255,0.5)" : "rgba(127,127,127,0.2)"}`,
                background: prefs.equipment.includes(eq) ? "rgba(100,150,255,0.1)" : "transparent",
                cursor: "pointer",
                fontSize: 14,
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={prefs.equipment.includes(eq)}
                onChange={() => toggleEquipment(eq)}
                style={{ display: "none" }}
              />
              {EQUIPMENT_LABELS[eq]}
            </label>
          ))}
        </div>
      </section>

      {/* Cooking Defaults */}
      <section className="card">
        <h3 style={{ margin: "0 0 12px 0" }}>Cooking Defaults</h3>
        <div className="row">
          <label>
            Default servings
            <input
              type="number"
              min={1}
              max={20}
              value={prefs.defaultServings}
              onChange={e => setPrefs(prev => ({ ...prev, defaultServings: parseInt(e.target.value || "2", 10) }))}
              style={{ maxWidth: 80 }}
            />
          </label>
          <label>
            Max cook time (min)
            <input
              type="number"
              min={5}
              max={480}
              value={prefs.defaultMaxTimeMin}
              onChange={e => setPrefs(prev => ({ ...prev, defaultMaxTimeMin: parseInt(e.target.value || "45", 10) }))}
              style={{ maxWidth: 80 }}
            />
          </label>
        </div>
      </section>

      {/* Dietary Restrictions */}
      <section className="card">
        <h3 style={{ margin: "0 0 8px 0" }}>Dietary Restrictions</h3>
        <p style={{ margin: "0 0 10px 0", fontSize: 13, opacity: 0.65 }}>
          Tags to always exclude (comma-separated). E.g. <code>gluten-free, dairy-free, vegan</code>.
        </p>
        <input
          value={dietaryInput}
          onChange={e => setDietaryInput(e.target.value)}
          placeholder="gluten-free, dairy-free, vegan..."
          style={{ width: "100%" }}
        />
        {parseTags(dietaryInput).length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {parseTags(dietaryInput).map(tag => (
              <span key={tag} style={{ padding: "2px 8px", borderRadius: 12, fontSize: 12, background: "rgba(255,100,100,0.15)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Cuisine Exclusions */}
      <section className="card">
        <h3 style={{ margin: "0 0 8px 0" }}>Cuisine Exclusions</h3>
        <p style={{ margin: "0 0 10px 0", fontSize: 13, opacity: 0.65 }}>
          Cuisines you prefer to skip (comma-separated). E.g. <code>indian, thai</code>.
        </p>
        <input
          value={cuisineInput}
          onChange={e => setCuisineInput(e.target.value)}
          placeholder="indian, thai..."
          style={{ width: "100%" }}
        />
        {parseTags(cuisineInput).length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {parseTags(cuisineInput).map(c => (
              <span key={c} style={{ padding: "2px 8px", borderRadius: 12, fontSize: 12, background: "rgba(200,150,50,0.15)" }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Complexity Preference */}
      <section className="card">
        <h3 style={{ margin: "0 0 12px 0" }}>Complexity Preference</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["ANY", "FAMILIAR", "STRETCH", "CHALLENGE"].map(c => (
            <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="complexity"
                value={c}
                checked={prefs.defaultComplexity === c}
                onChange={() => setPrefs(prev => ({ ...prev, defaultComplexity: c }))}
              />
              {c === "ANY" ? "Any" : c.charAt(0) + c.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </section>

      {/* Discovery Settings */}
      <section className="card">
        <h3 style={{ margin: "0 0 12px 0" }}>Discovery Settings</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={prefs.wantVariety}
              onChange={e => setPrefs(prev => ({ ...prev, wantVariety: e.target.checked }))}
            />
            <span>
              <strong>Boost variety</strong>
              <span style={{ marginLeft: 6, fontSize: 13, opacity: 0.65 }}>Prefer cuisines you haven&apos;t had recently</span>
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={prefs.wantGrowth}
              onChange={e => setPrefs(prev => ({ ...prev, wantGrowth: e.target.checked }))}
            />
            <span>
              <strong>Skill growth</strong>
              <span style={{ marginLeft: 6, fontSize: 13, opacity: 0.65 }}>Suggest recipes that teach new techniques</span>
            </span>
          </label>
        </div>
      </section>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: "10px 28px", fontWeight: 500 }}
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
        {status === "saved" && (
          <span style={{ fontSize: 14, color: "rgba(100,200,100,0.9)" }}>Saved!</span>
        )}
        {status === "error" && (
          <span style={{ fontSize: 14, color: "#f87171" }}>Save failed — try again.</span>
        )}
      </div>
    </div>
  );
}
