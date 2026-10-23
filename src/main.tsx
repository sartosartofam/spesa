import { render } from 'preact'
import './app.css'
import { Root } from './root'

const root = document.getElementById('app')
if (!root) throw new Error('Elemento #app non trovato in index.html')

render(<Root />, root)
