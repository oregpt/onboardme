import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { checkDomainMapping } from "@/lib/whiteLabelUtils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check for white-label mode and route to public endpoints
  let requestUrl = url;
  try {
    const whiteLabelConfig = await checkDomainMapping();
    if (whiteLabelConfig.isWhiteLabel && url.startsWith('/api/')) {
      // Convert authenticated endpoints to public endpoints for white-label mode
      if (url.startsWith('/api/guides') || 
          url.startsWith('/api/projects') || 
          url.startsWith('/api/ai/chat') ||
          url.startsWith('/api/user-progress')) {
        requestUrl = url.replace('/api/', '/public/');
        console.log(`🔄 White-label mode: Routing ${url} → ${requestUrl}`);
      } else {
        console.warn(`⚠️ White-label mode: Endpoint ${url} not available in public API`);
      }
    }
  } catch (error) {
    console.warn('Error checking white-label mode for API routing:', error);
    // Continue with original URL on error
  }
  
  console.log(`API Request: ${method} ${requestUrl}`, data ? data : 'no body');
  
  const res = await fetch(requestUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Ensure we're getting JSON responses for API calls
  const contentType = res.headers.get('content-type');
  if (res.ok && !contentType?.includes('application/json')) {
    console.error(`API call returned HTML instead of JSON: ${method} ${requestUrl}`);
    throw new Error(`Server returned HTML instead of JSON - route may not exist`);
  }

  await throwIfResNotOk(res);
  console.log(`API Response: ${method} ${requestUrl} - ${res.status}`);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey.join("/") as string;
    
    // Check for white-label mode and route to public endpoints
    try {
      const whiteLabelConfig = await checkDomainMapping();
      if (whiteLabelConfig.isWhiteLabel && url.startsWith('/api/')) {
        // Convert authenticated endpoints to public endpoints for white-label mode
        if (url.startsWith('/api/guides') || 
            url.startsWith('/api/projects') || 
            url.startsWith('/api/ai/chat') ||
            url.startsWith('/api/user-progress')) {
          url = url.replace('/api/', '/public/');
          console.log(`🔄 White-label query: Routing ${queryKey.join("/")} → ${url}`);
        } else {
          console.warn(`⚠️ White-label query: Endpoint ${url} not available in public API`);
        }
      }
    } catch (error) {
      console.warn('Error checking white-label mode for query routing:', error);
      // Continue with original URL on error
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
