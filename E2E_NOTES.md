# E2E Playwright

Le script `npm run test:e2e` ne contient pas de fallback : si Playwright echoue, la commande echoue.

Sur ce poste local, macOS 12.7.6 x86_64 avec Playwright 1.60.0, Chromium quitte au lancement avant execution des assertions :

- navigateur Playwright : `signal=SIGTRAP`
- Chrome systeme teste en alternative : `signal=SIGABRT`
- en mode headed, Chrome for Testing signale aussi `chrome_crashpad_handler: --database is required`

Le serveur Vite est lance par `playwright.config.js`. Le blocage restant est donc le lancement du navigateur, pas l'application Nexora.

Alternative fiable : executer `npm run test:e2e` dans un environnement ou le navigateur Playwright demarre correctement, par exemple une machine macOS plus recente, un runner CI compatible Playwright, ou une version Playwright/Chromium compatible avec l'OS local.
