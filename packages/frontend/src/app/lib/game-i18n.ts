export type Lang = "pt" | "no";

export const translations = {
  pt: {
    // Intro
    selectLanguage: "Escolha o idioma",
    hello: "Olá!",
    whatIsYourName: "Qual é o seu nome?",
    namePlaceholder: "Meu nome é...",
    writeYourName: "Escreve o seu nome!",
    hiName: (name: string) => `Oi, ${name}!`,
    next: "PRÓXIMO",
    watchTutorial: "VER TUTORIAL",
    closeVideo: "FECHAR VÍDEO",
    start: "COMEÇAR",
    back: "← Voltar",

    // Waiting
    waitingFor: (name: string) => `Aguardando ${name}...`,
    allReady: "Todos prontos!",
    gameStarting: "O jogo vai começar!",
    partnerNotReady: (name: string) => `${name} ainda não clicou em COMEÇAR`,
    waitingConnection: "Aguardando conexão...",
    pairComplete: "✓ Dupla completa!",
    you: "Você",

    // Game flow
    seeStory: "Ver História",
    distributingLabel: "Hora de Dividir",
    distributorBadgePresent: "DIVIDE",
    distributorBadgePast: "DIVIDIU",
    together: "COFRINHO",
    justiceQuestion: "Você acha que essa divisão foi justa ou injusta?",
    just: "Justa",
    unjust: "Injusta",
    punishQuestion: (name: string) => `Você daria 1 das suas moedas para que ${name} perca 3 moedas?`,
    yes: "Sim",
    no: "Não",
    continue: "Continuar",
    seeResult: "Ver Resultado Final",

    // Trial result — culturant
    youWonCoins: "Vocês ganharam moedas!",
    culturantMessage: "Vocês concordaram e puniram juntos!\nAs moedas foram para o cofrinho do grupo",

    // Trial result — punished
    youPunished: "Você puniu!",
    youLost1: "Você perdeu 1 moeda",
    nameLost3: (name: string) => `${name} perdeu 3 moedas`,
    partnerAlsoPunished: (name: string) => `${name} também puniu`,
    partnerDidNotPunish: (name: string) => `${name} não puniu`,

    // HUD labels
    labelYou: "Você",
    labelGroup: "Grupo",

    // Sons
    winSound: "Som de vitória",
    loseSound: "Som de perda",

    // End
    congrats: "Parabéns!",
    completedExperiment: "Você completou o jogo",
    yourResults: "Seus Resultados",
    yourCoins: "Suas moedas",
    groupCoins: "Moedas do grupo",
    thankYou: "Obrigado por participar!",
    finish: "Finalizar",
    canClose: "Você pode fechar esta página agora",
  },

  no: {
    // Intro
    selectLanguage: "Velg språk",
    hello: "Hei!",
    whatIsYourName: "Hva heter du?",
    namePlaceholder: "Mitt navn er...",
    writeYourName: "Skriv navnet ditt!",
    hiName: (name: string) => `Hei, ${name}!`,
    next: "NESTE",
    watchTutorial: "SE VIDEO",
    closeVideo: "LUKK VIDEO",
    start: "START",
    back: "← Tilbake",

    // Waiting
    waitingFor: (name: string) => `Venter på ${name}...`,
    allReady: "Alle klare!",
    gameStarting: "Spillet starter snart!",
    partnerNotReady: (name: string) => `${name} har ikke klikket START ennå`,
    waitingConnection: "Venter på tilkobling...",
    pairComplete: "✓ Par komplett!",
    you: "Deg",

    // Game flow
    seeStory: "Se historien",
    distributingLabel: "Tid for å dele!",
    distributorBadgePresent: "DELER",
    distributorBadgePast: "DELTE",
    together: "SAMMEN",
    justiceQuestion: "Synes du denne fordelingen var rettferdig eller urettferdig?",
    just: "Rettferdig",
    unjust: "Urettferdig",
    punishQuestion: (name: string) => `Vil du gi 1 mynt slik at ${name} mister 3 mynter?`,
    yes: "Ja",
    no: "Nei",
    continue: "Fortsett",
    seeResult: "Se sluttresultat",

    // Trial result — culturant
    youWonCoins: "Dere fikk mynter!",
    culturantMessage: "Dere var enige og straffet sammen!\nMyntene gikk til gruppens sparegris",

    // Trial result — punished
    youPunished: "Du straffet!",
    youLost1: "Du mistet 1 mynt",
    nameLost3: (name: string) => `${name} mistet 3 mynter`,
    partnerAlsoPunished: (name: string) => `${name} straffet også`,
    partnerDidNotPunish: (name: string) => `${name} straffet ikke`,

    // HUD labels
    labelYou: "Deg",
    labelGroup: "Gruppe",

    // Sons
    winSound: "Vinnerlyd",
    loseSound: "Taperlyd",

    // End
    congrats: "Gratulerer!",
    completedExperiment: "Du fullførte spillet",
    yourResults: "Dine resultater",
    yourCoins: "Dine mynter",
    groupCoins: "Gruppens mynter",
    thankYou: "Takk for at du deltok!",
    finish: "Avslutt",
    canClose: "Du kan lukke denne siden nå",
  },
} as const;

// Language is a property of the SESSION (per spec). For real sessions, it is
// read from the session-store keyed by sessionId. The `gameLang` key in
// sessionStorage is used ONLY by /game-preview (no real session exists yet).
const PREVIEW_KEY = "gameLang:preview";

export function getPreviewLang(): Lang | null {
  return (sessionStorage.getItem(PREVIEW_KEY) as Lang) || null;
}

export function setPreviewLang(lang: Lang) {
  sessionStorage.setItem(PREVIEW_KEY, lang);
}

export function getLang(sessionId?: string): Lang {
  if (sessionId) {
    const raw = sessionStorage.getItem(`session:${sessionId}`);
    if (raw) {
      try {
        const code = (JSON.parse(raw) as { language?: string }).language;
        if (code === "no-NO") return "no";
        if (code === "pt-BR") return "pt";
      } catch {
        // fall through
      }
    }
  }
  // Fallback: idioma escolhido pela pesquisadora no dashboard
  const researchLang = localStorage.getItem("researchLang") as Lang | null;
  return getPreviewLang() ?? researchLang ?? "pt";
}

export function t(sessionId?: string): typeof translations["pt"] {
  return translations[getLang(sessionId)];
}
