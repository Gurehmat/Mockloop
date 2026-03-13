import { supabase } from './supabase';

type EdgeError = {
  error: string;
};

export async function invokeEdgeFunction<TRequest extends Record<string, unknown>, TResponse>(
  name: string,
  payload: TRequest,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse | EdgeError>(name, {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Function request failed');
  }

  if (!data) {
    throw new Error('Empty response from server');
  }

  if (typeof data === 'object' && data !== null && 'error' in data) {
    throw new Error(data.error);
  }

  return data as TResponse;
}
