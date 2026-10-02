import type { PageProps } from '@/lib/types'
import { NotionPage } from '@/components/NotionPage'
import { domain, site } from '@/lib/config'
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

    // NOTE: during `next build`, Notion's unofficial API may be unreachable
    // from the build machine (it intermittently blocks datacenter IPs). A
    // transient Notion outage must not fail the production build, so emit a
    // placeholder page here and let ISR regenerate the real homepage on the
    // first request. At request time, still throw so Next.js serves a 500
    // and retries instead of publishing the error page.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      const props: PageProps = {
        site,
        pageId: site.rootNotionPageId,
        error: {
          message: 'Site is starting up; content will appear shortly.',
          statusCode: 503
        }
      }

      return { props, revalidate: 60 }
    }

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export default function NotionDomainPage(props: PageProps) {
  return <NotionPage {...props} />
}
