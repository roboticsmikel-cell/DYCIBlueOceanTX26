export default function ImageCard({ image }) {
  if (!image) return null;

  // const imageUrl = http://127.0.0.1:8000/api/images/14; 
  // const imageUrl = http://127.0.0.1:8000/api/images/${image.id};

  const imageUrl = image?.id
    // ? `http://127.0.0.1:8000/api/images/${image.id}`
    // : `http://127.0.0.1:8000/api/images/14`;
    ? `http://dyciblueoceantx26.onrender.com/api/images/${image.id}` // RENDER
    : `http://dyciblueoceantx26.onrender.com/api/images/14`; // RENDER
    
  return (
    <div className="flex h-full flex-col rounded-xl border border-cyan-300 bg-black/70 p-3 shadow-lg">
      
      <h3 className="mb-2 text-sm font-semibold text-cyan-300">
        Artifact Image
      </h3>

      <div className="aspect-video w-full overflow-hidden rounded-lg border border-cyan-300">
        <img
          src={imageUrl}
          alt="Artifact"
          className="h-full w-full object-cover"
        />
      </div>

    </div>
  );
}