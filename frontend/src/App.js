import { jsx as _jsx } from "react/jsx-runtime";
import "./App.css";
// client/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./pages/About";
function App() {
  return _jsx(BrowserRouter, {
    basename: "/kb",
    children: _jsx(Routes, {
      children: _jsx(Route, { path: "/about", element: _jsx(About, {}) }),
    }),
  });
}
export default App;
