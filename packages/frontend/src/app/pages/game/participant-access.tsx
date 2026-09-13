import { useState } from "react";
import { useLocation } from "react-router";
import { ExperimentFlowVertical } from "./experiment-flow-vertical";
import { GameIntroPage } from "./intro";

// O acesso do participante é sempre por link individual, com o token no
// fragmento da URL (#token=...) — assim ele não vai parar em log de servidor.
export function ParticipantAccessPage() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";
  const introKey = `intro-done:${token}`;

  // Marcado no sessionStorage para que recarregar a página no meio do
  // experimento não jogue a criança de volta para a tela de nome.
  const [started, setStarted] = useState(() => {
    try {
      return sessionStorage.getItem(introKey) === "1";
    } catch {
      return false;
    }
  });

  function start() {
    try {
      sessionStorage.setItem(introKey, "1");
    } catch {
      // Sem sessionStorage o intro reaparece ao recarregar; o jogo segue igual.
    }
    setStarted(true);
  }

  // h-screen dá altura ao h-full do jogo, que antes vinha do GameLayout.
  return (
    <div className="h-screen overflow-hidden">
      {started ? (
        <ExperimentFlowVertical key={token} token={token} />
      ) : (
        <GameIntroPage onStart={start} />
      )}
    </div>
  );
}
