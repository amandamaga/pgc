import { useLocation } from "react-router";
import { GameButton } from "../../components/game/game-button";
import { useParticipantState } from "../../hooks/use-participant-state";

export function ParticipantAccessPage() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";
  return <ParticipantGame key={token} token={token} />;
}

function ParticipantGame({ token }: { token: string }) {
  const { state, error, isLoading, isSubmitting, refresh, submitJudgment, submitPunishment, acknowledgeResult } = useParticipantState(token);
  const attempt = state?.currentAttempt;
  const result = state?.trialResult;
  const stage = state?.stage;
  const waiting = stage === "WAITING_SESSION" ? "Aguarde a pesquisadora iniciar o jogo."
    : stage === "WAITING_JUDGMENT_PARTNER" || stage === "WAITING_PUNISHMENT_PARTNER" ? "Resposta enviada! Aguarde seu parceiro responder."
    : stage === "WAITING_RESULT_PARTNER" ? "Aguarde seu parceiro ver o resultado." : null;

  return <main className="min-h-screen bg-[#F7F7F7] p-4 sm:p-8 font-nunito text-[#3C3C3C]">
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="text-center"><h1 className="text-3xl font-black">{state ? `Olá, ${state.participant.displayName}!` : "Vamos jogar"}</h1></header>
      {error ? <section role="alert" className="rounded-3xl border-2 bg-white p-6 text-center space-y-4"><p>{error}</p><GameButton onClick={() => void refresh()}>Tentar novamente</GameButton></section>
        : isLoading ? <p role="status" className="text-center">Carregando o jogo...</p>
        : <>
          {waiting && <p role="status" className="rounded-3xl border-2 border-[#E5E5E5] bg-white p-8 text-center text-xl font-bold">{waiting}</p>}
          {(stage === "JUDGMENT" || stage === "PUNISHMENT") && attempt && <section className="rounded-3xl border-2 border-b-[5px] border-[#E5E5E5] bg-white p-6 space-y-6">
            <p className="text-center text-xl">{attempt.distributorCharacter} recebeu {attempt.endowment} moedas para dividir com {attempt.receptorCharacter}.</p>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-2xl bg-[#E3F4FD] p-4"><p className="font-bold">{attempt.distributorCharacter}</p><p className="text-3xl font-black mt-2">{attempt.distributorDistribution}</p><p>moedas para si</p></div>
              <div className="rounded-2xl bg-[#F0FFF4] p-4"><p className="font-bold">{attempt.receptorCharacter}</p><p className="text-3xl font-black mt-2">{attempt.receptorDistribution}</p><p>moedas recebidas</p></div>
            </div>
            {stage === "JUDGMENT" ? <><h2 className="text-2xl font-black text-center">Você acha essa divisão justa ou injusta?</h2><div className="grid sm:grid-cols-2 gap-4"><GameButton disabled={isSubmitting} onClick={() => void submitJudgment("Just")}>Justa</GameButton><GameButton variant="danger" disabled={isSubmitting} onClick={() => void submitJudgment("Unjust")}>Injusta</GameButton></div></>
              : <><h2 className="text-2xl font-black text-center">Você quer punir {attempt.distributorCharacter}?</h2><div className="grid sm:grid-cols-2 gap-4"><GameButton disabled={isSubmitting} onClick={() => void submitPunishment("Punish")}>Sim</GameButton><GameButton variant="danger" disabled={isSubmitting} onClick={() => void submitPunishment("NoPunish")}>Não</GameButton></div></>}
          </section>}
          {(stage === "RESULT" || stage === "WAITING_RESULT_PARTNER") && result && <section className="rounded-3xl border-2 border-b-[5px] border-[#E5E5E5] bg-white p-6 text-center space-y-4">
            <h2 className="text-2xl font-black">Resultado da história</h2>
            <p>{result.punishmentApplied ? "A punição foi aplicada." : "A punição não foi aplicada."}</p>
            {result.distributorResult && <p>{result.distributorResult.character} perdeu {result.distributorResult.coinsLost} moedas e ficou com {result.distributorResult.finalCoins}.</p>}
            <p>Você gastou {result.ownIndividualCost} moedas.</p>
            <div className="grid sm:grid-cols-2 gap-4"><div className="rounded-2xl bg-[#FFF8D6] p-4"><p>Suas moedas</p><p className="text-3xl font-black">{result.ownCoinsAfter}</p></div><div className="rounded-2xl bg-[#F0FFF4] p-4"><p>Cofrinho da dupla</p><p className="text-3xl font-black">{result.groupCoinsAfter}</p></div></div>
            <p>A dupla recebeu {result.culturalConsequence} moedas nesta história.</p>
            {stage === "RESULT" && <GameButton disabled={isSubmitting} onClick={() => void acknowledgeResult()}>Continuar</GameButton>}
          </section>}
          {stage === "COMPLETED" && <section className="rounded-3xl border-2 bg-white p-8 text-center space-y-4"><h2 className="text-3xl font-black">Você terminou!</h2><p className="text-xl">Obrigado por participar. Avise a pesquisadora.</p></section>}
          {isSubmitting && <p role="status" className="text-center">Enviando sua resposta...</p>}
        </>}
    </div>
  </main>;
}
