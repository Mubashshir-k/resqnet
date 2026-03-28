export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-full bg-gray-200 rounded mb-2" />
      <div className="h-3 w-5/6 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-2/3 bg-gray-200 rounded mb-4" />
      <div className="h-8 w-24 bg-gray-200 rounded" />
    </div>
  )
}
