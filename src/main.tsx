import { render } from 'preact'
import { App } from './app'
import './app.css'

const root = document.getElementById('app')
if (!root) throw new Error('Elemento #app non trovato in index.html')

render(<App />, root)
