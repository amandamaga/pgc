# Screenshot Capture Script

Script automático para capturar screenshots de todas as telas da aplicação.

## Como usar

1. **Certifique-se de que o servidor de desenvolvimento está rodando:**
   ```bash
   # Em um terminal separado, inicie o servidor
   # (O Figma Make já inicia automaticamente)
   ```

2. **Execute o script de captura:**
   ```bash
   pnpm screenshots
   ```

3. **Aguarde a captura:**
   O script vai navegar automaticamente por todas as rotas e salvar screenshots em `./screenshots/`

## Telas capturadas

### Dashboard (Pesquisador)
- Login
- Registro
- Dashboard Home
- Participantes
- Criar Experimento
- Detalhes do Experimento
- Sessões
- Monitor de Sessão

### Game (Participante - Mobile)
- Intro
- Waiting
- Flow Vertical (distribuição)
- Flow Vertical (justiça)
- End

## Configuração

Você pode editar o arquivo `scripts/capture-screenshots.mjs` para:
- Adicionar/remover rotas
- Mudar viewports (desktop/tablet/mobile)
- Ajustar tempos de espera para animações
- Modificar a URL base

## Screenshots

Os screenshots são salvos em:
```
screenshots/
  ├── auth-login-desktop.png
  ├── auth-register-desktop.png
  ├── dashboard-home-desktop.png
  ├── game-intro-mobile.png
  └── ...
```

## Importar no Figma

Depois de gerar os screenshots:
1. Abra o Figma
2. Arraste e solte todas as imagens PNG
3. Organize em frames conforme necessário
