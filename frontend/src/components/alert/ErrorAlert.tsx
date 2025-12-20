import BasicAlert from "./BasicAlert";

export function ErrorAlert({
  status,
  message,
}: {
  status: number | null;
  message: string;
}) {
  return (
    <BasicAlert
      severity="error"
      title={`Error${status ? ` (${status})` : ""}`}
      message={message}
    />
  );
}
