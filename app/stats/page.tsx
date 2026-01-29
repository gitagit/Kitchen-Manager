import StatsClient from "./ui";

export default function StatsPage() {
  return (
    <>
      <h1>Cooking Stats</h1>
      <p><small className="muted">Track your cooking progress and discover patterns.</small></p>
      <StatsClient />
    </>
  );
}
