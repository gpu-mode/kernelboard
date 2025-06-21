import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import "../styles/Home.css";
import Header from "../components/Header";
export default function Home() {
  return _jsxs(_Fragment, {
    children: [
      _jsx(Header, {}),
      _jsxs("div", {
        className: "home-container",
        children: [
          _jsxs("div", {
            className: "hero-section",
            children: [
              _jsx("h1", { children: "Welcome to Kernelboard" }),
              _jsx("p", {
                children:
                  "Your friendly source for information about GPU kernels submitted to the Discord cluster manager",
              }),
              _jsx("div", {
                className: "cta-buttons",
                children: _jsx("a", {
                  href: "/kb/about",
                  className: "primary-button",
                  children: "Learn More",
                }),
              }),
            ],
          }),
          _jsxs("div", {
            className: "features-section",
            children: [
              _jsx("h2", { children: "Features" }),
              _jsxs("div", {
                className: "features-grid",
                children: [
                  _jsxs("div", {
                    className: "feature-card",
                    children: [
                      _jsx("h3", { children: "GPU Kernel Information" }),
                      _jsx("p", {
                        children:
                          "Access detailed information about GPU kernels submitted to the Discord cluster manager.",
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "feature-card",
                    children: [
                      _jsx("h3", { children: "Helpful Resources" }),
                      _jsx("p", {
                        children:
                          "Find links and resources related to GPU MODE and kernel development.",
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "feature-card",
                    children: [
                      _jsx("h3", { children: "Performance Metrics" }),
                      _jsx("p", {
                        children:
                          "View performance metrics and statistics for your GPU kernels.",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
