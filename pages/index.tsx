import type { PageProps } from '@/lib/types'
import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { resolveNotionPage } from '@/lib/resolve-notion-page'

export const getStaticProps = async () => {
  try {
    const props = await resolveNotionPage(domain)

    // NOTE: revalidation is intentionally infrequent (1 hour). Every
    // revalidation hits Notion's unofficial API, and hammering it from
    // datacenter IPs gets those IPs blocked (403s), which takes the whole
    // site down. Content here changes rarely, so hourly is plenty.
    return { props, revalidate: 3600 }
  } catch (err) {
    console.error('page error', domain, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export default function NotionDomainPage(props: PageProps) {
  return <NotionPage {...props} />
}
