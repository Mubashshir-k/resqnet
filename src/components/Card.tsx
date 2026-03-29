import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'flat'
}

export default function Card({ children, className = '', variant = 'default', ...props }: CardProps) {
  const variantClasses = {
    default: 'bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300',
    elevated: 'bg-white rounded-2xl shadow-xl border border-gray-100/50 backdrop-blur-sm',
    flat: 'bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-gray-200 dark:border-slate-800',
  }

  return (
    <div {...props} className={`p-6 sm:p-8 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}
