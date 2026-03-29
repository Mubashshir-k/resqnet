import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'flat'
}

export default function Card({ children, className = '', variant = 'default', ...props }: CardProps) {
  const variantClasses = {
    default: 'bg-white dark:bg-slate-800/80 rounded-2xl shadow-lg dark:shadow-2xl border border-gray-100 dark:border-slate-700/60 hover:shadow-xl dark:hover:shadow-xl hover:border-gray-200 dark:hover:border-slate-600 transition-all duration-300',
    elevated: 'bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-slate-700 backdrop-blur-sm dark:backdrop-blur-md',
    flat: 'bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-gray-200 dark:border-slate-700/50',
  }

  return (
    <div {...props} className={`p-6 sm:p-8 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}
