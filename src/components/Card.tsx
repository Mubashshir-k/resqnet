import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div {...props} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}
