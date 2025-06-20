import "./App.css";

// client/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./pages/About";

function App() {
  return (
    <BrowserRouter basename="/kb">
      <Routes>
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
