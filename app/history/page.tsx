import HistoryClient from "./ui";

export default function HistoryPage() {
  return (
    <>
      <h1>Cook History</h1>
      <p className="muted">Track what you&apos;ve made and how it turned out.</p>
      <HistoryClient />
    </>
  );
}
