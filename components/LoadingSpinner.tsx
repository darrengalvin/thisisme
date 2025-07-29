export default function LoadingSpinner({ size = 'md', text = 'Loading...' }: { 
  size?: 'sm' | 'md' | 'lg'
  text?: string 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-3 border-primary-200 border-t-primary-600`} />
      <p className="text-gray-600 font-medium">{text}</p>
    </div>
  )
} 