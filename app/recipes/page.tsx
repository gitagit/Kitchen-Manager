import RecipesClient from "./ui";

type Props = {
  searchParams: Promise<{ search?: string }>;
};

export default async function RecipesPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <>
      <h1>Recipes</h1>
      <p><small className="muted">Start by adding 5–10 "known-good" recipes you actually cook.</small></p>
      <RecipesClient initialSearch={params.search} />
    </>
  );
}
