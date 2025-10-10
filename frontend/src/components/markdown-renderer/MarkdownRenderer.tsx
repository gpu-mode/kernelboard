import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

type MarkdownRendererProps = {
  content: string;
  imageProps?: MarkdownRendererImageProps;
  // called when the rendered content is fully laid out (images loaded)
  onLoadComplete?: () => void;
};

type MarkdownRendererImageProps = {
  maxWidth?: string;
  minWidth?: string;
  width?: string;
  height?: string;
  align?: "left" | "right" | "center"; // restrict to valid values for textAlign
};

const defaultImageProps: MarkdownRendererImageProps = {
  width: "100%",
  maxWidth: "none",
  minWidth: "none",
  height: "auto",
  align: "center",
};

/**
 * MarkdownRenderer renders Markdown content with support for images and captions.
 *
 * It uses `react-markdown` along with `rehypeRaw` to allow parsing of raw HTML
 * such as <figure> and <figcaption> tags directly inside Markdown strings.
 *
 * This enables image + caption blocks to be rendered semantically and styled consistently.
 *
 * WARNING:
 * Do **not** use this component to render **untrusted** or **user-submitted** Markdown content.
 * `rehypeRaw` allows raw HTML to be parsed and injected into the DOM,
 * which could lead to Cross-Site Scripting (XSS) vulnerabilities
 * if malicious HTML like <img onerror="..."> or <script> is included.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  imageProps,
  onLoadComplete,
}) => {
  const mergedImageProps = { ...defaultImageProps, ...imageProps };
  const { align, ...styleProps } = mergedImageProps;
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Detect when images inside the rendered markdown finish loading.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      onLoadComplete?.();
      return;
    }

    const imgs = Array.from(el.querySelectorAll("img")) as HTMLImageElement[];
    if (imgs.length === 0) {
      // no images -> content is effectively ready
      // schedule on next tick to ensure paint
      const t = window.setTimeout(() => onLoadComplete?.(), 0);
      return () => clearTimeout(t);
    }

    let settled = 0;
    const handlers: Array<() => void> = [];
    imgs.forEach((img) => {
      if (img.complete) {
        settled += 1;
        return;
      }
      const onFinish = () => {
        settled += 1;
        if (settled === imgs.length) onLoadComplete?.();
      };
      img.addEventListener("load", onFinish);
      img.addEventListener("error", onFinish);
      handlers.push(() => {
        img.removeEventListener("load", onFinish);
        img.removeEventListener("error", onFinish);
      });
    });

    if (settled === imgs.length) {
      // all images already complete
      const t = window.setTimeout(() => onLoadComplete?.(), 0);
      return () => clearTimeout(t);
    }

    return () => handlers.forEach((h) => h());
  }, [content, onLoadComplete]);
  return (
    <div ref={containerRef}>
      <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      components={{
        figure: ({ node, ...props }) => (
          <figure style={{ textAlign: align, margin: "1.5rem 0" }} {...props} />
        ),
        figcaption: ({ node, ...props }) => (
          <figcaption
            style={{
              fontStyle: "italic",
              fontSize: "0.9rem",
              marginTop: "0.5rem",
            }}
            {...props}
          />
        ),
        img: ({ node, ...props }) => {
          return (
            <div style={{ textAlign: align, margin: "0" }}>
              <img style={styleProps} {...props} alt={props.alt} />
            </div>
          );
        },
      }}
    >
      {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
