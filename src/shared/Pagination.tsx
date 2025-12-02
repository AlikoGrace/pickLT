import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import type React from 'react'
import { Button } from './Button'

export function Pagination({
  'aria-label': ariaLabel = 'Page navigation',
  className,
  ...props
}: React.ComponentPropsWithoutRef<'nav'>) {
  return <nav aria-label={ariaLabel} {...props} className={clsx(className, 'flex gap-x-2')} />
}

export function PaginationPrevious({
  href = null,
  className,
  children = 'Previous',
}: React.PropsWithChildren<{ href?: string | null; className?: string }>) {
  return (
    <span className={clsx(className, 'grow basis-0')}>
      <Button
        {...(href === null ? { disabled: true } : { href })}
        className="rounded-lg"
        plain
        aria-label="Previous page"
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} size={16} color="currentColor" strokeWidth={1.5} />

        {children}
      </Button>
    </span>
  )
}

export function PaginationNext({
  href = null,
  className,
  children = 'Next',
}: React.PropsWithChildren<{ href?: string | null; className?: string }>) {
  return (
    <span className={clsx(className, 'flex grow basis-0 justify-end')}>
      <Button {...(href === null ? { disabled: true } : { href })} className="rounded-lg" plain aria-label="Next page">
        {children}
        <HugeiconsIcon icon={ArrowRight02Icon} size={16} color="currentColor" strokeWidth={1.5} />
      </Button>
    </span>
  )
}

export function PaginationList({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={clsx(className, 'hidden items-baseline gap-x-2 sm:flex')} />
}

export function PaginationPage({
  href,
  className,
  current = false,
  children,
}: React.PropsWithChildren<{ href: string; className?: string; current?: boolean }>) {
  return (
    <Button
      href={href}
      plain
      aria-label={`Page ${children}`}
      aria-current={current ? 'page' : undefined}
      className={clsx(
        className,
        'min-w-[2.25rem] rounded-lg before:absolute before:-inset-px before:rounded-lg',
        current && 'before:bg-neutral-950/5 dark:before:bg-white/10'
      )}
    >
      <span className="-mx-0.5">{children}</span>
    </Button>
  )
}

export function PaginationGap({
  className,
  children = <>&hellip;</>,
  ...props
}: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      aria-hidden="true"
      {...props}
      className={clsx(
        className,
        'w-[2.25rem] text-center text-sm/6 font-semibold text-neutral-950 select-none dark:text-white'
      )}
    >
      {children}
    </span>
  )
}

export default function PaginationComponent() {
  return (
    <Pagination>
      <PaginationPrevious href="?page=2" />
      <PaginationList>
        <PaginationPage href="?page=1">1</PaginationPage>
        <PaginationPage href="?page=2">2</PaginationPage>
        <PaginationPage href="?page=3" current>
          3
        </PaginationPage>
        <PaginationGap />
        <PaginationPage href="?page=65">65</PaginationPage>
        <PaginationPage href="?page=66">66</PaginationPage>
      </PaginationList>
      <PaginationNext href="?page=4" />
    </Pagination>
  )
}
