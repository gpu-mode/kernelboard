export type User = {
  authenticated: boolean;
  user: {
    id: string | null;
    provider: string | null;
    identity: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};
