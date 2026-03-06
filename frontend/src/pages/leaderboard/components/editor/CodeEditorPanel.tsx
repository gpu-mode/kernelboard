import { Box } from "@mui/material";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeEditorPanelProps {
  code: string;
  onChange: (value: string) => void;
  resolvedMode: "light" | "dark";
  height?: string;
  style?: React.CSSProperties;
}

export function CodeEditorPanel({
  code,
  onChange,
  resolvedMode,
  height = "100%",
  style,
}: CodeEditorPanelProps) {
  return (
    <Box sx={{ height: "100%", overflow: "hidden" }}>
      <CodeMirror
        value={code}
        height={height}
        style={style ?? { height: "100%" }}
        theme={resolvedMode === "dark" ? oneDark : undefined}
        extensions={[python()]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
        }}
      />
    </Box>
  );
}
