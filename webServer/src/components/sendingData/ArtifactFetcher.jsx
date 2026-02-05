import { useEffect, useState } from "react";
import InfoCard from "../InfoCard";

const ArtifactFetcher = ({ collectionId }) => {
  const [artifact, setArtifact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionId) return;

    setLoading(true);
    setArtifact(null);
    setError(null);

    fetch(`http://localhost:8000/api/artifacts/${collectionId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch artifact");
        return res.json();
      })
      .then(data => {
        setArtifact(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [collectionId]);

  if (loading) return null;
  if (error) return null;
  if (!artifact) return null;

  return <InfoCard {...artifact} />;
};

export default ArtifactFetcher;
