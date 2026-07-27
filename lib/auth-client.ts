import { createAuthClient } from 'better-auth/react';

/** Client Better Auth côté navigateur (même origine → pas de baseURL). */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
