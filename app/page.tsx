export default function Home() {
  return (
    <>
      <h1>🍳 Mise en App</h1>
      <p>Track your pantry, discover recipes, plan groceries, and grow as a cook.</p>
      
      <div className="card">
        <h3>Getting Started</h3>
        <ol>
          <li><strong><a href="/inventory">Add your inventory</a></strong> — What&apos;s in your pantry, fridge, and freezer?</li>
          <li><strong><a href="/recipes">Add some recipes</a></strong> — Start with your go-to weeknight meals</li>
          <li><strong><a href="/suggest">Get suggestions</a></strong> — Find what to cook based on what you have</li>
          <li><strong><a href="/grocery">Plan groceries</a></strong> — Generate shopping lists for planned meals</li>
          <li><strong><a href="/techniques">Track your skills</a></strong> — Monitor techniques you&apos;re learning</li>
        </ol>
      </div>

      <div className="card">
        <h3>Features</h3>
        <ul>
          <li>📦 <strong>Inventory tracking</strong> with batch/expiration support</li>
          <li>📖 <strong>Recipe management</strong> with cuisine, source, and technique tagging</li>
          <li>🎯 <strong>Smart suggestions</strong> that prioritize what you have and what&apos;s expiring</li>
          <li>🛒 <strong>Grocery planning</strong> with ship vs. in-person separation</li>
          <li>📈 <strong>Skill growth tracking</strong> to help you become a better cook over time</li>
          <li>🌍 <strong>Cuisine variety</strong> suggestions to keep things interesting</li>
        </ul>
      </div>
    </>
  );
}
