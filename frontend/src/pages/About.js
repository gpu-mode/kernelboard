import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchAboutInfo } from "../api/api";
// client/src/pages/About.tsx
export default function About() {
  const [data, setData] = useState("");
  useEffect(() => {
    fetchAboutInfo().then((d) => {
      setData(d);
    });
  }, []);
  return _jsxs("div", {
    children: [
      _jsx("h1", { children: "About us" }),
      _jsxs("div", { children: [" ", data, " "] }),
    ],
  });
}
