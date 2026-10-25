import { render } from 'preact'
import './app.css'
import { applyTheme, readTheme } from './lib/theme'
import { Root } from './root'

const root = document.getElementById('app')
if (!root) throw new Error('Elemento #app non trovato in index.html')

// Applica la preferenza del dispositivo prima del primo render, così anche la
// landing pubblica non mostra un lampo della palette sbagliata.
applyTheme(readTheme())

render(<Root />, root)
