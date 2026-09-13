// Retratos dos 16 personagens do experimento, recortados dos cartões de
// estímulo originais (Apêndice de Estímulos). A chave é o nome que o backend
// manda em distributorCharacter / receptorCharacter.
const modules = import.meta.glob("../../assets/characters/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const byName: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  byName[file.replace(/\.webp$/i, "")] = url;
}

export function characterImage(name: string): string | undefined {
  return byName[name.trim().toLowerCase()];
}
