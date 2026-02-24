"use client";

import { useRouter } from "next/navigation";

const FEATURES = [
  {
    emoji: "📦",
    title: "Track your kitchen",
    nav: "Inventory",
    body: "Add items manually, scan pantry photos with AI, or paste a list to import in bulk. Get stale item alerts after 14 days so nothing gets forgotten.",
  },
  {
    emoji: "🍳",
    title: "Save & generate recipes",
    nav: "Recipes",
    body: "Store recipes with ingredients, steps, techniques, and nutrition. AI generates new ones from your inventory. Import directly from any recipe URL.",
  },
  {
    emoji: "✨",
    title: "What can I make tonight?",
    nav: "Suggest",
    body: "Get recipe suggestions based on what's actually in your pantry right now. Filter by cook time, equipment, dietary needs, and complexity.",
  },
  {
    emoji: "🛒",
    title: "Smart shopping list",
    nav: "Grocery",
    body: "Add items manually, auto-fill from your meal plan, or use smart reorder based on how often you cook each recipe and your par levels.",
  },
  {
    emoji: "📅",
    title: "Plan the week",
    nav: "Plan",
    body: "Assign recipes to breakfast, lunch, and dinner for each day. Then generate a grocery list straight from the plan with one click.",
  },
  {
    emoji: "📜",
    title: "Cook log",
    nav: "History",
    body: "Every recipe you cook is logged with your rating and optional notes. Track leftover quantities after cooking so your inventory stays accurate.",
  },
  {
    emoji: "🔪",
    title: "Grow your technique",
    nav: "Skills",
    body: "The app tracks every cooking technique used across your recipes. Your comfort level rises automatically as you cook them more.",
  },
  {
    emoji: "📊",
    title: "Cooking at a glance",
    nav: "Stats",
    body: "See your cook frequency, average cost per meal, cuisine variety, and technique progress — all summarised in one place.",
  },
  {
    emoji: "⚙️",
    title: "Make it yours",
    nav: "Preferences",
    body: "Set dietary restrictions, default servings, cuisine exclusions, and kitchen equipment. Invite household members to share your workspace and data.",
  },
];

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 0 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 700 }}>
          Welcome to Mise en App 🍳
        </h1>
        <p style={{ margin: 0, fontSize: 16, opacity: 0.65 }}>
          Your household kitchen, organized. Here&apos;s what you can do:
        </p>
      </div>

      {/* Feature grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f.nav}
            className="card"
            style={{ flex: "1 1 260px", minWidth: 0 }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{f.emoji}</div>
            <div style={{ fontSize: 13, opacity: 0.45, marginBottom: 4, fontWeight: 500 }}>
              {f.nav}
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 600 }}>
              {f.title}
            </h3>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
              {f.body}
            </p>
          </div>
        ))}
      </div>

      {/* Tip box */}
      <div
        style={{
          background: "rgba(74,144,217,0.08)",
          border: "1px solid rgba(74,144,217,0.2)",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 32,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        💡 <strong>Start here:</strong> Go to <strong>Inventory</strong> and add what you have —
        scan a pantry photo on mobile, or paste a list under Import. Then try{" "}
        <strong>Suggest</strong> to see what you can cook tonight.
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "12px 36px",
            fontSize: 16,
            fontWeight: 600,
            background: "rgba(74,144,217,0.15)",
            border: "1px solid rgba(74,144,217,0.4)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Get started →
        </button>
      </div>
    </div>
  );
}
