import { useEffect, useState } from "react";
import axios from "axios";

export default function useUnifiedSummary(user, token) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.email || !token) {
      setLoading(false);
      setError("User or token missing");
      return;
    }

    const fetchSummary = async () => {
      try {
        const res = await axios.get(`/api/unified-summary/${user.email}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setSummary(res.data);
      } catch (err) {
        console.error("Unified summary error:", err?.response || err);
        setError(err?.response?.data || "Request failed");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user, token]);

  return { summary, loading, error };
}
