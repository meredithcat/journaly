import React from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from '@/config/i18n'
import theme from '@/theme'

const Breadcrumbs: React.FC = () => {
  const { pathname } = useRouter()
  const { t } = useTranslation('settings')
  const lastPathName = pathname.split('/').pop()

  const pathToBreadcrumb: { [key: string]: string } = {
    profile: t('breadcrumbs.profile'),
    account: t('breadcrumbs.account'),
    subscription: t('breadcrumbs.subscription'),
  }

  return (
    <h1 className="breadcrumbs" data-testid="settiings-breadcrumbs">
      <span>
        {t('breadcrumbs.settings')}
        <span className="separator">&gt;</span>
        {pathToBreadcrumb[lastPathName!]}
      </span>

      <style jsx>{`
        .breadcrumbs {
          ${theme.typography.headingXL};
        }
        .separator {
          margin: 0 16px;
        }
      `}</style>
    </h1>
  )
}

export default Breadcrumbs
