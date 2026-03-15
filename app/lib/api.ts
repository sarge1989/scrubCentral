//TODO: DELETE IF NOT USING CLERK AUTHENTICATION
import { useAuth } from "@clerk/react-router";

/**
 * Hook to make authenticated API calls to Hono endpoints
 */
export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    
    if (!token) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  return { authFetch };
}

/**
 * Example usage in a component:
 * 
 * const { authFetch } = useAuthenticatedFetch();
 * 
 * const handleClick = async () => {
 *   const data = await authFetch('/api/me');
 *   console.log(data);
 * };
 */