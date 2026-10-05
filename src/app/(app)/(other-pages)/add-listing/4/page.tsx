'use client'

import InventorySelector from '@/components/inventory/InventorySelector'
import { basketItemCount } from '@/components/inventory/basket'
import { useMoveSearch } from '@/context/moveSearch'
import { Divider } from '@/shared/divider'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Page = () => {
  const router = useRouter()
  const { t } = useTranslation()
  const { inventory, customItems } = useMoveSearch()
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/5')
  }, [router])

  const handleSubmitForm = async () => {
    if (basketItemCount(inventory, customItems) === 0) {
      setInventoryError(t('booking:inventory.required.error'))
      return
    }
    setInventoryError(null)
    router.push('/add-listing/5')
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{t('booking:inventory.title')}</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        {t('web:wizard.step4.subtitle')}
      </p>
      <Divider className="w-14!" />

      {/* FORM — the layout's Next button submits it; the selector writes the basket to moveSearch. */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {inventoryError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {inventoryError}
          </div>
        )}
        <InventorySelector />
      </Form>
    </>
  )
}

export default Page
