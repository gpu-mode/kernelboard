import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import "../styles/Header.css";
export default function Header() {
  return _jsx("header", {
    className: "header",
    children: _jsxs("div", {
      className: "header-container",
      children: [
        _jsx("div", {
          className: "logo-container",
          children: _jsx("h1", { children: "Kernelboard" }),
        }),
        _jsx("nav", {
          className: "navigation",
          children: _jsxs("ul", {
            children: [
              _jsx("li", {
                children: _jsx(Link, {
                  to: "/",
                  className: "nav-link",
                  children: "Home",
                }),
              }),
              _jsx("li", {
                children: _jsx(Link, {
                  to: "/about",
                  className: "nav-link active",
                  children: "About",
                }),
              }),
            ],
          }),
        }),
      ],
    }),
  });
}
