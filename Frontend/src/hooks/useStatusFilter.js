import { useState, useEffect } from "react";

export const useStatusFilter = (prefix = "order") => {
  const storageKey = `${prefix}StatusFilter`;

  // Initialize from localStorage with error handling
  const getInitialStatuses = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn(`Error parsing ${prefix} status filters:`, error);
      localStorage.removeItem(storageKey);
      return [];
    }
  };

  const [statusOptions, setStatusOptions] = useState([]);

  // Fetch status options
  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${ServerIP}/auth/order-statuses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.Status) {
          const sortedStatuses = response.data.Result.sort(
            (a, b) => a.step - b.step
          );
          setStatusOptions(sortedStatuses);
        }
      } catch (err) {
        console.error("Error fetching status options:", err);
      }
    };

    fetchStatusOptions();
  }, []);

  return {
    statusOptions,
    storageKey,
  };
};
