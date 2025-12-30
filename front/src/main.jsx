import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./App.jsx";

// Import component specific styles if they are not modularized properly
// Ideally, we should migrate them to CSS Modules or styled-components
import './components/itemStack/ItemStack.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)