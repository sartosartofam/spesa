interface AppHeaderProps {
  isMockData: boolean
}

export function AppHeader({ isMockData }: AppHeaderProps) {
  return (
    <header class="app-header">
      <div class="app-header__text">
        <h1 class="app-header__title">Spesa</h1>
        <p class="app-header__subtitle">Lista condivisa della famiglia</p>
      </div>
      {isMockData && (
        <span class="badge badge--mock" title="Nessun collegamento al database: dati di prova">
          dati demo
        </span>
      )}
    </header>
  )
}
