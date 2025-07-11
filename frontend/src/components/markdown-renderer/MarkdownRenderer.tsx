import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

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
  return (
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
  );
};

export default MarkdownRenderer;
