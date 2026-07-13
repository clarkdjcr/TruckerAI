import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AuthGate() {
  const { isAuthenticated, refreshMe, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      if (user?.role === 'DRIVER') {
        router.replace('/(driver)/home');
      } else {
        router.replace('/(dispatcher)/home');
      }
    }
  }, [isAuthenticated, segments, user]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}