import { Alert, AlertTitle } from '@mui/material';

export function ErrorAlert({
  status,
  message,
}: {
  status: number | null;
  message: string;
}) {
  return (
    <Alert severity="error" sx={{ my: 2 }}>
      <AlertTitle>Error{status ? ` (${status})` : ''}</AlertTitle>
      {message}
    </Alert>
  );
}
