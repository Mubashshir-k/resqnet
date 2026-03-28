import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]'

  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 disabled:border-primary-300',
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-4 sm:px-6 py-3 text-base sm:text-lg',
  }

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {isLoading && <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}
