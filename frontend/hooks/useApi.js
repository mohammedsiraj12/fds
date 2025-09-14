"use client";
import { useState, useCallback } from 'react';
import { apiCall } from '../lib/auth';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(endpoint, options);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((endpoint) => {
    return makeRequest(endpoint, { method: 'GET' });
  }, [makeRequest]);

  const post = useCallback((endpoint, data) => {
    return makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [makeRequest]);

  const put = useCallback((endpoint, data) => {
    return makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, [makeRequest]);

  const del = useCallback((endpoint) => {
    return makeRequest(endpoint, { method: 'DELETE' });
  }, [makeRequest]);

  return {
    loading,
    error,
    makeRequest,
    get,
    post,
    put,
    delete: del,
  };
};

export const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (operation) => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, execute };
};
