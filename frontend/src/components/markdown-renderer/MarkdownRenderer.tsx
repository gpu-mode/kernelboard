import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { useTheme } from "@mui/material/styles";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

function HeadingWithAnchor({
  level,
  id,
  children,
  ...props
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const handleClick = () => {
    if (id) {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <Tag
      id={id}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
      {...props}
    >
      {children}
    </Tag>
  );
}

type MarkdownRendererProps = {
  content: string;
  imageProps?: MarkdownRendererImageProps;
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
}) => {
  const mergedImageProps = { ...defaultImageProps, ...imageProps };
  const { align, ...styleProps } = mergedImageProps;
  const theme = useTheme();
  const syntaxTheme = theme.palette.mode === "dark" ? oneDark : oneLight;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeSlug, rehypeKatex]}
      components={{
        h1: ({ node: _node, children, ...props }) => (
          <HeadingWithAnchor level={1} {...props}>
            {children}
          </HeadingWithAnchor>
        ),
        h2: ({ node: _node, children, ...props }) => (
          <HeadingWithAnchor level={2} {...props}>
            {children}
          </HeadingWithAnchor>
        ),
        h3: ({ node: _node, children, ...props }) => (
          <HeadingWithAnchor level={3} {...props}>
            {children}
          </HeadingWithAnchor>
        ),
        h4: ({ node: _node, children, ...props }) => (
          <HeadingWithAnchor level={4} {...props}>
            {children}
          </HeadingWithAnchor>
        ),
        h5: ({ node: _node, children, ...props }) => (
          <HeadingWithAnchor level={5} {...props}>
            {children}
          </HeadingWithAnchor>
        ),
        h6: ({ node: _node, children, ...props }) => (
          <HeadingWithAnchor level={6} {...props}>
            {children}
          </HeadingWithAnchor>
        ),
        a: ({ node: _node, ...props }) => (
          <a
            style={{
              color: theme.palette.primary.main,
              textDecoration: "none",
            }}
            {...props}
          />
        ),
        figure: ({ node: _node, ...props }) => (
          <figure style={{ textAlign: align, margin: "1.5rem 0" }} {...props} />
        ),
        figcaption: ({ node: _node, ...props }) => (
          <figcaption
            style={{
              fontStyle: "italic",
              fontSize: "0.9rem",
              marginTop: "0.5rem",
            }}
            {...props}
          />
        ),
        img: ({ node: _node, ...props }) => {
          return (
            <div style={{ textAlign: align, margin: "0" }}>
              <img style={styleProps} {...props} alt={props.alt} />
            </div>
          );
        },
        code: ({ node: _node, className, children, ...props }) => {
          const langMatch = /language-(\w+)/.exec(className ?? "");
          const code = String(children).replace(/\n$/, "");
          const isBlock = !!langMatch || code.includes("\n");

          if (isBlock) {
            return (
              <SyntaxHighlighter
                language={langMatch?.[1] ?? "text"}
                style={syntaxTheme}
                customStyle={{
                  margin: "1rem 0",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                }}
                wrapLongLines
                {...props}
              >
                {code}
              </SyntaxHighlighter>
            );
          }

          return (
            <code
              className={className}
              style={{
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
                borderRadius: "4px",
                padding: "0.15rem 0.35rem",
                fontSize: "0.9em",
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
