'use client'

import type { Components } from 'react-markdown'
import type { AnchorHTMLAttributes, HTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

import { cn } from '@/lib/utils'

type ParagraphProps = HTMLAttributes<HTMLParagraphElement>
type ListProps = HTMLAttributes<HTMLUListElement>
type OrderedListProps = HTMLAttributes<HTMLOListElement>
type ListItemProps = HTMLAttributes<HTMLLIElement>
type StrongProps = HTMLAttributes<HTMLElement>
type EmProps = HTMLAttributes<HTMLElement>
type CodeProps = HTMLAttributes<HTMLElement>
type PreProps = HTMLAttributes<HTMLPreElement>
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>

const baseComponents: Components = {
  p: ({ children, className, ...props }: ParagraphProps) => (
    <p className={cn('mb-2 last:mb-0 leading-relaxed', className)} {...props}>
      {children}
    </p>
  ),
  ul: ({ children, className, ...props }: ListProps) => (
    <ul className={cn('list-disc pl-5 space-y-1', className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }: OrderedListProps) => (
    <ol className={cn('list-decimal pl-5 space-y-1', className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }: ListItemProps) => (
    <li className={cn('leading-snug', className)} {...props}>
      {children}
    </li>
  ),
  strong: ({ children, className, ...props }: StrongProps) => (
    <strong className={cn('font-semibold', className)} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, className, ...props }: EmProps) => (
    <em className={cn('italic', className)} {...props}>
      {children}
    </em>
  ),
  code: ({ children, className, ...props }: CodeProps) => (
    <code className={cn('rounded bg-muted px-1 py-0.5 text-xs font-mono', className)} {...props}>
      {children}
    </code>
  ),
  pre: ({ children, className, ...props }: PreProps) => (
    <pre className={cn('overflow-x-auto rounded-md bg-muted px-2 py-1 text-xs', className)} {...props}>
      {children}
    </pre>
  ),
  a: ({ children, className, ...props }: AnchorProps) => (
    <a className={cn('text-primary underline', className)} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  ),
}

const compactComponents: Components = {
  ...baseComponents,
  p: ({ children, className, ...props }: ParagraphProps) => (
    <p className={cn('mb-1 last:mb-0 leading-snug text-xs', className)} {...props}>
      {children}
    </p>
  ),
  ul: ({ children, className, ...props }: ListProps) => (
    <ul className={cn('list-disc pl-4 space-y-1 text-xs', className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }: OrderedListProps) => (
    <ol className={cn('list-decimal pl-4 space-y-1 text-xs', className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }: ListItemProps) => (
    <li className={cn('leading-snug text-xs', className)} {...props}>
      {children}
    </li>
  ),
}

const variantClasses: Record<'default' | 'compact', string> = {
  default: 'prose prose-sm dark:prose-invert max-w-none text-foreground',
  compact: 'prose prose-xs dark:prose-invert max-w-none text-foreground',
}

interface MarkdownContentProps {
  content: string
  variant?: 'default' | 'compact'
  className?: string
  components?: Components
}

export function MarkdownContent({
  content,
  variant = 'default',
  className,
  components,
}: MarkdownContentProps) {
  const resolvedComponents = components
    ? { ...(variant === 'compact' ? compactComponents : baseComponents), ...components }
    : variant === 'compact'
    ? compactComponents
    : baseComponents

  const resolvedClassName = cn(variantClasses[variant], className)

  return (
    <div className={resolvedClassName}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={resolvedComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
